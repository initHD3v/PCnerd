import { prisma } from './prisma';
import {
  RecommendationRequest,
  BudgetSplit,
  getExpertDistribution,
  generateNarrativeWithLLM,
  predictPerformance,
  generateLowBudgetAdvice,
  getUpgradeImpact,
} from './recommendation-engine';
import {
  findCpuBenchmark,
  findGpuBenchmark,
  findRamImpact,
  analyzeBottleneck,
  findBalancedUpgrade,
  scoreComponent,
} from '@/data/benchmarks';
import { ComponentType, HardwareComponent } from '@prisma/client';

export interface UpgradeOption {
  componentType: ComponentType;
  currentPart: HardwareComponent;
  suggestedPart: HardwareComponent;
  priceDiff: number;
  newTotalPrice: number;
  benefit: string;
  fpsUplift?: { currentFps: number; newFps: number; upliftPercent: number };
}

export interface ComponentScoreData {
  totalScore: number;
  compatibilityScore: number;
  performanceScore: number;
  valueScore: number;
  reliabilityScore: number;
}

export interface BuildResult {
  build: Record<string, HardwareComponent | null>;
  originalBuild: Record<string, HardwareComponent | null>;
  componentScores?: Record<string, ComponentScoreData>;
  totalPrice: number;
  isOverBudget: boolean;
  targetBudget: number;
  resolution: string;
  lowBudgetAdvice: any;
  distribution: BudgetSplit;
  tier: string;
  analysis: string;
  technical: {
    totalTdp: number;
    psuWattage: number;
    isPsuSafe: boolean;
    bottleneckStatus: string;
  };
  performance: any[];
  narrative: any;
  upgrades: UpgradeOption[];
}

const PERIPHERAL_TYPES = [
  { type: ComponentType.MONITOR, share: 0.6 },
  { type: ComponentType.KEYBOARD, share: 0.2 },
  { type: ComponentType.MOUSE, share: 0.2 },
];

type ScoringMode = 'performance' | 'balanced' | 'value';

