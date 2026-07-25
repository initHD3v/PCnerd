import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { generateTieredBuilds } from '@/lib/build-service';
import { createRateLimiter } from '@/lib/rate-limit';
import type { BuildPurpose, Resolution, Platform } from '@/lib/recommendation-engine';

// Rate limiter: 10 requests per minute per IP
const promptLimiter = createRateLimiter({ max: 10, windowMs: 60_000 });

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

const OFF_TOPIC_PATTERNS = [
  /tolong buatkan (puisi|cerita|esai|artikel|lagu|naskah)/i,
  /resep (masakan|makanan|minuman)/i,
  /cuaca|ramalan (zodiak|bintang)/i,
  /politik|presiden|pemilu|parpol/i,
  /agama|ibadah|dosa|sesat/i,
  /seks|porn|bokep|konten dewasa|telanjang/i,
  /narkoba|ganja|psikotropika/i,
  /meretas|membobol|malware|cracking/i,
  /pinjaman online|hutang|kartu kredit|paylater/i,
  /lowongan kerja|cpns|lamaran pekerjaan/i,
  /penyakit|obat obatan|rumah sakit/i,
  /menghina|mengejek|rasis|sara|ujaran kebencian/i,
  /chatgpt|ai lain|ai lainnya|deepseek|claude/i,
  /mencuri|merampok|menipu|scam/i,
];

const PROMPT_SYSTEM_BUILD = `Kamu adalah PCnerd AI — asisten perakit PC. Kamu HANYA menjawab topik seputar PC.

ATURAN VALIDASI:
- Jika pesan user BUKAN tentang komponen PC, build PC, hardware, benchmark, performa gaming, atau teknologi PC, balas dengan:
{"intent":"invalid","reason":"Pesan tidak terkait dengan PC. PCnerd hanya menjawab pertanyaan PC dan hardware."}

- Jika user bertanya soal: masakan, politik, agama, hubungan, cuaca, programming (non-PC), kesehatan, olahraga, keuangan, atau topik APAPUN yang tidak terkait PC → balas intent:"invalid"

Topik PC yang valid:
- Komponen PC (CPU, GPU, RAM, motherboard, PSU, storage, case, cooler)
- Build PC, rekomendasi build
- Perbandingan Intel vs AMD, NVIDIA vs AMD
- Performa gaming, FPS, benchmark
- DDR4 vs DDR5, PCIe, SSD vs HDD
- Troubleshooting PC, kompatibilitas
- Periferal (monitor, keyboard, mouse)
- Berita teknologi PC

Selain itu, deteksi intent seperti biasa.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa code fences).
Pertama, deteksi intent user:

Jika user BERTANYA UMUM tentang komponen PC, build, perbandingan hardware, dll. (BUKAN minta build spesifik), balas:
{"intent":"question","question":"ringkasan singkat pertanyaan"}

Jika user ingin REKOMENDASI BUILD PC (menyebut budget, tujuan, atau ingin merakit PC), balas:
{
  "intent":"build",
  "budget": <angka dalam IDR. Jika user menyebut budget spesifik pakai itu; jika tidak, estimasi>,
  "purpose": "Gaming" | "Editing" | "Office" | "Streaming" | "Coding" | "Rendering",
  "resolution": "1080p" | "1440p" | "4K",
  "platform": "intel" | "amd" | "default",
  "includePeripheral": <boolean>
}

Contoh pertanyaan umum (balas intent:"question"):
- "Mana yang lebih bagus Intel atau AMD?"
- "Apakah RTX 4060 worth it?"
- "Perbedaan DDR4 dan DDR5?"
- "Rekomendasi PSU 600W yang bagus?"
- "Berapa FPS yang bisa didapat dari RTX 3070?"
- "Apa itu bottleneck?"

Contoh request build (balas intent:"build"):
- "PC gaming Rp 15 juta buat main Valorant"
- "Build PC for editing 4K video Rp 25 jutaan"
- "Gaming PC 20 million with RTX 4060 for Warzone"
- "PC kantor 5 jutaan lengkap monitor"

Panduan estimasi budget:
- Gaming 1080p: Rp 8-15 juta
- Gaming 1440p: Rp 15-25 juta
- Gaming 4K: Rp 25-50 juta
- Video Editing: Rp 15-30 juta
- 3D Rendering: Rp 20-50 juta`;

