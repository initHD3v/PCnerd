export interface GpuBenchmark {
  model: string;
  fps1080p: number;
  fps1440p: number;
  fps4k: number;
  fpsEsports: number;
}

export interface CpuBenchmark {
  model: string;
  passmarkSingle: number;
  passmarkMulti: number;
  cinebenchR23: number;
}

export interface RamImpact {
  speed: string;
  gamingFpsMultiplier: number;
  productivityMultiplier: number;
}

const GPU_BENCHMARKS: GpuBenchmark[] = [
  // Entry-level / Legacy
  { model: 'GT 730', fps1080p: 18, fps1440p: 10, fps4k: 0, fpsEsports: 45 },
  { model: 'GT 1030', fps1080p: 25, fps1440p: 15, fps4k: 0, fpsEsports: 60 },
  { model: 'GTX 1050 Ti', fps1080p: 45, fps1440p: 28, fps4k: 12, fpsEsports: 120 },
  { model: 'GTX 1650', fps1080p: 52, fps1440p: 34, fps4k: 15, fpsEsports: 140 },
  { model: 'GTX 1660 Super', fps1080p: 70, fps1440p: 48, fps4k: 22, fpsEsports: 180 },
  { model: 'RX 580', fps1080p: 50, fps1440p: 32, fps4k: 14, fpsEsports: 130 },
  { model: 'RX 6600', fps1080p: 78, fps1440p: 52, fps4k: 24, fpsEsports: 190 },
  { model: 'RX 6600 XT', fps1080p: 88, fps1440p: 60, fps4k: 30, fpsEsports: 210 },
  // NVIDIA RTX 30 series
  { model: 'RTX 3050', fps1080p: 68, fps1440p: 45, fps4k: 20, fpsEsports: 170 },
  { model: 'RTX 3060', fps1080p: 85, fps1440p: 58, fps4k: 28, fpsEsports: 200 },
  { model: 'RTX 3060 Ti', fps1080p: 95, fps1440p: 68, fps4k: 35, fpsEsports: 220 },
  // NVIDIA RTX 40 series
  { model: 'RTX 4060', fps1080p: 92, fps1440p: 65, fps4k: 32, fpsEsports: 210 },
  { model: 'RTX 4060 Ti', fps1080p: 105, fps1440p: 75, fps4k: 40, fpsEsports: 240 },
  { model: 'RTX 4070', fps1080p: 120, fps1440p: 88, fps4k: 48, fpsEsports: 280 },
  { model: 'RTX 4070 Super', fps1080p: 135, fps1440p: 100, fps4k: 55, fpsEsports: 300 },
  { model: 'RTX 4070 Ti Super', fps1080p: 145, fps1440p: 110, fps4k: 62, fpsEsports: 320 },
  { model: 'RTX 4080 Super', fps1080p: 170, fps1440p: 130, fps4k: 75, fpsEsports: 360 },
  { model: 'RTX 4090', fps1080p: 200, fps1440p: 160, fps4k: 95, fpsEsports: 400 },
  // NVIDIA RTX 50 series (Blackwell 2025)
  { model: 'RTX 5050', fps1080p: 78, fps1440p: 52, fps4k: 25, fpsEsports: 190 },
  { model: 'RTX 5060', fps1080p: 98, fps1440p: 70, fps4k: 36, fpsEsports: 225 },
  { model: 'RTX 5060 Ti', fps1080p: 115, fps1440p: 82, fps4k: 44, fpsEsports: 255 },
  { model: 'RTX 5070', fps1080p: 140, fps1440p: 105, fps4k: 58, fpsEsports: 310 },
  { model: 'RTX 5070 Ti', fps1080p: 165, fps1440p: 128, fps4k: 72, fpsEsports: 350 },
  { model: 'RTX 5080', fps1080p: 195, fps1440p: 150, fps4k: 88, fpsEsports: 390 },
  { model: 'RTX 5090', fps1080p: 260, fps1440p: 210, fps4k: 130, fpsEsports: 480 },
  // AMD RDNA 2/3
  { model: 'RX 7600', fps1080p: 90, fps1440p: 62, fps4k: 30, fpsEsports: 205 },
  { model: 'RX 7700 XT', fps1080p: 110, fps1440p: 78, fps4k: 42, fpsEsports: 250 },
  { model: 'RX 7800 XT', fps1080p: 125, fps1440p: 92, fps4k: 50, fpsEsports: 280 },
  { model: 'RX 7900 GRE', fps1080p: 130, fps1440p: 95, fps4k: 52, fpsEsports: 290 },
  { model: 'RX 7900 XT', fps1080p: 150, fps1440p: 115, fps4k: 65, fpsEsports: 330 },
  { model: 'RX 7900 XTX', fps1080p: 170, fps1440p: 132, fps4k: 78, fpsEsports: 370 },
  // AMD RDNA 4 / RX 9000 series (2025)
  { model: 'RX 9060', fps1080p: 92, fps1440p: 65, fps4k: 32, fpsEsports: 210 },
  { model: 'RX 9060 XT', fps1080p: 108, fps1440p: 78, fps4k: 42, fpsEsports: 245 },
  { model: 'RX 9070', fps1080p: 135, fps1440p: 100, fps4k: 56, fpsEsports: 300 },
  { model: 'RX 9070 XT', fps1080p: 158, fps1440p: 122, fps4k: 70, fpsEsports: 345 },
];

