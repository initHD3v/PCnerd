import { NextRequest, NextResponse } from 'next/server';
import { callLLM, callLLMStream } from '@/lib/llm';
import { generateNarrative } from '@/lib/recommendation-engine';
import {
  findGpuBenchmark,
  findCpuBenchmark,
  findRamImpact,
  analyzeBottleneck,
  calculateFpsUplift,
} from '@/data/benchmarks';

const SYSTEM_PROMPT = `Kamu adalah ahli racik PC Indonesia yang jujur dan analitis.
Analisis build ini secara objektif dengan data konkret.
WAJIB sebutkan angka FPS spesifik (AAA dan E-Sports) di analisis GPU — gunakan data benchmark yang diberikan.
WAJIB sebutkan skor PassMark (Single & Multi) di analisis CPU jika tersedia.
Gunakan bahasa Indonesia natural, gaya bahasa tech reviewer.
Beri nilai value-for-money berdasarkan harga vs performa.
Jika ada bottleneck antara CPU dan GPU, sebutkan.
Strengths dan weaknesses harus spesifik dengan angka, bukan template generik.
Jawab dalam format JSON: { "general": "string", "detailed": { "CPU": "string", "GPU": "string", "MOTHERBOARD": "string", "RAM": "string", "STORAGE": "string", "PSU": "string", "CASE": "string", "COOLER": "string" }, "weaknesses": ["string"], "strengths": ["string"] }`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { build, budget, purpose, resolution, stream } = body;
    const res = resolution || '1080p';

    const componentsText = Object.entries(build || {})
      .map(([type, part]: [string, any]) => {
        if (!part) return `${type}: (none)`;
        return `${type}: ${part.name} (Rp ${Number.isFinite(part.price) ? part.price.toLocaleString('id-ID') : '0'})`;
      })
      .join('\n');

    const gpuBench = build?.GPU?.name ? findGpuBenchmark(build.GPU.name) : null;
    const cpuBench = build?.CPU?.name ? findCpuBenchmark(build.CPU.name) : null;
    const ramImpact = build?.RAM?.name ? findRamImpact(build.RAM.name) : null;

    let benchmarkText = '';
    if (gpuBench) {
      const fps = res === '4K' ? gpuBench.fps4k : res === '1440p' ? gpuBench.fps1440p : gpuBench.fps1080p;
      benchmarkText += `\nGPU ${build.GPU.name}: ${fps} FPS di ${res} (AAA), ${gpuBench.fpsEsports} FPS (E-Sports).`;
    }
    if (cpuBench) {
      benchmarkText += `\nCPU ${build.CPU.name}: PassMark Single=${cpuBench.passmarkSingle}, Multi=${cpuBench.passmarkMulti}.`;
    }
    if (ramImpact) {
      const ramDiff = Math.round((ramImpact.gamingFpsMultiplier - 1) * 100);
      benchmarkText += `\nRAM ${build.RAM.name}: ${ramImpact.gamingFpsMultiplier > 1 ? '+' : ''}${ramDiff}% gaming vs DDR4-3200.`;
    }

    if (cpuBench && gpuBench) {
      const bottleneck = analyzeBottleneck(cpuBench, gpuBench, res);
      benchmarkText += `\nBottleneck: ${bottleneck.status} (${bottleneck.severity}).`;
    }

    const userPrompt = `Racikan PC dengan budget Rp ${Number.isFinite(budget) ? budget.toLocaleString('id-ID') : '0'} untuk ${purpose || 'Gaming'} di resolusi ${res}.

Komponen:
${componentsText}
${benchmarkText}

Berikan analisis yang jujur dan konstruktif. Sebutkan angka FPS dan benchmark dalam analisismu.`;

    if (stream) {
      const gen = callLLMStream(SYSTEM_PROMPT, userPrompt);
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of gen) {
              controller.enqueue(encoder.encode(chunk));
            }
          } catch {
            const fallback = generateNarrative(build, {
              budget: budget || 0,
              purpose: purpose || 'Gaming',
              includePeripheral: false,
              resolution: res,
            });
            controller.enqueue(encoder.encode(JSON.stringify(fallback)));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const result = await callLLM(SYSTEM_PROMPT, userPrompt);

    if (!result) {
      const fallback = generateNarrative(build, {
        budget: budget || 0,
        purpose: purpose || 'Gaming',
        includePeripheral: false,
        resolution: res,
      });
      return NextResponse.json(fallback);
    }

    try {
      const parsed = JSON.parse(result);
      return NextResponse.json(parsed);
    } catch {
      const fallback = generateNarrative(build, {
        budget: budget || 0,
        purpose: purpose || 'Gaming',
        includePeripheral: false,
        resolution: res,
      });
      return NextResponse.json(fallback);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