async function findBestScored(
  type: ComponentType,
  targetPrice: number,
  extraWhere = {},
  context: { cpuSocket?: string; ramType?: string; mode?: ScoringMode; purpose?: string } = {},
) {
  const mode = context.mode || 'balanced';
  const minPrice =
    type === ComponentType.CASE ||
    type === ComponentType.COOLER ||
    type === ComponentType.MONITOR ||
    type === ComponentType.KEYBOARD ||
    type === ComponentType.MOUSE
      ? 0
      : mode === 'performance'
        ? targetPrice * 0.6
        : targetPrice * 0.3;
  const maxPrice = mode === 'performance' ? targetPrice * 1.15 : targetPrice * 1.3;

  let candidates = await prisma.hardwareComponent.findMany({
    where: { type, price: { gte: minPrice, lte: maxPrice }, ...extraWhere },
    orderBy: { price: 'asc' },
    take: 100,
  });

  if (candidates.length === 0) {
    candidates = await prisma.hardwareComponent.findMany({
      where: { type, ...extraWhere },
      orderBy: { price: 'asc' },
      take: 5,
    });
  }

  const scored = candidates.map((c) => {
    let compatibility = 1.0;
    if (type === 'CPU' && context.cpuSocket) {
      compatibility = c.socket === context.cpuSocket ? 1.0 : 0.7;
    }
    if (type === 'MOTHERBOARD' && context.cpuSocket) {
      compatibility = c.socket === context.cpuSocket ? 1.0 : 0.3;
    }
    if (type === 'RAM' && context.ramType) {
      compatibility = c.ramType === context.ramType ? 1.0 : 0.2;
    }

    const cpuBench = type === 'CPU' ? findCpuBenchmark(c.name) : null;
    const gpuBench = type === 'GPU' ? findGpuBenchmark(c.name) : null;
    const ramImpact = type === 'RAM' ? findRamImpact(c.name) : null;

    let performanceScore = 0.4;
    let benchmarkPerPrice: number | undefined;

    if (cpuBench) {
      performanceScore = cpuBench.passmarkSingle / 5000;
      benchmarkPerPrice = cpuBench.passmarkSingle / Math.max(c.price, 1);
      // Penalize F-suffix CPUs for Office builds (no iGPU)
      if (context.purpose === 'Office' && /(KF|F)$/.test(c.name)) {
        performanceScore *= 0.3;
        compatibility *= 0.2;
      }
    } else if (gpuBench) {
      const avgFps = (gpuBench.fps1080p + gpuBench.fps1440p + gpuBench.fps4k) / 3;
      performanceScore = avgFps / 200;
      benchmarkPerPrice = avgFps / Math.max(c.price, 1);
    } else if (ramImpact) {
      performanceScore = ramImpact.gamingFpsMultiplier;
      benchmarkPerPrice = (ramImpact.gamingFpsMultiplier / Math.max(c.price, 1)) * 100000;
    } else if (type === 'MOTHERBOARD') {
      const hasSocket = c.socket ? 0.8 : 0.3;
      const hasRamType = c.ramType ? 0.8 : 0.3;
      performanceScore = (hasSocket + hasRamType) / 2;
    } else if (type === 'STORAGE') {
      performanceScore = /SSD|NVMe/i.test(c.name) ? 0.9 : 0.4;
    } else if (type === 'PSU') {
      performanceScore = Math.min(1, (c.wattage || 0) / 1000);
    } else if (type === 'COOLER') {
      performanceScore = c.price > 200000 ? 0.9 : 0.3;
    }

    const base = scoreComponent(c, targetPrice, compatibility, performanceScore, benchmarkPerPrice);
    return { component: c, ...base };
  });

  if (mode === 'performance') {
    scored.sort((a, b) => {
      if (Math.abs(b.performanceScore - a.performanceScore) > 0.05) return b.performanceScore - a.performanceScore;
      return b.component.price - a.component.price;
    });
  } else if (mode === 'value') {
    scored.sort((a, b) => b.valueScore - a.valueScore || b.totalScore - a.totalScore);
  } else {
    scored.sort((a, b) => b.totalScore - a.totalScore);
  }

  const best = scored[0];
  if (!best) return { component: candidates[0] || null, score: null };
  return {
    component: best.component,
    score: {
      totalScore: best.totalScore,
      compatibilityScore: best.compatibilityScore,
      performanceScore: best.performanceScore,
      valueScore: best.valueScore,
      reliabilityScore: best.reliabilityScore,
    },
  };
}

async function ensureBalance(
  build: Record<string, HardwareComponent | null>,
  resolution: string = '1080p',
  brandFilter: Record<string, string> = {},
): Promise<void> {
  if (!build.CPU || !build.GPU) return;

  const cpuBench = findCpuBenchmark(build.CPU.name);
  const gpuBench = findGpuBenchmark(build.GPU.name);
  if (!cpuBench || !gpuBench) return;

  const totalCpuGpu = build.CPU.price + build.GPU.price;
  const flexBudget = totalCpuGpu * 1.15;

  const upgrade = findBalancedUpgrade(cpuBench, gpuBench, resolution);
  if (!upgrade) return;

  if (upgrade.type === 'CPU') {
    const betterCpu = await prisma.hardwareComponent.findFirst({
      where: { type: ComponentType.CPU, name: { contains: upgrade.model }, price: { lte: flexBudget }, ...brandFilter },
      orderBy: { price: 'asc' },
    });
    if (!betterCpu || betterCpu.id === build.CPU.id) return;

    const cpuPriceDiff = betterCpu.price - build.CPU.price;
    const gpuRoom = build.GPU.price - cpuPriceDiff;

    if (gpuRoom > 0 || cpuPriceDiff <= 0) {
      build.CPU = betterCpu;
      return;
    }

    const cheaperGpu = await prisma.hardwareComponent.findFirst({
      where: { type: ComponentType.GPU, price: { lte: gpuRoom + 500000 } },
      orderBy: { price: 'desc' },
    });
    if (cheaperGpu && cheaperGpu.price < build.GPU.price) {
      build.CPU = betterCpu;
      build.GPU = cheaperGpu;
    }
  } else {
    const betterGpu = await prisma.hardwareComponent.findFirst({
      where: { type: ComponentType.GPU, name: { contains: upgrade.model }, price: { lte: flexBudget } },
      orderBy: { price: 'asc' },
    });
    if (!betterGpu || betterGpu.id === build.GPU.id) return;

    const gpuPriceDiff = betterGpu.price - build.GPU.price;
    const cpuRoom = build.CPU.price - gpuPriceDiff;

    if (cpuRoom > 0 || gpuPriceDiff <= 0) {
      build.GPU = betterGpu;
      return;
    }

    const cheaperCpu = await prisma.hardwareComponent.findFirst({
      where: { type: ComponentType.CPU, price: { lte: cpuRoom + 500000 } },
      orderBy: { price: 'desc' },
    });
    if (cheaperCpu && cheaperCpu.price < build.CPU.price) {
      build.GPU = betterGpu;
      build.CPU = cheaperCpu;
    }
  }
}

