import { findGpuBenchmark, findCpuBenchmark } from '@/data/benchmarks';
import type { GpuBenchmark, CpuBenchmark } from '@/data/benchmarks';

/**
 * Rule-based question detection + benchmark-driven mini-reviews. Used when the
 * LLM provider is offline so "review / comparison / worth-it" prompts — and
 * follow-ups that reference the previous turn — still get a useful answer
 * instead of being misclassified as build requests.
 */

export interface ChatMessage {
  role: string;
  text: string;
}

export const OFFLINE_QUESTION_PATTERNS = [
  /review|ulasan|kasih\s+review/i,
  /worth|layak|worth\s*it/i,
  /\bbagus\s+(nggak|gak|gk|engga|tidak|untuk|buat|di)\b/i,
  /\bapa\b.*(?:bagus|worth|oke|jelek|buruk)/i,
  /\bvs\b|versus|bandingkan|perbandingan/i,
  /lebih\s+(bagus|baik|cepat|kuat|kencang|tahan)/i,
  /mana\s+yang\s+(lebih|paling)/i,
  /berapa\s+(fps|frame|harganya|harga)/i,
  /performa|bottleneck/i,
  /\bapa\s+itu\b/i,
  /perbedaan|beda\s+nya/i,
  /cocok\s+(untuk|buat)/i,
  /cara\s+mengatasi|troubleshoot|solusi/i,
  /\bkenapa\b|masalah|error|hang|lag|stuck|crash|boot\s*loop/i,
];

// Follow-up cues: "bagaimana jika/kalau", "gimana", "terus", a bare model
// number, etc. Only treated as questions when there is a previous turn to
// attach the meaning to (otherwise they would default to a build request).
const OFFLINE_FOLLOWUP_PATTERNS = [
  /bagaimana\s+(jika|kalau|kalo|dengan)/i,
  /gimana\s+(jika|kalau|kalo|dengan)?/i,
  /\bkalau\b|\bkalo\b|\bjika\b/,
  /terus|seandainya|berarti/,
  /\b\d{3,4}\b/,
];

/**
 * True when the prompt reads like a general question (review, comparison,
 * spec inquiry) OR is a context-bound follow-up — and carries no explicit
 * budget — so it should never be treated as a build request.
 */
export function isOfflineQuestion(prompt: string, hasBudget: boolean, hasContext = false): boolean {
  if (hasBudget) return false;
  if (OFFLINE_QUESTION_PATTERNS.some((p) => p.test(prompt))) return true;
  if (hasContext && OFFLINE_FOLLOWUP_PATTERNS.some((p) => p.test(prompt))) return true;
  return false;
}

function gpuVerdict(gpu: GpuBenchmark): string {
  if (gpu.fps1080p >= 144)
    return 'GPU ini sangat mumpuni — nyaman untuk 1080p high refresh-rate dan 1440p, bahkan masih layak di 4K. Recommended banget kalau budget memungkinkan.';
  if (gpu.fps1080p >= 100)
    return 'GPU ini andal untuk 1080p High tanpa ray tracing, dan masih nyaman main di 1440p medium-high dengan frame rate mulus.';
  if (gpu.fps1080p >= 70)
    return 'GPU ini cukup untuk 1080p High untuk mayoritas game, dan bisa diandalkan untuk e-sports dengan frame rate tinggi. Best value di kelasnya.';
  return 'GPU ini lebih cocok untuk 1080p medium/low atau e-sports ringan — pertimbangkan kelas di atasnya kalau budget longgar.';
}

function gpuReviewText(gpu: GpuBenchmark): string {
  const res = [`Wah, pertanyaan bagus! ${gpu.model} rata-rata ${gpu.fps1080p} FPS di 1080p untuk game AAA`];
  if (gpu.fps1440p > 0) res.push(`${gpu.fps1440p} FPS di 1440p`);
  if (gpu.fps4k > 0) res.push(`dan sekitar ${gpu.fps4k} FPS di 4K`);
  res.push(`serta ${gpu.fpsEsports} FPS di game e-sports seperti Valorant/CS2.`);
  return res.join(', ').replace(', dan ', ' dan ');
}