const CPU_BENCHMARKS: CpuBenchmark[] = [
  // AMD Zen / Zen+
  { model: 'Ryzen 3 2200G', passmarkSingle: 1986, passmarkMulti: 7500, cinebenchR23: 4800 },
  { model: 'Ryzen 3 3100', passmarkSingle: 2350, passmarkMulti: 9800, cinebenchR23: 6300 },
  { model: 'Ryzen 3 4100', passmarkSingle: 2400, passmarkMulti: 10100, cinebenchR23: 6700 },
  { model: 'Ryzen 5 3400G', passmarkSingle: 2200, passmarkMulti: 8700, cinebenchR23: 5600 },
  // AMD Zen 3
  { model: 'Ryzen 5 4500', passmarkSingle: 2500, passmarkMulti: 14200, cinebenchR23: 9200 },
  { model: 'Ryzen 5 5500', passmarkSingle: 2800, passmarkMulti: 18500, cinebenchR23: 11200 },
  { model: 'Ryzen 5 5600', passmarkSingle: 3100, passmarkMulti: 21000, cinebenchR23: 13000 },
  { model: 'Ryzen 5 5600X', passmarkSingle: 3250, passmarkMulti: 22000, cinebenchR23: 13800 },
  { model: 'Ryzen 5 3600', passmarkSingle: 2600, passmarkMulti: 17800, cinebenchR23: 10500 },
  { model: 'Ryzen 7 5700X', passmarkSingle: 3200, passmarkMulti: 25000, cinebenchR23: 15500 },
  { model: 'Ryzen 7 5800X', passmarkSingle: 3400, passmarkMulti: 27000, cinebenchR23: 16800 },
  { model: 'Ryzen 9 5900X', passmarkSingle: 3450, passmarkMulti: 38000, cinebenchR23: 24000 },
  { model: 'Ryzen 9 5950X', passmarkSingle: 3500, passmarkMulti: 46000, cinebenchR23: 29000 },
  // AMD Zen 4
  { model: 'Ryzen 5 7600', passmarkSingle: 3800, passmarkMulti: 24500, cinebenchR23: 18200 },
  { model: 'Ryzen 5 7500F', passmarkSingle: 3700, passmarkMulti: 23000, cinebenchR23: 17500 },
  { model: 'Ryzen 7 7700', passmarkSingle: 3900, passmarkMulti: 30000, cinebenchR23: 19800 },
  { model: 'Ryzen 7 7700X', passmarkSingle: 4100, passmarkMulti: 32000, cinebenchR23: 21000 },
  { model: 'Ryzen 7 7800X3D', passmarkSingle: 3850, passmarkMulti: 31000, cinebenchR23: 20500 },
  { model: 'Ryzen 9 7900', passmarkSingle: 4000, passmarkMulti: 41000, cinebenchR23: 29000 },
  { model: 'Ryzen 9 7950X', passmarkSingle: 4200, passmarkMulti: 52000, cinebenchR23: 38000 },
  // AMD Zen 5 / Ryzen 9000 series (2024-2025)
  { model: 'Ryzen 5 9600', passmarkSingle: 3300, passmarkMulti: 23000, cinebenchR23: 17000 },
  { model: 'Ryzen 5 9600X', passmarkSingle: 3550, passmarkMulti: 24500, cinebenchR23: 18200 },
  { model: 'Ryzen 7 9700X', passmarkSingle: 3850, passmarkMulti: 32000, cinebenchR23: 21000 },
  { model: 'Ryzen 7 9800X3D', passmarkSingle: 3900, passmarkMulti: 31000, cinebenchR23: 21500 },
  { model: 'Ryzen 7 9850X3D', passmarkSingle: 4000, passmarkMulti: 32500, cinebenchR23: 22500 },
  { model: 'Ryzen 9 9900X', passmarkSingle: 4050, passmarkMulti: 45000, cinebenchR23: 33000 },
  { model: 'Ryzen 9 9900X3D', passmarkSingle: 4100, passmarkMulti: 44000, cinebenchR23: 33500 },
  { model: 'Ryzen 9 9950X', passmarkSingle: 4150, passmarkMulti: 54000, cinebenchR23: 42000 },
  { model: 'Ryzen 9 9950X3D', passmarkSingle: 4200, passmarkMulti: 53000, cinebenchR23: 41500 },
  // Intel 10th-12th Gen
  { model: 'i3-10100', passmarkSingle: 2450, passmarkMulti: 10600, cinebenchR23: 6400 },
  { model: 'i3-12100', passmarkSingle: 3300, passmarkMulti: 14000, cinebenchR23: 12500 },
  { model: 'i5-10400', passmarkSingle: 2500, passmarkMulti: 13500, cinebenchR23: 8100 },
  { model: 'i5-11400', passmarkSingle: 2800, passmarkMulti: 15500, cinebenchR23: 10500 },
  { model: 'i5-12400', passmarkSingle: 3400, passmarkMulti: 18000, cinebenchR23: 14800 },
  { model: 'i5-12600K', passmarkSingle: 3800, passmarkMulti: 22000, cinebenchR23: 17800 },
  // Intel 13th-14th Gen
  { model: 'i5-13400', passmarkSingle: 3700, passmarkMulti: 23000, cinebenchR23: 18000 },
  { model: 'i5-13600K', passmarkSingle: 4100, passmarkMulti: 28000, cinebenchR23: 23000 },
  { model: 'i5-14400', passmarkSingle: 3750, passmarkMulti: 24000, cinebenchR23: 19000 },
  { model: 'i5-14600K', passmarkSingle: 4150, passmarkMulti: 29000, cinebenchR23: 24000 },
  { model: 'i7-10700', passmarkSingle: 2700, passmarkMulti: 17500, cinebenchR23: 10800 },
  { model: 'i7-11700', passmarkSingle: 3000, passmarkMulti: 19500, cinebenchR23: 13000 },
  { model: 'i7-12700', passmarkSingle: 3700, passmarkMulti: 26000, cinebenchR23: 20500 },
  { model: 'i7-12700K', passmarkSingle: 3900, passmarkMulti: 28000, cinebenchR23: 22000 },
  { model: 'i7-13700', passmarkSingle: 4000, passmarkMulti: 31000, cinebenchR23: 26000 },
  { model: 'i7-13700K', passmarkSingle: 4200, passmarkMulti: 34000, cinebenchR23: 29000 },
  { model: 'i7-14700', passmarkSingle: 4050, passmarkMulti: 33000, cinebenchR23: 27500 },
  { model: 'i7-14700K', passmarkSingle: 4250, passmarkMulti: 37000, cinebenchR23: 32000 },
  { model: 'i9-11900K', passmarkSingle: 3300, passmarkMulti: 21000, cinebenchR23: 16000 },
  { model: 'i9-12900K', passmarkSingle: 4000, passmarkMulti: 32000, cinebenchR23: 26000 },
  { model: 'i9-13900K', passmarkSingle: 4400, passmarkMulti: 40000, cinebenchR23: 36000 },
  { model: 'i9-14900K', passmarkSingle: 4500, passmarkMulti: 42000, cinebenchR23: 38000 },
  // Intel Arrow Lake / Core Ultra 200S (LGA1851 — 2024-2025)
  { model: 'Core Ultra 5 225F', passmarkSingle: 3500, passmarkMulti: 18000, cinebenchR23: 14500 },
  { model: 'Core Ultra 5 225', passmarkSingle: 3550, passmarkMulti: 18500, cinebenchR23: 15000 },
  { model: 'Core Ultra 5 235', passmarkSingle: 3650, passmarkMulti: 20000, cinebenchR23: 16000 },
  { model: 'Core Ultra 5 245', passmarkSingle: 3750, passmarkMulti: 21000, cinebenchR23: 17000 },
  { model: 'Core Ultra 5 245K', passmarkSingle: 3950, passmarkMulti: 23000, cinebenchR23: 19000 },
  { model: 'Core Ultra 5 245KF', passmarkSingle: 3950, passmarkMulti: 23000, cinebenchR23: 19000 },
  { model: 'Core Ultra 7 265', passmarkSingle: 4000, passmarkMulti: 27000, cinebenchR23: 21000 },
  { model: 'Core Ultra 7 265F', passmarkSingle: 4000, passmarkMulti: 27000, cinebenchR23: 21000 },
  { model: 'Core Ultra 7 265K', passmarkSingle: 4200, passmarkMulti: 29000, cinebenchR23: 23500 },
  { model: 'Core Ultra 7 265KF', passmarkSingle: 4200, passmarkMulti: 29000, cinebenchR23: 23500 },
  { model: 'Core Ultra 9 285', passmarkSingle: 4300, passmarkMulti: 32000, cinebenchR23: 26000 },
  { model: 'Core Ultra 9 285K', passmarkSingle: 4500, passmarkMulti: 36000, cinebenchR23: 31000 },
];