async function fillRemainingBudget(
  build: Record<string, HardwareComponent | null>,
  request: RecommendationRequest,
  brandFilter: Record<string, string> = {},
): Promise<Record<string, HardwareComponent | null>> {
  const currentTotal = Object.values(build).reduce((s, p) => s + (p?.price || 0), 0);
  let remaining = request.budget - currentTotal;

  if (remaining <= 500000) return build;

  const upgradeChain = [
    ComponentType.GPU,
    ComponentType.CPU,
    ComponentType.RAM,
    ComponentType.STORAGE,
    ComponentType.MOTHERBOARD,
    ComponentType.PSU,
    ComponentType.CASE,
    ComponentType.COOLER,
  ];

  for (const type of upgradeChain) {
    if (remaining <= 500000) break;
    const current = build[type];
    if (!current) continue;

    let extraFilter: Record<string, any> = {};
    if (type === ComponentType.CPU) {
      extraFilter = { ...brandFilter };
      if (build.MOTHERBOARD) {
        extraFilter.socket = build.MOTHERBOARD.socket;
      }
    } else if (type === ComponentType.MOTHERBOARD && build.CPU) {
      extraFilter = { socket: build.CPU.socket };
    }
    const better = await prisma.hardwareComponent.findFirst({
      where: {
        type,
        price: { gt: current.price, lte: current.price + remaining },
        NOT: { id: current.id },
        ...extraFilter,
      },
      orderBy: { price: 'desc' },
    });

    if (better && better.price > current.price + 100000) {
      const prevPrice = current.price;
      build[type] = better;
      remaining -= better.price - prevPrice;
    }
  }

  return build;
}