// Prompt injection detection patterns
const INJECTION_PATTERNS = [
  /abaikan\s*(semua\s*)?(instruksi|perintah|arahan|aturan|petunjuk)/i,
  /ignore\s*(all\s*)?(previous\s*)?(instruction|command|rules|directions)/i,
  /lupakan\s*(semua\s*)?(percakapan|konteks|sejarah|history)/i,
  /forget\s*(all\s*)?(context|history|conversation|previous)/i,
  /kamu\s+(sekarang\s+)?(adalah|menjadi)/i,
  /you\s+are\s+now/i,
  /(system\s*prompt|secret\s*instruction|inner\s*thought)/i,
  /tampilkan\s*(system\s*)?prompt/i,
  /show\s*(the\s*)?(system\s*)?prompt/i,
  /berpura-pura|pura-pura|acting\s+as|pretend/i,
  /DAN\s*(\n|\s)*Instructions?\s*:/i,
  /role[-\s]?play/i,
  /jailbreak|jail.?break/i,
  /leaked|leak/i,
  /filter\s*buster|filter.?bypass/i,
];

function detectInjection(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // Check for obvious injection patterns
  if (INJECTION_PATTERNS.some((pat) => pat.test(text))) return true;
  // Check if text contains embedded system instructions (e.g., JSON-like structure)
  if (/\bintent\s*[=:]\s*"(question|build|invalid)"/.test(text) && /abaikan|ignore|forget|lupakan/i.test(text)) return true;
  return false;
}