const RAM_IMPACTS: RamImpact[] = [
  { speed: 'DDR4-2133', gamingFpsMultiplier: 0.88, productivityMultiplier: 0.85 },
  { speed: 'DDR4-2400', gamingFpsMultiplier: 0.92, productivityMultiplier: 0.9 },
  { speed: 'DDR4-2666', gamingFpsMultiplier: 0.95, productivityMultiplier: 0.93 },
  { speed: 'DDR4-2933', gamingFpsMultiplier: 0.97, productivityMultiplier: 0.95 },
  { speed: 'DDR4-3200', gamingFpsMultiplier: 1.0, productivityMultiplier: 1.0 },
  { speed: 'DDR4-3600', gamingFpsMultiplier: 1.03, productivityMultiplier: 1.03 },
  { speed: 'DDR4-4000', gamingFpsMultiplier: 1.04, productivityMultiplier: 1.06 },
  { speed: 'DDR5-4800', gamingFpsMultiplier: 1.02, productivityMultiplier: 1.05 },
  { speed: 'DDR5-5200', gamingFpsMultiplier: 1.05, productivityMultiplier: 1.1 },
  { speed: 'DDR5-5600', gamingFpsMultiplier: 1.08, productivityMultiplier: 1.14 },
  { speed: 'DDR5-6000', gamingFpsMultiplier: 1.12, productivityMultiplier: 1.18 },
  { speed: 'DDR5-6400', gamingFpsMultiplier: 1.14, productivityMultiplier: 1.22 },
  { speed: 'DDR5-6800', gamingFpsMultiplier: 1.16, productivityMultiplier: 1.25 },
  { speed: 'DDR5-7200', gamingFpsMultiplier: 1.17, productivityMultiplier: 1.27 },
  { speed: 'DDR5-7600', gamingFpsMultiplier: 1.18, productivityMultiplier: 1.28 },
];

