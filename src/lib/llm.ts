const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  apiKey: string;
}

function detectConfig(): LLMConfig | null {
  if (GEMINI_API_KEY) {
    return { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: GEMINI_API_KEY };
  }
  if (OPENAI_API_KEY) {
    return { provider: 'openai', model: 'gpt-4o-mini', apiKey: OPENAI_API_KEY };
  }
  if (ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', model: 'claude-3-haiku-20240307', apiKey: ANTHROPIC_API_KEY };
  }
  return null;
}

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const config = detectConfig();
  if (!config) return null;

  try {
    if (config.provider === 'gemini') return await callGemini(config, systemPrompt, userPrompt);
    if (config.provider === 'openai') return await callOpenAI(config, systemPrompt, userPrompt);
    return await callAnthropic(config, systemPrompt, userPrompt);
  } catch (e) {
    console.error('[llm] Error calling LLM:', e);
    return null;
  }
}

async function callGemini(config: LLMConfig, system: string, user: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAI(config: LLMConfig, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

async function callAnthropic(config: LLMConfig, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      system,
      messages: [{ role: 'user', content: user }],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic ${res.status}: ${errText}`);
  }
  const json = await res.json();
  return json.content?.[0]?.text || '';
}

export async function* callLLMStream(systemPrompt: string, userPrompt: string): AsyncGenerator<string, void, unknown> {
  const config = detectConfig();
  if (!config) return;

  if (config.provider === 'gemini') {
    yield* streamGemini(config, systemPrompt, userPrompt);
  } else if (config.provider === 'openai') {
    yield* streamOpenAI(config, systemPrompt, userPrompt);
  } else {
    yield* streamAnthropic(config, systemPrompt, userPrompt);
  }
}

async function* streamGemini(config: LLMConfig, system: string, user: string): AsyncGenerator<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?key=${config.apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    },
  );

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      try {
        const parsed = JSON.parse(data);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) yield text;
      } catch {}
    }
  }
}

async function* streamOpenAI(config: LLMConfig, system: string, user: string): AsyncGenerator<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 1024,
      temperature: 0.7,
      stream: true,
    }),
  });

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) yield content;
      } catch {}
    }
  }
}

async function* streamAnthropic(config: LLMConfig, system: string, user: string): AsyncGenerator<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      system,
      messages: [{ role: 'user', content: user }],
      max_tokens: 1024,
      stream: true,
    }),
  });

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          yield parsed.delta.text;
        }
      } catch {}
    }
  }
}
