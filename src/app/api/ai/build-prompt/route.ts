import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { generateTieredBuilds } from '@/lib/build-service';
import type { BuildPurpose, Resolution, Platform } from '@/lib/recommendation-engine';

function parseBudget(text: string): number | null {
  function parseNumber(raw: string): number {
    const dotCount = (raw.match(/\./g) || []).length;
    const commaCount = (raw.match(/,/g) || []).length;
    if (dotCount >= 2) {
      return parseFloat(raw.replace(/\./g, '').replace(/,/, '.'));
    }
    if (dotCount === 1) {
      const afterDot = raw.split('.')[1];
      if (afterDot && afterDot.length <= 2) return parseFloat(raw);
      return parseFloat(raw.replace('.', ''));
    }
    if (commaCount === 1) return parseFloat(raw.replace(/,/, '.'));
    return parseFloat(raw);
  }

  const patterns: RegExp[] = [
    /(?:budget|anggaran|dana|modal)\s*(?:sekitar|:)?\s*(?:Rp|IDR)?\s*\.?\s*(\d[\d,.]*)\s*(jt|juta|ribu|rb|k)?(?:\s|$)/i,
    /(?:Rp|IDR)\s*\.?\s*(\d[\d,.]*)\s*(jt|juta|ribu|rb|k)?(?:\s|$)/i,
    /(\d[\d,.]*)\s*(jt|juta)(?:\s|$)/i,
    /(\d{6,})(?:\s|$)/,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      let val = parseNumber(m[1]);
      const suffix = (m[2] || '').toLowerCase();
      if (suffix === 'jt' || suffix === 'juta') val *= 1_000_000;
      else if (suffix === 'k' || suffix === 'ribu' || suffix === 'rb') val *= 1_000;
      else if (val < 1_000_000) continue;
      if (val >= 1_000_000 && val <= 500_000_000) return Math.round(val);
    }
  }
  return null;
}

function parsePurpose(text: string): BuildPurpose {
  const lower = text.toLowerCase();
  if (/edit|video|render|content|adobe|premiere|after effect|3d|grafis/i.test(lower)) return 'Editing';
  if (/stream|broadcast|live|obs|twitch|youtube/i.test(lower)) return 'Streaming';
  if (/code|coding|program|dev|compil|fullstack|frontend|backend/i.test(lower)) return 'Coding';
  if (/render|3d|blender|maya|cad|solidworks|animasi/i.test(lower)) return 'Rendering';
  if (/office|kantor|work|word|excel|browsing|umum|rumah|daily|sehari/i.test(lower)) return 'Office';
  return 'Gaming';
}

function parseResolution(text: string): Resolution {
  const lower = text.toLowerCase();
  if (/4k|ultra hd|2160p/i.test(lower)) return '4K';
  if (/1440p|2k|qhd|wqhd/i.test(lower)) return '1440p';
  return '1080p';
}

function parsePlatform(text: string): Platform {
  const lower = text.toLowerCase();
  if (/intel|core i/i.test(lower)) return 'intel';
  if (/amd|ryzen/i.test(lower)) return 'amd';
  return 'default';
}

function parseIncludePeripheral(text: string): boolean {
  const lower = text.toLowerCase();
  if (/monitor|keyboard|mouse|speaker|headset|peripheral|lengkap/i.test(lower)) return true;
  return false;
}

function estimateBudget(purpose: BuildPurpose, resolution: Resolution, text: string): number {
  const lower = text.toLowerCase();

  // Detect target FPS
  const fpsMatch = lower.match(/(\d+)\s*fps/i);
  const targetFps = fpsMatch ? parseInt(fpsMatch[1]) : 0;

  // Base budget by purpose
  const base: Record<string, number> = {
    Gaming: 10_000_000,
    Editing: 15_000_000,
    Rendering: 20_000_000,
    Streaming: 12_000_000,
    Coding: 8_000_000,
    Office: 5_000_000,
  };
  let budget = base[purpose] || 10_000_000;

  // Resolution multiplier
  if (resolution === '4K') budget *= 2.0;
  else if (resolution === '1440p') budget *= 1.4;

  // FPS target multiplier
  if (targetFps >= 120) budget *= 1.5;
  else if (targetFps >= 100) budget *= 1.3;
  else if (targetFps >= 60) budget *= 1.0;
  else if (targetFps > 0) budget *= 0.8;

  // Multi-purpose build (e.g. gaming + editing + rendering)
  const purposeCount = ['gaming', 'edit', 'render', 'stream', 'code'].filter((w) => lower.includes(w)).length;
  if (purposeCount >= 3) budget *= 1.4;
  else if (purposeCount >= 2) budget *= 1.2;

  // Specific hardware requests
  if (/rtx 4090|rtx 5090|ryzen 9|core i9|threadripper/i.test(lower)) budget = Math.max(budget, 40_000_000);
  else if (/rtx 4080|rtx 5080|rx 7900|ryzen 7|core i7/i.test(lower)) budget = Math.max(budget, 25_000_000);
  else if (/rtx 4070|rtx 5070|rx 7800/i.test(lower)) budget = Math.max(budget, 18_000_000);

  return Math.round(Math.max(budget, 5_000_000));
}

