import { prisma } from './prisma';
import {
  RecommendationRequest,
  getExpertDistribution,
  generateNarrativeWithLLM,
  predictPerformance,
  generateLowBudgetAdvice,
} from './recommendation-engine';
import { ComponentType, HardwareComponent } from '@prisma/client';

export interface UpgradeOption {
  componentType: ComponentType;
  currentPart: HardwareComponent;
  suggestedPart: HardwareComponent;
  priceDiff: number;
  newTotalPrice: number;
  benefit: string;
}

export async function generateBuild(request: RecommendationRequest) {
  const distribution = getExpertDistribution(request.budget, request.purpose, request.includePeripheral);
  const build: Record<string, HardwareComponent | null> = {};

  // Strict Search: First pass with tight constraints (lte: targetPrice)
  const findPart = async (type: ComponentType, targetPrice: number, extraWhere = {}) => {
    // 1. Try to find within tight budget
    let part = await prisma.hardwareComponent.findFirst({
      where: { type, price: { lte: targetPrice }, ...extraWhere },
      orderBy: { price: 'desc' },
    });

    // 2. If not found, find the absolute cheapest to ensure build is possible
    if (!part) {
      part = await prisma.hardwareComponent.findFirst({
        where: { type, ...extraWhere },
        orderBy: { price: 'asc' },
      });
    }

    return part;
  };

  // Build Construction
  build.CPU = await findPart(ComponentType.CPU, request.budget * distribution.CPU);
  if (!build.CPU) throw new Error('Tidak ada CPU yang tersedia di database.');

  build.MOTHERBOARD = await findPart(ComponentType.MOTHERBOARD, request.budget * distribution.MOTHERBOARD, {
    socket: build.CPU.socket,
  });
  if (distribution.GPU > 0) build.GPU = await findPart(ComponentType.GPU, request.budget * distribution.GPU);
  build.RAM = await findPart(
    ComponentType.RAM,
    request.budget * distribution.RAM,
    build.MOTHERBOARD ? { ramType: build.MOTHERBOARD.ramType } : {},
  );
  build.PSU = await findPart(ComponentType.PSU, request.budget * distribution.PSU);
  build.STORAGE = await findPart(ComponentType.STORAGE, request.budget * distribution.STORAGE);
  build.CASE = await findPart(ComponentType.CASE, request.budget * distribution.CASE);
  build.COOLER = await findPart(ComponentType.COOLER, request.budget * 0.05);

  let totalPrice = Object.values(build).reduce((sum, item) => sum + (item?.price || 0), 0);

  // Strict Correction: If total price exceeds budget, swap components for cheaper ones iteratively
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
        const cheaper = await prisma.hardwareComponent.findFirst({
          where: { type, price: { lt: build[type]!.price } },
          orderBy: { price: 'desc' },
        });
        if (cheaper) {
          build[type] = cheaper;
          totalPrice = Object.values(build).reduce((sum, item) => sum + (item?.price || 0), 0);
          if (totalPrice <= request.budget) break;
        }
      }
    }
  }

  const originalBuild = { ...build };

  // --- Smart Upgrade Finder ---
  const upgrades: UpgradeOption[] = [];
  const findUpgrade = async (type: ComponentType, currentPart: HardwareComponent | null, extraWhere = {}) => {
    if (!currentPart) return null;

    const suggested = await prisma.hardwareComponent.findFirst({
      where: {
        type,
        price: { gt: currentPart.price, lte: currentPart.price * 1.5 },
        ...extraWhere,
      },
      orderBy: { price: 'asc' },
    });

    if (suggested) {
      let benefit = 'Peningkatan kualitas komponen.';
      if (type === 'GPU') benefit = 'Performa gaming lebih stabil di resolusi tinggi.';
      if (type === 'CPU') benefit = 'Proses multitasking dan rendering lebih cepat.';
      if (type === 'RAM') benefit = 'Kapasitas/kecepatan lebih besar untuk beban kerja berat.';
      if (type === 'PSU') benefit = 'Daya lebih besar dan efisiensi lebih baik.';
      if (type === 'STORAGE') benefit = 'Kapasitas penyimpanan lebih luas.';

      upgrades.push({
        componentType: type,
        currentPart,
        suggestedPart: suggested,
        priceDiff: suggested.price - currentPart.price,
        newTotalPrice: totalPrice + (suggested.price - currentPart.price),
        benefit,
      });
    }
  };

  await findUpgrade(ComponentType.GPU, build.GPU);
  await findUpgrade(ComponentType.CPU, build.CPU);
  await findUpgrade(ComponentType.RAM, build.RAM, { ramType: build.MOTHERBOARD?.ramType });
  await findUpgrade(ComponentType.STORAGE, build.STORAGE);

  const isOverBudget = totalPrice > request.budget;

  // --- Smart Logic Extensions ---

  // 1. TDP Calculation — prefer DB field, fallback to price-based estimate
  const estimateGpuTdp = (gpu: typeof build.GPU) => {
    if (gpu?.tdp) return gpu.tdp;
    const price = gpu?.price || 0;
    if (price > 15000000) return 350; // RTX 4080/4090 class
    if (price > 8000000) return 250;  // RTX 4070 class
    if (price > 4000000) return 200;  // RTX 4060 class
    if (price > 2000000) return 150;  // GTX 1650 / entry
    return 100;                        // Integrated-class
  };
  const totalTdp = (build.CPU?.tdp || 0) + (build.GPU ? estimateGpuTdp(build.GPU) : 0);
  const psuWattage = build.PSU?.wattage || 0;
  const isPsuSafe = psuWattage >= totalTdp * 1.25;

  // 2. Performance Prediction — berbasis benchmark real
  const gpuModelName = build.GPU?.name || '';
  const performance = predictPerformance(build.GPU?.price || 0, build.CPU.price, gpuModelName, request.resolution);

  // 3. Narrative Generation — LLM-powered, fallback ke template
  const narrative = await generateNarrativeWithLLM(build, request);

  // 4. Bottleneck Analysis (Heuristic)
  let bottleneckStatus = 'Sangat Seimbang';
  if (build.GPU && build.GPU.price > build.CPU.price * 4) {
    bottleneckStatus = 'Potensi Bottleneck CPU (CPU terlalu lemah untuk GPU ini)';
  } else if (build.GPU && build.CPU.price > build.GPU.price * 2) {
    bottleneckStatus = 'Potensi Bottleneck GPU (GPU terlalu lemah untuk CPU ini)';
  }

  const lowBudgetAdvice = request.budget < 2500000 ? generateLowBudgetAdvice(request.budget) : null;

  return {
    build,
    originalBuild,
    totalPrice,
    isOverBudget,
    targetBudget: request.budget,
    lowBudgetAdvice,
    distribution,
    tier: request.budget < 10000000 ? 'Entry' : request.budget < 25000000 ? 'Mid' : 'High-End',
    analysis: `Build ini ${isOverBudget ? 'sedikit melebihi' : 'sesuai'} dengan budget Anda.`,
    technical: {
      totalTdp,
      psuWattage,
      isPsuSafe,
      bottleneckStatus,
    },
    performance,
    narrative,
    upgrades,
  };
}
