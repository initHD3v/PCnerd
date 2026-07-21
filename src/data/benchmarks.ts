// Real FPS data compiled from TechPowerUp, Guru3D, and hardware review aggregates.
// Data represents average FPS across popular titles at given resolution, high/ultra settings.

export interface GpuBenchmark {
  model: string;       // GPU model identifier (substring-matched against component name)
  fps1080p: number;    // Average AAA FPS at 1080p High
  fps1440p: number;    // Average AAA FPS at 1440p High  
  fps4k: number;       // Average AAA FPS at 4K Medium/High
  fpsEsports: number;  // Average E-Sports FPS at 1080p Low/Competitive
}

const BENCHMARKS: GpuBenchmark[] = [
  // --- NVIDIA ---
  { model: 'GT 730',     fps1080p: 18,  fps1440p: 10,  fps4k: 0,   fpsEsports: 45 },
  { model: 'GT 1030',    fps1080p: 25,  fps1440p: 15,  fps4k: 0,   fpsEsports: 60 },
  { model: 'GTX 1050 Ti',fps1080p: 45,  fps1440p: 28,  fps4k: 12,  fpsEsports: 120 },
  { model: 'GTX 1650',   fps1080p: 52,  fps1440p: 34,  fps4k: 15,  fpsEsports: 140 },
  { model: 'GTX 1660 Super',fps1080p: 70, fps1440p: 48, fps4k: 22, fpsEsports: 180 },
  { model: 'RTX 3050',   fps1080p: 68,  fps1440p: 45,  fps4k: 20,  fpsEsports: 170 },
  { model: 'RTX 3060',   fps1080p: 85,  fps1440p: 58,  fps4k: 28,  fpsEsports: 200 },
  { model: 'RTX 3060 Ti',fps1080p: 95,  fps1440p: 68,  fps4k: 35,  fpsEsports: 220 },
  { model: 'RTX 4060',   fps1080p: 92,  fps1440p: 65,  fps4k: 32,  fpsEsports: 210 },
  { model: 'RTX 4060 Ti',fps1080p: 105, fps1440p: 75,  fps4k: 40,  fpsEsports: 240 },
  { model: 'RTX 4070',   fps1080p: 120, fps1440p: 88,  fps4k: 48,  fpsEsports: 280 },
  { model: 'RTX 4070 Super',fps1080p: 135, fps1440p: 100, fps4k: 55, fpsEsports: 300 },
  { model: 'RTX 4070 Ti Super',fps1080p: 145, fps1440p: 110, fps4k: 62, fpsEsports: 320 },
  { model: 'RTX 4080 Super',fps1080p: 170, fps1440p: 130, fps4k: 75, fpsEsports: 360 },
  { model: 'RTX 4090',   fps1080p: 200, fps1440p: 160, fps4k: 95,  fpsEsports: 400 },

  // --- AMD ---
  { model: 'RX 580',    fps1080p: 50,  fps1440p: 32,  fps4k: 14,  fpsEsports: 130 },
  { model: 'RX 6600',   fps1080p: 78,  fps1440p: 52,  fps4k: 24,  fpsEsports: 190 },
  { model: 'RX 6600 XT',fps1080p: 88,  fps1440p: 60,  fps4k: 30,  fpsEsports: 210 },
  { model: 'RX 7600',   fps1080p: 90,  fps1440p: 62,  fps4k: 30,  fpsEsports: 205 },
  { model: 'RX 7700 XT',fps1080p: 110, fps1440p: 78,  fps4k: 42,  fpsEsports: 250 },
  { model: 'RX 7800 XT',fps1080p: 125, fps1440p: 92,  fps4k: 50,  fpsEsports: 280 },
  { model: 'RX 7900 GRE',fps1080p: 130, fps1440p: 95,  fps4k: 52,  fpsEsports: 290 },
  { model: 'RX 7900 XT',fps1080p: 150, fps1440p: 115, fps4k: 65,  fpsEsports: 330 },
  { model: 'RX 7900 XTX',fps1080p: 170, fps1440p: 132, fps4k: 78,  fpsEsports: 370 },
];

export function findGpuBenchmark(gpuName: string): GpuBenchmark | null {
  const upper = gpuName.toUpperCase();
  for (const b of BENCHMARKS) {
    if (upper.includes(b.model.toUpperCase())) return b;
  }
  return null;
}

export function estimateFpsFromPrice(gpuPrice: number): { aaa: string; esports: string } {
  if (gpuPrice < 3000000) return { aaa: '30-45', esports: '100-144' };
  if (gpuPrice < 6000000) return { aaa: '60-80', esports: '144-200' };
  if (gpuPrice < 12000000) return { aaa: '70-90', esports: '200-300' };
  return { aaa: '100+', esports: '300+' };
}
