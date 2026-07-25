import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { baseUrl, apiKey, model } = await req.json();
    if (!baseUrl) {
      return NextResponse.json({ error: 'Base URL is required' }, { status: 400 });
    }

    const url = baseUrl.replace(/\/+$/, '');

    // First try: list models to verify connectivity
    const listRes = await fetch(`${url}/v1/models`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!listRes.ok) {
      const text = await listRes.text();
      return NextResponse.json({
        error: `Gagal terhubung (HTTP ${listRes.status}): ${text.slice(0, 200)}`,
      });
    }

    const listData = await listRes.json();
    const models: string[] = (listData.data || listData || [])
      .map((m: any) => m.id || m.name || String(m))
      .filter(Boolean);
    const availableModels = models.length > 0 ? models : ['default'];

    // Second: try a simple chat completion to verify inference works
    let testSuccess = false;
    let testResponse = '';

    if (model && availableModels.some((m: string) => m.includes(model) || model.includes(m))) {
      const chatRes = await fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Balas dengan satu kata: "oke"' }],
          max_tokens: 50,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (chatRes.ok) {
        const chatJson = await chatRes.json();
        testResponse = chatJson.choices?.[0]?.message?.content || '';
        testSuccess = true;
      }
    }

    return NextResponse.json({
      success: true,
      connected: true,
      testSuccess,
      testResponse: testResponse.trim(),
      availableModels,
      message: testSuccess
        ? 'Koneksi berhasil! Model merespon dengan baik.'
        : 'Koneksi ke server berhasil. Pilih model untuk menguji respon.',
    });
  } catch (error: any) {
    const message =
      error.name === 'TimeoutError' || error.name === 'AbortError'
        ? 'Timeout: server tidak merespon dalam 5 detik'
        : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