async function generateSingleBuild(
  request: RecommendationRequest,
  mode: ScoringMode = 'balanced',
  skipNarrative?: boolean,
): Promise<BuildResult> {
  const distribution = getExpertDistribution(request.budget, request.purpose, request.includePeripheral, request.text);
  const build: Record<string, HardwareComponent | null> = {};

  const ctx = { mode, purpose: request.purpose };

  const brandFilter: Record<string, string> =
    request.platform === 'intel' ? { brand: 'Intel' } : request.platform === 'amd' ? { brand: 'AMD' } : {};

  const componentScores: Record<string, ComponentScoreData> = {};

  const cpuExtraWhere = brandFilter;
  const cpuResult = await findBestScored(ComponentType.CPU, request.budget * distribution.CPU, cpuExtraWhere, ctx);
  build.CPU = cpuResult.component;
  if (cpuResult.score) componentScores.CPU = cpuResult.score;
  if (!build.CPU) throw new Error('Tidak ada CPU yang tersedia di database.');

  const mbResult = await findBestScored(
    ComponentType.MOTHERBOARD,
    request.budget * distribution.MOTHERBOARD,
    { socket: build.CPU.socket },
    { ...ctx, cpuSocket: build.CPU.socket || '' },
  );
  build.MOTHERBOARD = mbResult.component;
  if (mbResult.score) componentScores.MOTHERBOARD = mbResult.score;

  if (distribution.GPU > 0) {
    const gpuResult = await findBestScored(ComponentType.GPU, request.budget * distribution.GPU, {}, ctx);
    build.GPU = gpuResult.component;
    if (gpuResult.score) componentScores.GPU = gpuResult.score;
  }

  await ensureBalance(build, request.resolution || '1080p', brandFilter);

  const ramResult = await findBestScored(
    ComponentType.RAM,
    request.budget * distribution.RAM,
    build.MOTHERBOARD ? { ramType: build.MOTHERBOARD.ramType } : {},
    { ...ctx, ramType: build.MOTHERBOARD?.ramType || '' },
  );
  build.RAM = ramResult.component;
  if (ramResult.score) componentScores.RAM = ramResult.score;

  const psuResult = await findBestScored(ComponentType.PSU, request.budget * distribution.PSU, {}, ctx);
  build.PSU = psuResult.component;
  if (psuResult.score) componentScores.PSU = psuResult.score;

  const storageResult = await findBestScored(ComponentType.STORAGE, request.budget * distribution.STORAGE, {}, ctx);
  build.STORAGE = storageResult.component;
  if (storageResult.score) componentScores.STORAGE = storageResult.score;

  const caseResult = await findBestScored(ComponentType.CASE, request.budget * distribution.CASE, {}, ctx);
  build.CASE = caseResult.component;
  if (caseResult.score) componentScores.CASE = caseResult.score;

  const cpuTdp = build.CPU?.tdp || 0;
  const needsCooler = cpuTdp > 65 || /i7|i9|Ryzen 7|Ryzen 9|X3D|K$|KF$|KS/i.test(build.CPU?.name || '');
  const coolerTarget = request.budget * (distribution.COOLER || 0.04);

  if (coolerTarget > 0) {
    const coolerMode: ScoringMode = needsCooler ? 'performance' : 'value';
    const coolerResult = await findBestScored(ComponentType.COOLER, coolerTarget, {}, { ...ctx, mode: coolerMode });
    build.COOLER = coolerResult.component;
    if (coolerResult.score) componentScores.COOLER = coolerResult.score;
  }
  if (!build.COOLER && coolerTarget > 0) {
    const coolerResult = await findBestScored(ComponentType.COOLER, coolerTarget, {}, ctx);
    build.COOLER = coolerResult.component;
    if (coolerResult.score) componentScores.COOLER = coolerResult.score;
  }

  if (request.includePeripheral && distribution.PERIPHERALS) {
    const perBudget = request.budget * distribution.PERIPHERALS;
    for (const pt of PERIPHERAL_TYPES) {
      const found = await findBestScored(pt.type, perBudget * pt.share, {}, ctx);
      if (found.component) {
        build[pt.type] = found.component;
        if (found.score) componentScores[pt.type as string] = found.score;
      }
    }
  }

  // Insight 1: Office — last resort GPU for display output
  if (request.purpose === 'Office' && build.CPU && !build.GPU) {
    const stillHasIGpu = !/(KF|F)$/.test(build.CPU.name || '');
    if (!stillHasIGpu) {
      const cheapGpu = await prisma.hardwareComponent.findFirst({
        where: { type: 'GPU', price: { lte: 900000 } },
        orderBy: { price: 'asc' },
      });
      if (cheapGpu) build.GPU = cheapGpu;
    }
  }

  // Insight 2: Coding — ensure minimum 32GB RAM
  if (request.purpose === 'Coding' && build.RAM) {
    const ramGb = parseInt((build.RAM.name || '').match(/(\d+)GB/)?.[1] || '0');
    if (ramGb < 32) {
      const biggerRam = await prisma.hardwareComponent.findFirst({
        where: {
          type: 'RAM',
          price: { gte: build.RAM.price * 1.2, lte: build.RAM.price * 3 },
          name: { contains: '32GB' },
        },
        orderBy: { price: 'asc' },
      });
      if (biggerRam) build.RAM = biggerRam;
    }
  }

  // Insight 5: Streaming — prefer NVIDIA GPU (NVENC)
  if (request.purpose === 'Streaming' && build.GPU) {
    const isNvidia = /RTX|GTX|GT |TITAN|Quadro/.test(build.GPU.name || '');
    if (!isNvidia) {
      const nvidiaGpu = await prisma.hardwareComponent.findFirst({
        where: {
          type: 'GPU',
          price: { gte: build.GPU.price * 0.8, lte: build.GPU.price * 1.2 },
          name: { contains: 'RTX' },
        },
        orderBy: { price: 'asc' },
      });
      if (nvidiaGpu) build.GPU = nvidiaGpu;
    }
  }

  let totalPrice = Object.values(build).reduce((sum, item) => sum + (item?.price || 0), 0);

  if (totalPrice > request.budget) {
    const typesToSwap = [
      ComponentType.GPU,
      ComponentType.CPU,
      ComponentType.MOTHERBOARD,
      ComponentType.RAM,
      ComponentType.STORAGE,
    ];
    for (const type of typesToSwap) {
      if (build[type]) {
        let compatFilter: Record<string, any> = {};
        if (type === ComponentType.CPU) {
          compatFilter = { ...brandFilter };
          if (build.MOTHERBOARD) {
            compatFilter.socket = build.MOTHERBOARD.socket;
          }
        } else if (type === ComponentType.RAM && build.MOTHERBOARD) {
          compatFilter = { ramType: build.MOTHERBOARD.ramType };
        } else if (type === ComponentType.MOTHERBOARD && build.CPU) {
          compatFilter = { socket: build.CPU.socket };
          if (build.RAM) {
            compatFilter.ramType = build.RAM.ramType;
          }
        }
        const cheaperList = await prisma.hardwareComponent.findMany({
          where: { type, price: { lt: build[type]!.price }, ...compatFilter },
          orderBy: { price: 'desc' },
          take: 20,
        });
        for (const cheaper of cheaperList) {
          if (request.purpose === 'Office' && type === 'CPU' && /(KF|F)$/.test(cheaper.name)) continue;
          // Don't swap to a significantly different component
          if (cheaper.price < build[type]!.price * 0.6) continue;
          build[type] = cheaper;
          totalPrice = Object.values(build).reduce((sum, item) => sum + (item?.price || 0), 0);
          if (totalPrice <= request.budget) break;
        }
        if (totalPrice <= request.budget) break;
      }
    }
  }

  if (mode === 'performance') {
    await fillRemainingBudget(build, request, brandFilter);
    totalPrice = Object.values(build).reduce((sum, item) => sum + (item?.price || 0), 0);
  }

  const originalBuild = { ...build };

  const upgrades: UpgradeOption[] = [];
  const findUpgradeChain = async (type: ComponentType, currentPart: HardwareComponent | null, extraWhere = {}) => {
    if (!currentPart) return;
    const candidates = await prisma.hardwareComponent.findMany({
      where: { type, price: { gt: currentPart.price }, ...extraWhere },
      orderBy: { price: 'asc' },
      take: 3,
    });
    if (candidates.length === 0) return;
    let from = currentPart;
    for (const to of candidates) {
      const impact = getUpgradeImpact(
        { name: from.name, type },
        { name: to.name, type },
        request.resolution || '1080p',
        type === 'CPU' ? build.GPU?.name : undefined,
      );
      upgrades.push({
        componentType: type,
        currentPart: from,
        suggestedPart: to,
        priceDiff: to.price - from.price,
        newTotalPrice: totalPrice + (to.price - from.price),
        benefit: impact.benefit,
        fpsUplift:
          impact.currentFps !== undefined
            ? { currentFps: impact.currentFps!, newFps: impact.newFps!, upliftPercent: impact.upliftPercent! }
            : undefined,
      });
      from = to;
    }
  };

  await findUpgradeChain(ComponentType.GPU, build.GPU);
  const cpuUpgradeFilter: Record<string, any> = { ...brandFilter };
  if (build.MOTHERBOARD) {
    cpuUpgradeFilter.socket = build.MOTHERBOARD.socket;
  }
  await findUpgradeChain(ComponentType.CPU, build.CPU, cpuUpgradeFilter);
  await findUpgradeChain(ComponentType.RAM, build.RAM, { ramType: build.MOTHERBOARD?.ramType });
  await findUpgradeChain(ComponentType.STORAGE, build.STORAGE);

  const isOverBudget = totalPrice > request.budget;

  const estimateGpuTdp = (gpu: typeof build.GPU) => {
    if (gpu?.tdp) return gpu.tdp;
    const price = gpu?.price || 0;
    if (price > 15000000) return 350;
    if (price > 8000000) return 250;
    if (price > 4000000) return 200;
    if (price > 2000000) return 150;
    return 100;
  };
  const totalTdp = (build.CPU?.tdp || 0) + (build.GPU ? estimateGpuTdp(build.GPU) : 0);
  const psuWattage = build.PSU?.wattage || 0;
  const isPsuSafe = psuWattage >= totalTdp * 1.25;

  const performance = predictPerformance(
    build.GPU?.price || 0,
    build.CPU.price,
    build.GPU?.name || '',
    request.resolution,
    build.CPU?.name || '',
    build.RAM?.name || '',
    request.purpose,
  );

  const narrative = skipNarrative ? null : await generateNarrativeWithLLM(build, request);
  const cpuBench = findCpuBenchmark(build.CPU?.name || '');
  const gpuBench = findGpuBenchmark(build.GPU?.name || '');
  const bottleneck = analyzeBottleneck(cpuBench, gpuBench, request.resolution || '1080p');

  const pctUsed = Math.round((totalPrice / request.budget) * 100);

  return {
    build,
    originalBuild,
    componentScores,
    totalPrice,
    isOverBudget,
    targetBudget: request.budget,
    resolution: request.resolution || '1080p',
    lowBudgetAdvice: request.budget < 4500000 ? generateLowBudgetAdvice(request.budget) : null,
    distribution,
    tier: pctUsed >= 90 ? 'Max Performance' : pctUsed >= 60 ? 'Mid-Range' : 'Entry',
    analysis:
      mode === 'performance'
        ? `Build ini menggunakan ${pctUsed}% dari budget Anda (Rp ${Number.isFinite(totalPrice) ? totalPrice.toLocaleString('id-ID') : '0'} dari Rp ${Number.isFinite(request.budget) ? request.budget.toLocaleString('id-ID') : '0'}).`
        : `Build ini ${isOverBudget ? 'sedikit melebihi' : 'menggunakan'} budget Anda (${pctUsed}%).`,
    technical: { totalTdp, psuWattage, isPsuSafe, bottleneckStatus: bottleneck.status },
    performance,
    narrative,
    upgrades,
  };
}

export async function generateBuild(request: RecommendationRequest) {
  return generateSingleBuild(request, 'balanced');
}

export async function generateTieredBuilds(request: RecommendationRequest) {
  const maxBudget = request.budget;
  const cheapestBudget = Math.max(4000000, Math.round(maxBudget * 0.35));
  const midBudget = Math.max(7000000, Math.round(maxBudget * 0.65));

  const cheapestReq = { ...request, budget: request.budget >= 4000000 ? cheapestBudget : maxBudget };
  const midReq = { ...request, budget: request.budget >= 7000000 ? midBudget : maxBudget };
  const perfReq = request;

  const [cheapest, mid, max] = await Promise.all([
    generateSingleBuild(cheapestReq, 'value', true),
    generateSingleBuild(midReq, 'balanced', true),
    generateSingleBuild(perfReq, 'performance', true),
  ]);

  const tiers = [
    { result: cheapest, req: cheapestReq },
    { result: mid, req: midReq },
    { result: max, req: perfReq },
  ];
  for (const { result, req } of tiers) {
    result.narrative = await generateNarrativeWithLLM(result.build, req);
    await new Promise((r) => setTimeout(r, 2000));
  }

  return { tiers: { cheapest, mid, max }, targetBudget: maxBudget };
}
