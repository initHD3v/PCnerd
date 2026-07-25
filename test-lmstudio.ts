import { callLLM, callLLMStream } from './src/lib/llm.js';

async function main() {
  console.log('=== Test 1: Non-stream (template narrative) ===');
  const result = await callLLM(
    'Kamu adalah ahli PC Indonesia.',
    'Analisis build: CPU Ryzen 5 5600, GPU RTX 4060. Budget Rp 12jt untuk gaming 1080p. Berikan analisis dalam 3 kalimat.',
  );
  console.log('Result:', result);
  console.log();

  console.log('=== Test 2: Stream ===');
  const stream = callLLMStream(
    'Kamu adalah ahli PC Indonesia.',
    'Sebutkan 3 kelebihan RTX 4060 dalam format JSON list.',
  );
  let full = '';
  for await (const chunk of stream) {
    full += chunk;
    process.stdout.write(chunk);
  }
  console.log();
  console.log('Full stream:', full);
  console.log();

  console.log('=== Test 3: Without config (should fallback) ===');
  // Temporarily clear settings - this would use template
  console.log('Done');
}

main().catch(console.error);