const PROMPT_SYSTEM = `You are a PC builder AI that extracts build requirements from natural language.
Respond ONLY with a valid JSON object (no markdown, no code fences).

Extract these fields from the user's request:
- budget: number in IDR. If user does NOT mention a specific budget, estimate a reasonable one based on their requirements (resolution, FPS target, purpose, requested hardware).
- purpose: "Gaming" | "Editing" | "Office" | "Streaming" | "Coding" | "Rendering"
- resolution: "1080p" | "1440p" | "4K" (default to "1080p" if not mentioned)
- platform: "intel" | "amd" | "default"
- includePeripheral: boolean (true if they want monitor/keyboard/mouse)

Budget estimation guidelines:
- Gaming 1080p: Rp 8-15 juta
- Gaming 1440p: Rp 15-25 juta  
- Gaming 4K: Rp 25-50 juta
- Video Editing: Rp 15-30 juta
- 3D Rendering: Rp 20-50 juta
- Multi-purpose (gaming + editing + render): higher end of range
- Adjust up for high FPS targets (100+ FPS requires more budget)

If the request includes a specific GPU or CPU model, include it in a "preferredGpu" or "preferredCpu" field.

Examples:
{"budget":15000000,"purpose":"Gaming","resolution":"1080p","platform":"default","includePeripheral":false}
{"budget":5000000,"purpose":"Office","resolution":"1080p","platform":"default","includePeripheral":true,"preferredCpu":"AMD Ryzen 5"}
{"budget":30000000,"purpose":"Editing","resolution":"1440p","platform":"intel","includePeripheral":false}
{"budget":35000000,"purpose":"Gaming","resolution":"1440p","platform":"amd","includePeripheral":false,"preferredGpu":"RTX 4070"}`;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let extracted: {
      budget: number;
      purpose: BuildPurpose;
      resolution: Resolution;
      platform: Platform;
      includePeripheral: boolean;
    } | null = null;

    // Try LLM extraction
    const llmResult = await callLLM(PROMPT_SYSTEM, prompt);
    if (llmResult) {
      try {
        const cleaned = llmResult.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.purpose) {
          extracted = {
            budget: parsed.budget,
            purpose: parsed.purpose,
            resolution: parsed.resolution || '1080p',
            platform: parsed.platform || 'default',
            includePeripheral: !!parsed.includePeripheral,
          };
        }
      } catch {}
    }

    // If no LLM or LLM didn't return budget, try rule-based extraction
    if (!extracted || !extracted.budget) {
      const purpose = extracted?.purpose || parsePurpose(prompt);
      const resolution = extracted?.resolution || parseResolution(prompt);

      // First try to find explicit budget from user
      const explicitBudget = parseBudget(prompt);
      if (explicitBudget) {
        if (!extracted) {
          extracted = {
            budget: explicitBudget,
            purpose,
            resolution,
            platform: parsePlatform(prompt),
            includePeripheral: parseIncludePeripheral(prompt),
          };
        } else {
          extracted.budget = explicitBudget;
        }
      } else {
        // No budget mentioned — estimate automatically based on requirements
        const estimated = estimateBudget(purpose, resolution, prompt);
        if (!extracted) {
          extracted = {
            budget: estimated,
            purpose,
            resolution,
            platform: parsePlatform(prompt),
            includePeripheral: parseIncludePeripheral(prompt),
          };
        } else {
          extracted.budget = estimated;
        }
      }
    } else {
      // LLM returned a budget — validate it against purpose minimums
      const purpose = extracted.purpose;
      const resolution = extracted.resolution;
      const minReasonable = estimateBudget(purpose, resolution, prompt);
      if (extracted.budget < minReasonable * 0.4) {
        extracted.budget = minReasonable;
      }
    }

    const MIN_BUDGET: Record<string, number> = {
      Gaming: 8_000_000,
      Editing: 10_000_000,
      Rendering: 20_000_000,
      Streaming: 12_000_000,
      Coding: 7_000_000,
      Office: 4_500_000,
    };
    const minForPurpose = MIN_BUDGET[extracted!.purpose] || 4_500_000;
    if (extracted!.budget < minForPurpose) {
      extracted!.budget = minForPurpose;
    }

    const result = await generateTieredBuilds({ ...extracted!, text: prompt });

    return NextResponse.json({
      request: extracted!,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