export function findGpuBenchmark(gpuName: string): GpuBenchmark | null {
  const upper = gpuName.toUpperCase();
  for (const b of GPU_BENCHMARKS) {
    if (upper.includes(b.model.toUpperCase())) return b;
  }
  return null;
}

export function findCpuBenchmark(cpuName: string): CpuBenchmark | null {
  const upper = cpuName.toUpperCase();
  for (const b of CPU_BENCHMARKS) {
    if (upper.includes(b.model.toUpperCase())) return b;
  }
  return null;
}

export function findRamImpact(ramName: string): RamImpact | null {
  const upper = ramName.toUpperCase();
  for (const r of RAM_IMPACTS) {
    if (upper.includes(r.speed.toUpperCase().replace('-', ' ')) || upper.includes(r.speed.toUpperCase())) return r;
  }
  return null;
}

export function estimateFpsFromPrice(gpuPrice: number): { aaa: string; esports: string } {
  if (gpuPrice < 3000000) return { aaa: '30-45', esports: '100-144' };
  if (gpuPrice < 6000000) return { aaa: '60-80', esports: '144-200' };
  if (gpuPrice < 12000000) return { aaa: '70-90', esports: '200-300' };
  return { aaa: '100+', esports: '300+' };
}

function getResolutionFps(gpuBench: GpuBenchmark, resolution: string): number {
  if (resolution === '4K') return gpuBench.fps4k;
  if (resolution === '1440p') return gpuBench.fps1440p;
  return gpuBench.fps1080p;
}

