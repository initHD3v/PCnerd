import { ComponentType } from '@prisma/client';
import {
  findGpuBenchmark,
  findCpuBenchmark,
  findRamImpact,
  estimateFpsFromPrice,
  analyzeBottleneck,
  calculateFpsUplift,
  estimateCpuFpsImpact,
  scoreComponent,
} from '@/data/benchmarks';
import { callLLM } from './llm';

export type BuildPurpose = 'Gaming' | 'Editing' | 'Office' | 'Streaming' | 'Coding' | 'Rendering';
export type Resolution = '1080p' | '1440p' | '4K';

export interface RecommendationRequest {
  budget: number;
  purpose: BuildPurpose;
  resolution?: Resolution;
  includePeripheral: boolean;
}

export interface BudgetSplit {
  CPU: number;
  GPU: number;
  MOTHERBOARD: number;
  RAM: number;
  STORAGE: number;
  PSU: number;
  CASE: number;
  COOLER: number;
  PERIPHERALS: number;
}

export interface PerformanceEstimate {
  category: string;
  fps: string;
  level: 'Entry' | 'Mid' | 'High' | 'Ultra';
}

export interface ComponentScore {
  component: any;
  totalScore: number;
  compatibilityScore: number;
  performanceScore: number;
  valueScore: number;
  reliabilityScore: number;
}

export const getExpertDistribution = (
  budget: number,
  purpose: BuildPurpose,
  includePeripheral: boolean,
): BudgetSplit => {
  let splits: BudgetSplit;

  if (budget < 6000000) {
    splits = {
      CPU: 0.35,
      GPU: 0.18,
      MOTHERBOARD: 0.14,
      RAM: 0.12,
      STORAGE: 0.1,
      PSU: 0.06,
      CASE: 0.05,
      COOLER: 0.0,
      PERIPHERALS: 0.0,
    };
  } else if (budget < 12000000) {
    splits = {
      CPU: 0.24,
      GPU: 0.35,
      MOTHERBOARD: 0.11,
      RAM: 0.09,
      STORAGE: 0.08,
      PSU: 0.06,
      CASE: 0.04,
      COOLER: 0.03,
      PERIPHERALS: 0.0,
    };
  } else if (budget < 25000000) {
    splits = {
      CPU: 0.2,
      GPU: 0.4,
      MOTHERBOARD: 0.1,
      RAM: 0.08,
      STORAGE: 0.08,
      PSU: 0.06,
      CASE: 0.04,
      COOLER: 0.04,
      PERIPHERALS: 0.0,
    };
  } else if (budget < 50000000) {
    splits = {
      CPU: 0.18,
      GPU: 0.42,
      MOTHERBOARD: 0.09,
      RAM: 0.08,
      STORAGE: 0.07,
      PSU: 0.06,
      CASE: 0.04,
      COOLER: 0.06,
      PERIPHERALS: 0.0,
    };
  } else {
    splits = {
      CPU: 0.15,
      GPU: 0.45,
      MOTHERBOARD: 0.08,
      RAM: 0.08,
      STORAGE: 0.07,
      PSU: 0.05,
      CASE: 0.04,
      COOLER: 0.08,
      PERIPHERALS: 0.0,
    };
  }

  if (purpose === 'Editing' || purpose === 'Rendering') {
    splits.CPU += 0.08;
    splits.RAM += 0.05;
    splits.STORAGE += 0.02;
    splits.GPU = Math.max(0, splits.GPU - 0.12);
    if (budget > 12000000) splits.COOLER = Math.max(splits.COOLER, 0.05);
  } else if (purpose === 'Office') {
    splits.CPU = 0.45;
    splits.GPU = 0.0;
    splits.MOTHERBOARD = 0.14;
    splits.RAM = 0.14;
    splits.STORAGE = 0.1;
    splits.PSU = 0.07;
    splits.CASE = 0.05;
    splits.COOLER = 0.0;
  }

  if (includePeripheral) {
    const peripheralRatio = 0.15;
    const factor = 1 - peripheralRatio;
    (Object.keys(splits) as (keyof BudgetSplit)[]).forEach((key) => {
      if (key !== 'PERIPHERALS') splits[key] *= factor;
    });
    splits.PERIPHERALS = peripheralRatio;
  }

  return splits;
};

function pickLevel(aaaFps: number): PerformanceEstimate['level'] {
  if (aaaFps >= 100) return 'Ultra';
  if (aaaFps >= 60) return 'High';
  if (aaaFps >= 40) return 'Mid';
  return 'Entry';
}

