import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AppSetting } from '@prisma/client';

const SETTING_KEYS = ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL'] as const;

export async function GET() {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });
    const settings: Record<string, string> = {};
    for (const key of SETTING_KEYS) {
      settings[key] = rows.find((r: AppSetting) => r.key === key)?.value || '';
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      if (!(SETTING_KEYS as readonly string[]).includes(key)) continue;
      await prisma.appSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
