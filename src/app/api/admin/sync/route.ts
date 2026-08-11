import { NextResponse } from 'next/server';
import { updateAllPricesFromTokopedia, getSyncStatus, isValidComponentType } from '@/lib/scraper/updater';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const category = isValidComponentType(body?.category) ? body.category : undefined;
    const result = await updateAllPricesFromTokopedia(category);
    const status = result.success ? 200 : 409;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