type ResolutionThresholds = {
  cpuSevere: number;
  cpuModerate: number;
  cpuMinor: number;
  minorGpu: number;
  moderateGpu: number;
  severeGpu: number;
};

const RESOLUTION_THRESHOLDS: Record<string, ResolutionThresholds> = {
  '1080p': { cpuSevere: 0.15, cpuModerate: 0.20, cpuMinor: 0.25, minorGpu: 0.70, moderateGpu: 1.00, severeGpu: 1.50 },
  '1440p': { cpuSevere: 0.12, cpuModerate: 0.17, cpuMinor: 0.22, minorGpu: 0.85, moderateGpu: 1.20, severeGpu: 1.80 },
  '4K': { cpuSevere: 0.10, cpuModerate: 0.14, cpuMinor: 0.18, minorGpu: 1.20, moderateGpu: 1.80, severeGpu: 2.50 },
};

function getTargetBalanceRatio(resolution: string): number {
  if (resolution === '4K') return 0.70;
  if (resolution === '1440p') return 0.50;
  return 0.40;
}

export function analyzeBottleneck(
  cpuBench: CpuBenchmark | null,
  gpuBench: GpuBenchmark | null,
  resolution: string = '1080p',
): {
  status: string;
  bottleneckType: 'CPU' | 'GPU' | 'Balanced';
  severity: 'None' | 'Minor' | 'Moderate' | 'Severe';
} {
  if (!cpuBench || !gpuBench) {
    return {
      status: 'Tidak dapat dianalisis (data benchmark tidak lengkap)',
      bottleneckType: 'Balanced',
      severity: 'None',
    };
  }

  const gpuFps = getResolutionFps(gpuBench, resolution);
  if (gpuFps <= 0) {
    return {
      status: 'GPU tidak mendukung resolusi ini',
      bottleneckType: 'Balanced',
      severity: 'None',
    };
  }

  const ratio = cpuBench.passmarkSingle / (gpuFps * 100);
  const t = RESOLUTION_THRESHOLDS[resolution] || RESOLUTION_THRESHOLDS['1080p'];

  if (ratio < t.cpuSevere) {
    return { status: 'CPU Bottleneck: CPU terlalu lemah untuk GPU ini', bottleneckType: 'CPU', severity: 'Severe' };
  }
  if (ratio < t.cpuModerate) {
    return { status: 'CPU Bottleneck: CPU mulai membatasi performa GPU', bottleneckType: 'CPU', severity: 'Moderate' };
  }
  if (ratio < t.cpuMinor) {
    return { status: 'Minor CPU Bottleneck: Masih cukup seimbang', bottleneckType: 'CPU', severity: 'Minor' };
  }
  if (ratio > t.severeGpu) {
    return { status: 'GPU Bottleneck: GPU terlalu lemah untuk CPU ini', bottleneckType: 'GPU', severity: 'Severe' };
  }
  if (ratio > t.moderateGpu) {
    return {
      status: 'GPU Bottleneck: GPU kurang bertenaga, upgrade GPU disarankan',
      bottleneckType: 'GPU',
      severity: 'Moderate',
    };
  }
  if (ratio > t.minorGpu) {
    return { status: 'Minor GPU Bottleneck: GPU sedikit kurang bertenaga', bottleneckType: 'GPU', severity: 'Minor' };
  }
  return { status: 'Sangat Seimbang — CPU dan GPU cocok', bottleneckType: 'Balanced', severity: 'None' };
}