function buildGpuReview(gpu: GpuBenchmark, prev?: GpuBenchmark): string {
  const compare =
    prev && prev.model !== gpu.model
      ? ` Kalau dibanding ${prev.model} yang ${prev.fps1080p} FPS di 1080p, ${gpu.model} ${gpu.fps1080p >= prev.fps1080p ? 'lebih kencang' : 'lebih hemat anggaran'} dengan ${gpu.fps1080p} FPS di 1080p.`
      : '';
  return `${gpuReviewText(gpu)}${compare} ${gpuVerdict(gpu)} Kalau kamu mau, saya bisa bantu buatkan rekomendasi build PC lengkap sesuai kebutuhan kamu.`;
}

function buildCpuReview(cpu: CpuBenchmark): string {
  const verdict =
    cpu.passmarkSingle >= 3800
      ? 'kelas atas — bagus untuk gaming framerate tinggi dan produktivitas berat'
      : cpu.passmarkSingle >= 3000
        ? 'cukup bertenaga untuk gaming dan editing ringan'
        : 'cocok untuk build entry sampai menengah';
  return `Wah, pertanyaan bagus! ${cpu.model} punya skor single-core ${cpu.passmarkSingle} (PassMark), multi-core ${cpu.passmarkMulti}, dan Cinebench R23 ${cpu.cinebenchR23}. Kategori: ${verdict}. Kalau kamu mau, saya bisa bantu buatkan rekomendasi build PC lengkap sesuai kebutuhan kamu.`;
}

function normalizeModelSpacing(s: string): string {
  return s.replace(/\b(GTX|RTX|RX|Ryzen|Core)\s*(\d)/gi, '$1 $2');
}

/**
 * Follow-up resolution: a bare message like "bagaimana jika 5050" has no model
 * of its own, so borrow the series prefix (RTX/RX/Ryzen …) from the latest
 * turn and re-apply it to the number the user typed.
 */
function resolveFollowUp(text: string, history: ChatMessage[]): GpuBenchmark | CpuBenchmark | null {
  const histText = normalizeModelSpacing(history.map((m) => m.text).join(' '));
  const num = text.match(/\b(\d{3,4})\b/)?.[1];
  if (!num) return null;

  const gpuPrefix = histText.match(/\b(RTX|GTX|RX)\s*\d+/i)?.[0]?.match(/\b(RTX|GTX|RX)\b/i)?.[1];
  if (gpuPrefix) {
    const gpu = findGpuBenchmark(`${gpuPrefix} ${num}`);
    if (gpu) return gpu;
  }

  const ryzenSeries = histText.match(/\bRyzen\s*\d+\b/i)?.[0];
  if (ryzenSeries) {
    const cpu = findCpuBenchmark(`${ryzenSeries} ${num}`);
    if (cpu) return cpu;
  }
  return null;
}

/**
 * Offline fallback QA: answers "review / mana yang lebih / worth-nya gimana?"
 * for GPUs and CPUs using the real benchmark data. When the current prompt is
 * only meaningful with context (e.g. "bagaimana jika 5050"), resolves it
 * against `history`. Returns null when nothing known is mentioned.
 */
export function offlineQaFallback(text: string, history: ChatMessage[] = []): string | null {
  const normalized = normalizeModelSpacing(text);
  const histText = normalizeModelSpacing(history.map((m) => m.text).join(' '));
  const corrected = normalized.replace(/\bGTX\s*50(\d\d)\b/i, 'RTX 50$1');

  const gpu = findGpuBenchmark(corrected);
  if (gpu) {
    const prev = findGpuBenchmark(histText) ?? undefined;
    return buildGpuReview(gpu, prev);
  }
  const cpu = findCpuBenchmark(corrected);
  if (cpu) return buildCpuReview(cpu);

  if (history.length > 0) {
    const followUp = resolveFollowUp(corrected, history);
    if (followUp && 'fps1080p' in followUp) {
      const prev = findGpuBenchmark(histText) ?? undefined;
      return buildGpuReview(followUp, prev);
    }
    if (followUp) return buildCpuReview(followUp as CpuBenchmark);
  }
  return null;
}
