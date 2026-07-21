const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
}

function detectConfig(): LLMConfig | null {
  if (OPENAI_API_KEY) {
    return { provider: 'openai', model: 'gpt-4o-mini', apiKey: OPENAI_API_KEY };
  }
  if (ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', model: 'claude-3-haiku-20240307', apiKey: ANTHROPIC_API_KEY };
  }
  return null;
}

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const config = detectConfig();
  if (!config) return null;

  try {
    if (config.provider === 'openai') {
      return await callOpenAI(config, systemPrompt, userPrompt);
    }
    return await callAnthropic(config, systemPrompt, userPrompt);
  } catch {
    return null;
  }
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
  const json = await res.json();
  return json.content?.[0]?.text || '';
}
