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

export type Platform = 'intel' | 'amd' | 'default';

export interface RecommendationRequest {
  budget: number;
  purpose: BuildPurpose;
  resolution?: Resolution;
  includePeripheral: boolean;
  platform?: Platform;
  text?: string;
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

function detectMultiPurpose(purpose: BuildPurpose, text?: string): BuildPurpose[] {
  if (!text) return [purpose];
  const lower = text.toLowerCase();
  const purposes: BuildPurpose[] = [purpose];
  if (/maha|siswa|pelajar|mahasiswa|sekolah|kuliah/i.test(lower)) {
    if (!purposes.includes('Office')) purposes.push('Office');
    if (!purposes.includes('Coding')) purposes.push('Coding');
  }
  if (/multi|all.?in.?one|serba|bisa|beragam|gaming.*edit|edit.*gaming/i.test(lower)) {
    if (!purposes.includes('Gaming')) purposes.push('Gaming');
    if (!purposes.includes('Editing')) purposes.push('Editing');
  }
  return purposes;
}

function getBaseDistribution(budget: number, purpose: BuildPurpose): BudgetSplit {
  let splits: BudgetSplit;

  if (budget < 6000000) {
    splits = {
      CPU: 0.28,
      GPU: 0.25,
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
      CPU: 0.2,
      GPU: 0.4,
      MOTHERBOARD: 0.11,
      RAM: 0.09,
      STORAGE: 0.08,
      PSU: 0.06,
      CASE: 0.04,
      COOLER: 0.02,
      PERIPHERALS: 0.0,
    };
  } else if (budget < 25000000) {
    splits = {
      CPU: 0.18,
      GPU: 0.42,
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
      CPU: 0.16,
      GPU: 0.44,
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
      CPU: 0.14,
      GPU: 0.46,
      MOTHERBOARD: 0.08,
      RAM: 0.08,
      STORAGE: 0.07,
      PSU: 0.05,
      CASE: 0.04,
      COOLER: 0.08,
      PERIPHERALS: 0.0,
    };
  }

  if (purpose === 'Editing') {
    splits.CPU += 0.08;
    splits.RAM += 0.05;
    splits.STORAGE += 0.02;
    splits.GPU = Math.max(0, splits.GPU - 0.12);
    if (budget > 12000000) splits.COOLER = Math.max(splits.COOLER, 0.05);
  } else if (purpose === 'Rendering') {
    splits.CPU += 0.03;
    splits.RAM += 0.03;
    splits.STORAGE += 0.01;
    splits.GPU += 0.05;
    if (budget > 12000000) splits.COOLER = Math.max(splits.COOLER, 0.06);
  } else if (purpose === 'Office') {
    splits.CPU = 0.40;
    splits.GPU = 0.0;
    splits.MOTHERBOARD = 0.13;
    splits.RAM = 0.18;
    splits.STORAGE = 0.12;
    splits.PSU = 0.07;
    splits.CASE = 0.05;
    splits.COOLER = 0.0;
  } else if (purpose === 'Coding') {
    splits.CPU += 0.10;
    splits.RAM += 0.08;
    splits.STORAGE += 0.03;
    splits.GPU = Math.max(0, splits.GPU - 0.15);
    if (budget > 12000000) splits.RAM = Math.max(splits.RAM, 0.18);
  } else if (purpose === 'Streaming') {
    splits.CPU -= 0.03;
    splits.GPU += 0.05;
    splits.RAM += 0.02;
  }

  return splits;
}

export const getExpertDistribution = (
  budget: number,
  purpose: BuildPurpose,
  includePeripheral: boolean,
  text?: string,
): BudgetSplit => {
  let splits = getBaseDistribution(budget, purpose);
  const multiPurposes = detectMultiPurpose(purpose, text);

  if (multiPurposes.length > 1) {
    const blended: BudgetSplit = { CPU: 0, GPU: 0, MOTHERBOARD: 0, RAM: 0, STORAGE: 0, PSU: 0, CASE: 0, COOLER: 0, PERIPHERALS: 0 };
    const seen = new Set<string>();
    for (const mp of multiPurposes) {
      const key = `${budget}-${mp}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const tmp = getBaseDistribution(budget, mp);
      for (const k of Object.keys(blended) as (keyof BudgetSplit)[]) {
        blended[k] += tmp[k];
      }
    }
    const count = seen.size;
    for (const k of Object.keys(blended) as (keyof BudgetSplit)[]) {
      splits[k] = blended[k] / count;
    }
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
  purpose?: BuildPurpose,
): PerformanceEstimate[] => {
  const estimates: PerformanceEstimate[] = [];

  const gpuBench = gpuName ? findGpuBenchmark(gpuName) : null;
  const cpuBench = cpuName ? findCpuBenchmark(cpuName) : null;
  const ramImpact = ramName ? findRamImpact(ramName) : null;

  const ramMultiplier = ramImpact?.gamingFpsMultiplier || 1.0;

  const resolutions: { key: string; label: string }[] = [
    { key: '1080p', label: '1080p' },
    { key: '1440p', label: '1440p' },
    { key: '4K', label: '4K' },
  ];

  const isProductivity = purpose === 'Office' || purpose === 'Coding';

  if (!isProductivity && gpuBench) {
    let cpuMultiplier = 1.0;
    if (cpuBench) {
      const gpuAvgFps = (gpuBench.fps1080p + gpuBench.fps1440p + gpuBench.fps4k) / 3;
      const targetScore = gpuAvgFps * 100 * 0.6;
      if (cpuBench.passmarkSingle < targetScore) {
        cpuMultiplier = Math.max(0.5, cpuBench.passmarkSingle / targetScore);
      }
    }

    const cpuMultiNorm = cpuBench ? cpuBench.passmarkMulti / 600 : 0;

    for (const res of resolutions) {
      const baseAaa = res.key === '4K' ? gpuBench.fps4k : res.key === '1440p' ? gpuBench.fps1440p : gpuBench.fps1080p;

      const aaaFps = Math.round(baseAaa * cpuMultiplier * ramMultiplier);

      estimates.push({
        category: `GAME (${res.label})`,
        fps: `${aaaFps} FPS`,
        level: pickLevel(aaaFps),
      });

      const videoScore = Math.round((cpuMultiNorm * 0.5 + baseAaa * 0.5) * ramMultiplier);
      estimates.push({
        category: `Video Rendering (${res.label})`,
        fps: `${videoScore} pts`,
        level: pickLevel(Math.max(videoScore, 20)),
      });

      const renderScore = Math.round((baseAaa * 0.7 + cpuMultiNorm * 0.3) * ramMultiplier);
      estimates.push({
        category: `Rendering 3D (${res.label})`,
        fps: `${renderScore} pts`,
        level: pickLevel(Math.max(renderScore, 20)),
      });
    }

    if (ramImpact && ramImpact.speed !== 'DDR4-3200') {
      estimates.push({
        category: `RAM Impact (${ramImpact.speed})`,
        fps: `${Math.round((ramImpact.gamingFpsMultiplier - 1) * 100)}% vs DDR4-3200 baseline`,
        level: ramImpact.gamingFpsMultiplier >= 1.05 ? 'High' : ramImpact.gamingFpsMultiplier >= 0.95 ? 'Mid' : 'Entry',
      });
    }
  } else if (!isProductivity) {
    for (const res of resolutions) {
      const fallback = estimateFpsFromPrice(gpuPrice);
      const aaaFps = parseInt(fallback.aaa);
      const levelAAA = pickLevel(aaaFps);
      estimates.push({
        category: `GAME (${res.label})`,
        fps: `${fallback.aaa} FPS`,
        level: levelAAA === 'High' ? 'Mid' : levelAAA,
      });
      estimates.push({
        category: `Video Rendering (${res.label})`,
        fps: `${fallback.aaa} pts`,
        level: levelAAA === 'High' ? 'Mid' : levelAAA,
      });
      estimates.push({
        category: `Rendering 3D (${res.label})`,
        fps: `${fallback.aaa} pts`,
        level: levelAAA === 'High' ? 'Mid' : levelAAA,
      });
    }
  } else {
    if (purpose === 'Office') {
      if (cpuBench) {
        estimates.push({
          category: 'Office (Multitasking)',
          fps: `CPU Multi: ${cpuBench.passmarkMulti}`,
          level: cpuBench.passmarkMulti >= 15000 ? 'Ultra' : cpuBench.passmarkMulti >= 8000 ? 'High' : cpuBench.passmarkMulti >= 4000 ? 'Mid' : 'Entry',
        });
        estimates.push({
          category: 'Office (Single Task)',
          fps: `CPU Single: ${cpuBench.passmarkSingle}`,
          level: cpuBench.passmarkSingle >= 3000 ? 'Ultra' : cpuBench.passmarkSingle >= 2000 ? 'High' : cpuBench.passmarkSingle >= 1200 ? 'Mid' : 'Entry',
        });
      }
      estimates.push({
        category: 'RAM & Storage',
        fps: `RAM: ${ramImpact?.speed || 'N/A'} | iGPU terintegrasi`,
        level: ramImpact ? 'High' : 'Mid',
      });
    } else if (purpose === 'Coding') {
      if (cpuBench) {
        estimates.push({
          category: 'CPU Multi (Compile)',
          fps: `Multi: ${cpuBench.passmarkMulti}`,
          level: cpuBench.passmarkMulti >= 20000 ? 'Ultra' : cpuBench.passmarkMulti >= 10000 ? 'High' : cpuBench.passmarkMulti >= 5000 ? 'Mid' : 'Entry',
        });
        estimates.push({
          category: 'CPU Single (IDE)',
          fps: `Single: ${cpuBench.passmarkSingle}`,
          level: cpuBench.passmarkSingle >= 3500 ? 'Ultra' : cpuBench.passmarkSingle >= 2500 ? 'High' : cpuBench.passmarkSingle >= 1500 ? 'Mid' : 'Entry',
        });
      }
      if (ramImpact) {
        estimates.push({
          category: 'RAM Speed',
          fps: `${ramImpact.speed || 'N/A'} | Kapasitas besar untuk VM/Container`,
          level: ramImpact.gamingFpsMultiplier >= 1.05 ? 'High' : 'Mid',
        });
      }
    }
  }

  return estimates;
};

export const generateLowBudgetAdvice = (budget: number) => {
  return {
    title: 'Waktunya Menghadapi Realitas 🛠️',
    message: `Budget Rp ${budget.toLocaleString('id-ID')} saat ini belum cukup untuk merakit PC baru yang layak. Berdasarkan riset pasar Indonesia 2026, budget minimum untuk PC baru yang nyaman adalah Rp 4,5 juta (Office) hingga Rp 8 juta (Gaming Entry).`,
    strategies: [
      {
        id: 'save',
        title: 'The Saver (Tabung Lagi)',
        desc: 'Tambahkan dana untuk mencapai minimum: Rp 4,5jt (Office), Rp 7jt (Coding), atau Rp 8jt (Gaming Entry).',
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
    targetMinimum: 4500000,
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
  let cpuMultiScore = 0;
  if (gpuBench) {
    gpuFpsText = ` (1080p: ~${gpuBench.fps1080p} FPS, 1440p: ~${gpuBench.fps1440p} FPS, 4K: ~${gpuBench.fps4k} FPS untuk gaming)`;
    if (cpuBench) {
      cpuMultiScore = cpuBench.passmarkMulti;
    }
  }

  let cpuBenchText = '';
  if (cpuBench) {
    cpuBenchText = ` (PassMark Single: ${cpuBench.passmarkSingle}, Multi: ${cpuBench.passmarkMulti})`;
  }

  detailed.CPU = `Kami memilih ${build.CPU.name} karena memiliki efisiensi daya yang baik dan performa single-core yang kuat untuk ${request.purpose}.${cpuBenchText}`;

  if (build.GPU) {
    detailed.GPU = `${build.GPU.name} adalah kunci utama build ini, memberikan kekuatan grafis yang optimal untuk target budget Anda.${gpuFpsText}`;
    if (cpuMultiScore > 0) {
      const gpuAvgFps = (gpuBench!.fps1080p + gpuBench!.fps1440p + gpuBench!.fps4k) / 3;
      const videoScore = Math.round((cpuMultiScore / 600) * 0.5 + gpuAvgFps * 0.5);
      const renderScore = Math.round(gpuAvgFps * 0.7 + (cpuMultiScore / 600) * 0.3);
      detailed.GPU += ` Video Rendering: ~${videoScore} pts, 3D Rendering: ~${renderScore} pts di 1080p.`;
    }
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
  } else if (request.purpose === 'Office') {
    general +=
      'Build ini dioptimalkan untuk produktivitas kantor, sekolah, dan kerja sehari-hari. Fokus pada CPU powerful dan RAM besar untuk multitasking aplikasi perkantoran dan browsing.';
  } else if (request.purpose === 'Coding') {
    general +=
      'Build ini dioptimalkan untuk programming dan development. Prioritas pada CPU multi-core untuk kompilasi cepat, RAM besar untuk container/VM, dan storage cepat untuk loading project.';
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
    if (gpuBench) {
      benchmarkText += `\nGPU Benchmark (FPS): 1080p AAA=${gpuBench.fps1080p} / E-Sports=${gpuBench.fpsEsports}, 1440p AAA=${gpuBench.fps1440p}, 4K AAA=${gpuBench.fps4k}.`;
    }
    if (cpuBench) {
      benchmarkText += `\nCPU Benchmark: PassMark Single=${cpuBench.passmarkSingle}, Multi=${cpuBench.passmarkMulti}.`;
    }

    const prompt = `Racikan PC untuk ${request.purpose} budget Rp ${request.budget.toLocaleString('id-ID')}:

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
