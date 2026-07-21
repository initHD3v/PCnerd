import { ComponentType } from '@prisma/client';
import { findGpuBenchmark, estimateFpsFromPrice } from '@/data/benchmarks';
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

export const getExpertDistribution = (
  budget: number,
  purpose: BuildPurpose,
  includePeripheral: boolean,
): BudgetSplit => {
  let splits: BudgetSplit;

  if (budget < 8000000) {
    splits = {
      CPU: 0.35,
      GPU: 0.2,
      MOTHERBOARD: 0.12,
      RAM: 0.1,
      STORAGE: 0.08,
      PSU: 0.08,
      CASE: 0.07,
      COOLER: 0.0,
      PERIPHERALS: 0.0,
    };
  } else if (budget < 18000000) {
    splits = {
      CPU: 0.25,
      GPU: 0.4,
      MOTHERBOARD: 0.1,
      RAM: 0.08,
      STORAGE: 0.07,
      PSU: 0.06,
      CASE: 0.04,
      COOLER: 0.0,
      PERIPHERALS: 0.0,
    };
  } else if (budget < 35000000) {
    splits = {
      CPU: 0.22,
      GPU: 0.48,
      MOTHERBOARD: 0.09,
      RAM: 0.07,
      STORAGE: 0.06,
      PSU: 0.05,
      CASE: 0.03,
      COOLER: 0.0,
      PERIPHERALS: 0.0,
    };
  } else {
    splits = {
      CPU: 0.18,
      GPU: 0.55,
      MOTHERBOARD: 0.08,
      RAM: 0.07,
      STORAGE: 0.06,
      PSU: 0.03,
      CASE: 0.03,
      COOLER: 0.0,
      PERIPHERALS: 0.0,
    };
  }

  if (purpose === 'Editing' || purpose === 'Rendering') {
    splits.CPU += 0.1;
    splits.RAM += 0.07;
    splits.GPU -= 0.15;
    splits.STORAGE += 0.03;
    if (budget > 12000000) splits.COOLER = 0.05;
  } else if (purpose === 'Office') {
    splits.CPU = 0.5;
    splits.GPU = 0.0;
    splits.MOTHERBOARD = 0.15;
    splits.RAM = 0.15;
    splits.STORAGE = 0.1;
    splits.PSU = 0.07;
    splits.CASE = 0.03;
  }

  if (includePeripheral) {
    const peripheralRatio = 0.15;
    const factor = 1 - peripheralRatio;
    Object.keys(splits).forEach((key) => {
      const k = key as keyof BudgetSplit;
      if (k !== 'PERIPHERALS') splits[k] *= factor;
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
): PerformanceEstimate[] => {
  const estimates: PerformanceEstimate[] = [];
  const res = resolution || '1080p';

  let benchmark = null;
  if (gpuName) {
    benchmark = findGpuBenchmark(gpuName);
  }

  if (benchmark) {
    const aaaFps = res === '4K' ? benchmark.fps4k : res === '1440p' ? benchmark.fps1440p : benchmark.fps1080p;
    const esportsFps = benchmark.fpsEsports;

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

  detailed.CPU = `Kami memilih ${build.CPU.name} karena memiliki efisiensi daya yang baik dan performa single-core yang kuat untuk ${request.purpose}.`;

  if (build.GPU) {
    detailed.GPU = `${build.GPU.name} adalah kunci utama build ini, memberikan kekuatan grafis yang optimal untuk target budget Anda.`;
  } else {
    detailed.GPU = 'Menggunakan grafis terintegrasi (iGPU) untuk menghemat budget dan fokus pada performa komputasi.';
  }

  detailed.MOTHERBOARD = `Motherboard dengan socket ${build.CPU.socket} dipilih untuk memastikan kompatibilitas penuh dan stabilitas sistem.`;

  let general = isUpgrade
    ? `Pilihan yang sangat cerdas! Dengan upgrade yang Anda pilih, build ini kini memiliki performa yang jauh lebih tinggi. `
    : `Build ini dirancang dengan filosofi "Pure Performance". Dengan budget Rp ${request.budget.toLocaleString('id-ID')}, kami memprioritaskan ${build.GPU ? 'GPU' : 'CPU'} sebagai jantung utama. `;

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

    const prompt = `Racikan PC untuk ${request.purpose} budget Rp ${request.budget.toLocaleString('id-ID')}:

${componentsText}

${isUpgrade ? 'Ini adalah hasil upgrade.' : ''}

Analisis dalam JSON: { "general": "string", "detailed": { "CPU": "string", "GPU": "string", "MOTHERBOARD": "string", "RAM": "string", "STORAGE": "string", "PSU": "string", "CASE": "string", "COOLER": "string" }, "weaknesses": ["string"], "strengths": ["string"] }`;

    const systemPrompt = `Kamu adalah ahli racik PC yang jujur dan analitis. 
Analisis build ini secara objektif. 
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