export const predictPerformance = (
  gpuPrice: number,
  cpuPrice: number,
  gpuName?: string,
  resolution?: string,
  cpuName?: string,
  ramName?: string,
): PerformanceEstimate[] => {
  const estimates: PerformanceEstimate[] = [];
  const res = resolution || '1080p';

  const gpuBench = gpuName ? findGpuBenchmark(gpuName) : null;
  const cpuBench = cpuName ? findCpuBenchmark(cpuName) : null;
  const ramImpact = ramName ? findRamImpact(ramName) : null;

  const ramMultiplier = ramImpact?.gamingFpsMultiplier || 1.0;

  if (gpuBench) {
    const baseAaa = res === '4K' ? gpuBench.fps4k : res === '1440p' ? gpuBench.fps1440p : gpuBench.fps1080p;
    const baseEsports = gpuBench.fpsEsports;

    let cpuMultiplier = 1.0;
    if (cpuBench) {
      const gpuAvgFps = (gpuBench.fps1080p + gpuBench.fps1440p + gpuBench.fps4k) / 3;
      const targetScore = gpuAvgFps * 100 * 0.6;
      if (cpuBench.passmarkSingle < targetScore) {
        cpuMultiplier = Math.max(0.5, cpuBench.passmarkSingle / targetScore);
      }
    }

    const aaaFps = Math.round(baseAaa * cpuMultiplier * ramMultiplier);
    const esportsFps = Math.round(baseEsports * cpuMultiplier * ramMultiplier);

    const resLabel = res === '4K' ? '4K' : res === '1440p' ? '1440p' : '1080p';

    estimates.push({
      category: `AAA Games (${resLabel})`,
      fps: `${aaaFps} FPS`,
      level: pickLevel(aaaFps),
    });
    estimates.push({
      category: `E-Sports (${resLabel})`,
      fps: `${esportsFps}+ FPS`,
      level: pickLevel(esportsFps),
    });

    if (ramImpact && ramImpact.speed !== 'DDR4-3200') {
      const baseRamName = ramName || '';
      estimates.push({
        category: `RAM Impact (${ramImpact.speed})`,
        fps: `${Math.round((ramImpact.gamingFpsMultiplier - 1) * 100)}% vs DDR4-3200 baseline`,
        level: ramImpact.gamingFpsMultiplier >= 1.05 ? 'High' : ramImpact.gamingFpsMultiplier >= 0.95 ? 'Mid' : 'Entry',
      });
    }
  } else {
    const fallback = estimateFpsFromPrice(gpuPrice);
    const levelAAA = pickLevel(parseInt(fallback.aaa));
    estimates.push({
      category: 'AAA Games (1080p)',
      fps: `${fallback.aaa} FPS`,
      level: levelAAA === 'High' ? 'Mid' : levelAAA,
    });
    estimates.push({
      category: 'E-Sports (1080p)',
      fps: `${fallback.esports} FPS`,
      level: 'Mid',
    });
  }

  return estimates;
};

export const generateLowBudgetAdvice = (budget: number) => {
  return {
    title: 'Waktunya Menghadapi Realitas 🛠️',
    message: `Budget Rp ${budget.toLocaleString('id-ID')} saat ini belum cukup untuk merakit sebuah PC baru yang layak dan aman. Komponen inti minimal (Motherboard + CPU + PSU) saja biasanya sudah membutuhkan dana sekitar Rp 1.8 - 2.2 Juta.`,
    strategies: [
      {
        id: 'save',
        title: 'The Saver (Tabung Lagi)',
        desc: 'Tambahkan sekitar Rp 1 - 1.5 Juta lagi untuk mendapatkan PC baru kelas entry-level yang stabil.',
        icon: 'Wallet',
      },
      {
        id: 'hunter',
        title: 'The Hunter (Pasar Bekas)',
        desc: 'Cari PC bekas kantor (Dell Optiplex/ThinkCentre) atau rakitan seri lama (AM3+/LGA1155) di marketplace.',
        icon: 'Search',
      },
      {
        id: 'upgrader',
        title: 'The Upgrader (Optimasi)',
        desc: 'Jika sudah punya PC lama, gunakan dana ini untuk upgrade RAM ke 16GB dan ganti HDD ke SSD.',
        icon: 'Zap',
      },
    ],
    targetMinimum: 2500000,
  };
};