/**
 * Finds a balanced CPU/GPU pair when a bottleneck is detected.
 * Returns the model name to upgrade to, or null if no fix found.
 */
export function findBalancedUpgrade(
  cpuBench: CpuBenchmark | null,
  gpuBench: GpuBenchmark | null,
  resolution: string = '1080p',
): { model: string; type: 'CPU' | 'GPU'; targetScore?: number; targetFps?: number } | null {
  if (!cpuBench || !gpuBench) return null;

  const gpuFps = getResolutionFps(gpuBench, resolution);
  if (gpuFps <= 0) return null;

  const ratio = cpuBench.passmarkSingle / (gpuFps * 100);
  const t = RESOLUTION_THRESHOLDS[resolution] || RESOLUTION_THRESHOLDS['1080p'];

  if (ratio >= t.cpuMinor && ratio <= t.minorGpu) return null;

  const targetRatio = getTargetBalanceRatio(resolution);

  if (ratio < t.cpuMinor) {
    const target = targetRatio * gpuFps * 100;
    const match = CPU_BENCHMARKS.filter(
      (c) => c.passmarkSingle >= target && c.passmarkSingle > cpuBench.passmarkSingle,
    ).sort((a, b) => a.passmarkSingle - b.passmarkSingle)[0];
    if (match) return { model: match.model, type: 'CPU', targetScore: match.passmarkSingle };
  } else {
    const target = cpuBench.passmarkSingle / (targetRatio * 100);
    const match = GPU_BENCHMARKS.filter((g) => {
      const fps = getResolutionFps(g, resolution);
      return fps >= target && fps > gpuFps;
    }).sort((a, b) => getResolutionFps(a, resolution) - getResolutionFps(b, resolution))[0];
    if (match) {
      const fps = getResolutionFps(match, resolution);
      return { model: match.model, type: 'GPU', targetFps: Math.round(fps) };
    }
  }

  return null;
}

export function suggestBottleneckFix(
  cpuBench: CpuBenchmark | null,
  gpuBench: GpuBenchmark | null,
  resolution: string = '1080p',
): { type: 'CPU' | 'GPU'; suggestions: { model: string; passmarkSingle?: number; avgFps?: number }[] } | null {
  if (!cpuBench || !gpuBench) return null;

  const gpuFps = getResolutionFps(gpuBench, resolution);
  if (gpuFps <= 0) return null;

  const ratio = cpuBench.passmarkSingle / (gpuFps * 100);
  const t = RESOLUTION_THRESHOLDS[resolution] || RESOLUTION_THRESHOLDS['1080p'];

  if (ratio >= t.cpuMinor && ratio <= t.minorGpu) return null;

  const targetRatio = getTargetBalanceRatio(resolution);

  if (ratio < t.cpuMinor) {
    const targetCpuScore = targetRatio * gpuFps * 100;
    const suitable = CPU_BENCHMARKS.filter(
      (c) => c.passmarkSingle >= targetCpuScore && c.passmarkSingle > cpuBench.passmarkSingle,
    )
      .sort((a, b) => a.passmarkSingle - b.passmarkSingle)
      .slice(0, 3)
      .map((c) => ({ model: c.model, passmarkSingle: c.passmarkSingle }));
    return { type: 'CPU', suggestions: suitable };
  }

  if (ratio > t.minorGpu) {
    const targetGpuFps = cpuBench.passmarkSingle / (targetRatio * 100);
    const suitable = GPU_BENCHMARKS.filter((g) => {
      const fps = getResolutionFps(g, resolution);
      return fps >= targetGpuFps && fps > gpuFps;
    })
      .sort((a, b) => getResolutionFps(a, resolution) - getResolutionFps(b, resolution))
      .slice(0, 3)
      .map((g) => {
        const fps = getResolutionFps(g, resolution);
        return { model: g.model, avgFps: Math.round(fps) };
      });
    return { type: 'GPU', suggestions: suitable };
  }

  return null;
}

