import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';

const SYSTEM_PROMPT = `Kamu adalah asisten AI untuk aplikasi PC Builder bernama PCnerd. 
Tugasmu adalah menganalisis racikan komponen PC dan memberikan narasi yang informatif, jujur, dan kontekstual.

Panduan:
- Analisis keseimbangan build: apakah GPU dan CPU seimbang?
- Apakah PSU cukup untuk total TDP? 
- Apakah RAM cocok dengan motherboard?
- Berikan saran realistis jika ada kelemahan.
- Gunakan bahasa Indonesia yang natural.
- Jangan selalu positif — kritik yang membangun lebih berharga.
- Jawab dalam format JSON: { "general": "string", "detailed": { "CPU": "string", "GPU": "string", "MOTHERBOARD": "string", "RAM": "string", "STORAGE": "string", "PSU": "string", "CASE": "string", "COOLER": "string" }, "weaknesses": ["string"], "strengths": ["string"] }`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { build, budget, purpose, resolution } = body;

    const componentsText = Object.entries(build || {})
      .map(([type, part]: [string, any]) => {
        if (!part) return `${type}: (none)`;
        return `${type}: ${part.name} (Rp ${part.price?.toLocaleString('id-ID')})`;
      })
      .join('\n');

    const userPrompt = `Racikan PC dengan budget Rp ${budget?.toLocaleString('id-ID')} untuk ${purpose || 'Gaming'} di resolusi ${resolution || '1080p'}.

Komponen:
${componentsText}

Berikan analisis yang jujur dan konstruktif.`;

    const result = await callLLM(SYSTEM_PROMPT, userPrompt);

    if (!result) {
      return NextResponse.json({ error: 'LLM tidak tersedia' }, { status: 503 });
    }

    try {
      const parsed = JSON.parse(result);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ general: result, detailed: {}, weaknesses: [], strengths: [] });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