export const generateNarrative = (
  build: any,
  request: RecommendationRequest,
  isUpgrade: boolean = false,
): { general: string; detailed: Record<string, string> } => {
  const detailed: Record<string, string> = {};

  const gpuBench = build.GPU?.name ? findGpuBenchmark(build.GPU.name) : null;
  const cpuBench = build.CPU?.name ? findCpuBenchmark(build.CPU.name) : null;
  const ramImpact = build.RAM?.name ? findRamImpact(build.RAM.name) : null;
  const res = request.resolution || '1080p';
  const bottleneck = analyzeBottleneck(cpuBench, gpuBench, res);
  let gpuFpsText = '';
  if (gpuBench) {
    const aaaFps = res === '4K' ? gpuBench.fps4k : res === '1440p' ? gpuBench.fps1440p : gpuBench.fps1080p;
    gpuFpsText = ` (~${aaaFps} FPS di ${res} untuk AAA games)`;
  }

  let cpuBenchText = '';
  if (cpuBench) {
    cpuBenchText = ` (PassMark Single: ${cpuBench.passmarkSingle}, Multi: ${cpuBench.passmarkMulti})`;
  }

  detailed.CPU = `Kami memilih ${build.CPU.name} karena memiliki efisiensi daya yang baik dan performa single-core yang kuat untuk ${request.purpose}.${cpuBenchText}`;

  if (build.GPU) {
    detailed.GPU = `${build.GPU.name} adalah kunci utama build ini, memberikan kekuatan grafis yang optimal untuk target budget Anda.${gpuFpsText}`;
  } else {
    detailed.GPU = 'Menggunakan grafis terintegrasi (iGPU) untuk menghemat budget dan fokus pada performa komputasi.';
  }

  detailed.MOTHERBOARD = `Motherboard dengan socket ${build.CPU.socket} dipilih untuk memastikan kompatibilitas penuh dan stabilitas sistem.`;

  if (ramImpact && build.RAM) {
    const ramDiff = Math.round((ramImpact.gamingFpsMultiplier - 1) * 100);
    const sign = ramDiff >= 0 ? '+' : '';
    detailed.RAM = `${build.RAM.name} memberikan performa ${sign}${ramDiff}% ${ramDiff >= 0 ? 'lebih baik' : 'lebih rendah'} dibandingkan DDR4-3200 baseline untuk gaming.`;
  }

  if (bottleneck.bottleneckType !== 'Balanced') {
    detailed.CPU = (detailed.CPU || '') + ` Analisis bottleneck: ${bottleneck.status}.`;
  }

  let general = isUpgrade
    ? `Pilihan yang sangat cerdas! Dengan upgrade yang Anda pilih, build ini kini memiliki performa yang jauh lebih tinggi. `
    : `Build ini dirancang dengan filosofi "Pure Performance". Dengan budget Rp ${request.budget.toLocaleString('id-ID')}, kami memprioritaskan ${build.GPU ? 'GPU' : 'CPU'} sebagai jantung utama. `;

  if (gpuFpsText) general += `GPU ini mampu mencapai${gpuFpsText}. `;
  if (bottleneck.bottleneckType !== 'Balanced') general += `Catatan: ${bottleneck.status}. `;

  if (request.purpose === 'Gaming') {
    general +=
      'Fokus utama adalah mencapai FPS setinggi mungkin dengan meminimalisir pengeluaran pada komponen estetika.';
  } else if (request.purpose === 'Editing') {
    general +=
      'Alokasi budget digeser lebih banyak ke CPU dan RAM untuk mempercepat proses rendering dan multitasking.';
  }

  if (isUpgrade) {
    general += ' Tambahan investasi Anda akan sangat terasa pada stabilitas frame rate dan kecepatan load aplikasi.';
  }

  return { general, detailed };
};