export function calculateFpsUplift(
  currentGpuName: string,
  suggestedGpuName: string,
  resolution: string,
): { currentFps: number; newFps: number; upliftPercent: number } | null {
  const current = findGpuBenchmark(currentGpuName);
  const suggested = findGpuBenchmark(suggestedGpuName);

  if (!current || !suggested) return null;

  const getFps = (b: GpuBenchmark) => {
    if (resolution === '4K') return b.fps4k;
    if (resolution === '1440p') return b.fps1440p;
    return b.fps1080p;
  };

  const currentFps = getFps(current);
  const newFps = getFps(suggested);
  const upliftPercent = Math.round(((newFps - currentFps) / currentFps) * 100);

  return { currentFps, newFps, upliftPercent };
}

export function getCpuScoreMultiplier(cpuScore: number, gpuBench: GpuBenchmark, resolution: string = '1080p'): number {
  const gpuFps = getResolutionFps(gpuBench, resolution);
  if (gpuFps <= 0) return 1.0;
  const targetRatio = getTargetBalanceRatio(resolution);
  const targetCpuScore = targetRatio * gpuFps * 100;
  if (cpuScore >= targetCpuScore) return 1.0;
  return cpuScore / targetCpuScore;
}

export function estimateCpuFpsImpact(
  currentCpuName: string,
  suggestedCpuName: string,
  gpuName: string,
  resolution: string,
): { currentFps: number; newFps: number; upliftPercent: number } | null {
  const currentCpu = findCpuBenchmark(currentCpuName);
  const suggestedCpu = findCpuBenchmark(suggestedCpuName);
  const gpuBench = findGpuBenchmark(gpuName);

  if (!currentCpu || !suggestedCpu || !gpuBench) return null;

  const res = resolution || '1080p';
  const baseFps = getResolutionFps(gpuBench, res);
  if (baseFps <= 0) return null;

  const targetRatio = getTargetBalanceRatio(res);
  const targetScore = targetRatio * baseFps * 100;

  const currentMultiplier = Math.min(1, currentCpu.passmarkSingle / targetScore);
  const suggestedMultiplier = Math.min(1, suggestedCpu.passmarkSingle / targetScore);

  const currentFps = Math.round(baseFps * currentMultiplier);
  const newFps = Math.round(baseFps * suggestedMultiplier);
  const upliftPercent = Math.round(((newFps - currentFps) / currentFps) * 100);

  return { currentFps, newFps, upliftPercent };
}

export function scoreComponent(
  component: {
    price: number;
    name: string;
    brand?: string | null;
    tdp?: number | null;
    socket?: string | null;
    ramType?: string | null;
  },
  budget: number,
  compatibility: number,
  performanceScore: number = 0.4,
  benchmarkPerPrice?: number,
): {
  totalScore: number;
  compatibilityScore: number;
  performanceScore: number;
  valueScore: number;
  reliabilityScore: number;
} {
  const compatibilityScore = compatibility;

  const valueScore = benchmarkPerPrice !== undefined ? Math.min(benchmarkPerPrice / 0.001, 1) : 0.5;

  const premiumBrands = ['ASUS', 'MSI', 'GIGABYTE', 'SAMSUNG', 'CORSAIR', 'EVGA', 'SEASONIC', 'NZXT', 'COOLER MASTER'];
  const brand = (component.brand || '').toUpperCase();
  const isPremium = premiumBrands.some((pb) => brand.includes(pb));
  const reliabilityScore = isPremium ? 1 : 0.7;

  const totalScore = compatibilityScore * 0.3 + performanceScore * 0.4 + valueScore * 0.2 + reliabilityScore * 0.1;

  return {
    totalScore,
    compatibilityScore,
    performanceScore,
    valueScore,
    reliabilityScore,
  };
}