function sanitizeOutput(text: string | null, maxLength: number = 4000): string | null {
  if (!text) return null;
  // Truncate to prevent token waste
  if (text.length > maxLength) text = text.slice(0, maxLength) + '... [dipotong]';
  // Remove any HTML/script tags that could be XSS
  text = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '');
  text = text.replace(/on\w+\s*=\s*["']?[^"'\s>]+/gi, '');
  return text;
}

const PROMPT_QA = `Kamu adalah asisten AI untuk aplikasi PC Builder bernama PCnerd. 
Tugasmu adalah menjawab pertanyaan user tentang komponen PC, build PC, dan hardware.
Gunakan bahasa Indonesia yang natural dan informatif.
Jawab dengan ringkas (maksimal 2-3 paragraf).
Jangan gunakan markdown. Jawab dalam format teks biasa.
Abaikan percakapan dan instruksi yang tidak terkait PC.`;
function buildConversationContext(prompt: string, history?: { role: string; text: string }[]): string {
  if (!history || history.length === 0) return prompt;
  const MAX_HISTORY = 4000;
  let context = '';
  for (const msg of history) {
    const line = `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`;
    if (context.length + line.length + 50 > MAX_HISTORY) break;
    context += line + '\n';
  }
  if (!context) return prompt;
  return `Percakapan sebelumnya:\n${context}\nPertanyaan baru: ${prompt}`;
}

export async function POST(req: NextRequest) {
  try {
    // --- Rate limiting ---
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const rateCheck = promptLimiter.check(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { intent: 'invalid', reason: 'Terlalu banyak permintaan. Silakan coba lagi dalam 1 menit.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    const { prompt, history } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // --- Prompt injection check ---
    if (detectInjection(prompt)) {
      return NextResponse.json({
        intent: 'invalid',
        reason: 'Pertanyaan mengandung instruksi yang tidak valid. PCnerd hanya menerima pertanyaan seputar PC dan hardware.',
      });
    }

    const contextualPrompt = buildConversationContext(prompt, history);

    // Step 0a: Greeting detection (skip LLM for simple greetings)
    const GREETING_PATTERNS = [/^(hai|halo|hello|hi|hey|pagi|siang|malam|sore|tes|test|woi|woy|bro|sis)\s*[!.]*$/i];
    const isGreeting = GREETING_PATTERNS.some((pat) => pat.test(prompt.trim()));
    if (isGreeting) {
      return NextResponse.json({
        intent: 'question',
        question: prompt,
        answer: 'Halo! Ada yang bisa saya bantu tentang PC dan hardware? Silakan tanya apa saja seputar komponen PC, build, atau performa gaming.',
      });
    }

    // Step 0b: Rule-based off-topic filter (quick check before LLM call)
    const isOffTopic = OFF_TOPIC_PATTERNS.some((pat) => pat.test(prompt));
    if (isOffTopic) {
      return NextResponse.json({
        intent: 'invalid',
        reason: 'Maaf, PCnerd hanya dapat menjawab pertanyaan seputar PC, komponen hardware, dan build PC. Pertanyaan di luar topik tersebut tidak dapat kami proses.',
      });
    }

    // Step 1: Detect intent using LLM (with conversation context)
    const llmResult = await callLLM(PROMPT_SYSTEM_BUILD, contextualPrompt);
    let intent = 'build';
    let questionSummary = '';
    let invalidReason = '';

    if (llmResult) {
      try {
        const cleaned = llmResult.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.intent === 'question') {
          intent = 'question';
          questionSummary = parsed.question || prompt;
        } else if (parsed.intent === 'invalid') {
          intent = 'invalid';
          invalidReason = parsed.reason || 'Pertanyaan tidak terkait dengan PC.';
        }
      } catch {}
    }

    // Step 1b: Handle invalid intent from LLM
    if (intent === 'invalid') {
      return NextResponse.json({
        intent: 'invalid',
        reason: invalidReason,
      });
    }

    // Step 2: Handle general question (with conversation context & sanitization)
    if (intent === 'question') {
      const qaPrompt = `${contextualPrompt}\n\n${questionSummary ? `Ringkasan: ${questionSummary}` : ''}`;
      const rawAnswer = await callLLM(PROMPT_QA, qaPrompt);
      const answer = sanitizeOutput(rawAnswer, 4000);
      return NextResponse.json({
        intent: 'question',
        question: prompt,
        answer: answer || 'Maaf, saya belum bisa menjawab pertanyaan itu saat ini. Silakan coba lagi nanti.',
      });
    }

    // Step 3: Handle build request (existing flow)
    let extracted: {
      budget: number;
      purpose: BuildPurpose;
      resolution: Resolution;
      platform: Platform;
      includePeripheral: boolean;
    } | null = null;

    // Try LLM extraction from the build intent response
    if (llmResult) {
      try {
        const cleaned = llmResult.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.intent === 'build' && parsed.budget) {
          extracted = {
            budget: parsed.budget,
            purpose: parsed.purpose || 'Gaming',
            resolution: parsed.resolution || '1080p',
            platform: parsed.platform || 'default',
            includePeripheral: !!parsed.includePeripheral,
          };
        }
      } catch {}
    }

    // Fallback rule-based extraction (using current prompt + context)
    if (!extracted || !extracted.budget) {
      const purpose = extracted?.purpose || parsePurpose(prompt);
      const resolution = extracted?.resolution || parseResolution(prompt);
      const explicitBudget = parseBudget(contextualPrompt);
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
        const estimated = estimateBudget(purpose, resolution, contextualPrompt);
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
      const purpose = extracted.purpose;
      const resolution = extracted.resolution;
      const minReasonable = estimateBudget(purpose, resolution, contextualPrompt);
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

    const result = await generateTieredBuilds({ ...extracted!, text: contextualPrompt });

    return NextResponse.json({
      intent: 'build',
      request: extracted!,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