export function getUpgradeImpact(
  currentPart: { name: string; type: string },
  suggestedPart: { name: string; type: string },
  resolution?: string,
  gpuName?: string,
): { currentFps?: number; newFps?: number; upliftPercent?: number; benefit: string } {
  const res = resolution || '1080p';

  if (currentPart.type === 'GPU' || currentPart.type === 'GPU') {
    const uplift = calculateFpsUplift(currentPart.name, suggestedPart.name, res);
    if (uplift) {
      return {
        currentFps: uplift.currentFps,
        newFps: uplift.newFps,
        upliftPercent: uplift.upliftPercent,
        benefit: `Upgrade GPU: ${uplift.currentFps} FPS → ${uplift.newFps} FPS (+${uplift.upliftPercent}%) di ${res}.`,
      };
    }
  }

  if (currentPart.type === 'CPU' || currentPart.type === 'CPU') {
    const currentCpu = findCpuBenchmark(currentPart.name);
    const suggestedCpu = findCpuBenchmark(suggestedPart.name);
    if (currentCpu && suggestedCpu) {
      const singleUplift = Math.round(
        ((suggestedCpu.passmarkSingle - currentCpu.passmarkSingle) / currentCpu.passmarkSingle) * 100,
      );
      const multiUplift = Math.round(
        ((suggestedCpu.passmarkMulti - currentCpu.passmarkMulti) / currentCpu.passmarkMulti) * 100,
      );

      if (gpuName) {
        const fpsImpact = estimateCpuFpsImpact(currentPart.name, suggestedPart.name, gpuName, res);
        if (fpsImpact) {
          return {
            currentFps: fpsImpact.currentFps,
            newFps: fpsImpact.newFps,
            upliftPercent: fpsImpact.upliftPercent,
            benefit: `Upgrade CPU: +${singleUplift}% single-core. Gaming: ${fpsImpact.currentFps} FPS → ${fpsImpact.newFps} FPS (+${fpsImpact.upliftPercent}%) di ${res}.`,
          };
        }
      }

      return {
        currentFps: currentCpu.passmarkSingle,
        newFps: suggestedCpu.passmarkSingle,
        upliftPercent: singleUplift,
        benefit: `Upgrade CPU: Single-core +${singleUplift}%, Multi-core +${multiUplift}%. ${multiUplift > 30 ? 'Cocok untuk rendering dan multitasking.' : 'Meningkatkan performa gaming dan komputasi.'}`,
      };
    }
  }

  if (currentPart.type === 'RAM' || currentPart.type === 'RAM') {
    const currentRam = findRamImpact(currentPart.name);
    const suggestedRam = findRamImpact(suggestedPart.name);
    if (currentRam && suggestedRam) {
      const fpsUplift = Math.round((suggestedRam.gamingFpsMultiplier - currentRam.gamingFpsMultiplier) * 100);
      return {
        currentFps: Math.round(currentRam.gamingFpsMultiplier * 100),
        newFps: Math.round(suggestedRam.gamingFpsMultiplier * 100),
        upliftPercent: fpsUplift,
        benefit: `Upgrade RAM: ${currentRam.speed} → ${suggestedRam.speed}. Gaming ${fpsUplift > 0 ? '+' : ''}${fpsUplift}% FPS.`,
      };
    }
  }

  return { benefit: 'Peningkatan kualitas komponen.' };
}

export async function generateNarrativeWithLLM(
  build: any,
  request: RecommendationRequest,
  isUpgrade: boolean = false,
): Promise<{ general: string; detailed: Record<string, string>; weaknesses?: string[]; strengths?: string[] }> {
  const template = generateNarrative(build, request, isUpgrade);

  try {
    const componentsText = Object.entries(build || {})
      .filter(([, p]) => p)
      .map(([type, part]: [string, any]) => `${type}: ${part.name} (Rp ${part.price?.toLocaleString('id-ID')})`)
      .join('\n');

    const gpuBench = build.GPU?.name ? findGpuBenchmark(build.GPU.name) : null;
    const cpuBench = build.CPU?.name ? findCpuBenchmark(build.CPU.name) : null;

    let benchmarkText = '';
    const res = request.resolution || '1080p';
    if (gpuBench) {
      const aaaFps = res === '4K' ? gpuBench.fps4k : res === '1440p' ? gpuBench.fps1440p : gpuBench.fps1080p;
      benchmarkText += `\nGPU Benchmark: ${aaaFps} FPS di ${res} AAA Games, ${gpuBench.fpsEsports} FPS E-Sports.`;
    }
    if (cpuBench) {
      benchmarkText += `\nCPU Benchmark: PassMark Single=${cpuBench.passmarkSingle}, Multi=${cpuBench.passmarkMulti}.`;
    }

    const prompt = `Racikan PC untuk ${request.purpose} budget Rp ${request.budget.toLocaleString('id-ID')} di resolusi ${res}:

${componentsText}
${benchmarkText}
${isUpgrade ? 'Ini adalah hasil upgrade.' : ''}

Analisis dalam JSON: { "general": "string", "detailed": { "CPU": "string", "GPU": "string", "MOTHERBOARD": "string", "RAM": "string", "STORAGE": "string", "PSU": "string", "CASE": "string", "COOLER": "string" }, "weaknesses": ["string"], "strengths": ["string"] }`;

    const systemPrompt = `Kamu adalah ahli racik PC yang jujur dan analitis.
Analisis build ini secara objektif.
Gunakan data benchmark FPS dan PassMark yang tersedia untuk mendukung analisismu.
Sebutkan angka FPS konkret dalam analisis GPU.
Sebutkan skor benchmark CPU jika relevan.
Gunakan bahasa Indonesia natural.
Jika ada ketidakseimbangan, katakan dengan sopan.
Berikan strengths dan weaknesses yang spesifik, bukan template.`;

    const result = await callLLM(systemPrompt, prompt);
    if (result) {
      try {
        const parsed = JSON.parse(result);
        return {
          general: parsed.general || template.general,
          detailed: parsed.detailed || template.detailed,
          weaknesses: parsed.weaknesses || [],
          strengths: parsed.strengths || [],
        };
      } catch {
        return { ...template, general: result, weaknesses: [], strengths: [] };
      }
    }
  } catch {}

  return { ...template, weaknesses: [], strengths: [] };
}
