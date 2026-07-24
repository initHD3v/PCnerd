import { NextResponse } from 'next/server';
import { updateAllPricesFromTokopedia, getSyncStatus } from '@/lib/scraper/updater';

export async function POST() {
  try {
    const result = await updateAllPricesFromTokopedia();
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
