import { NextRequest, NextResponse } from 'next/server';
import { generateTieredBuilds } from '@/lib/build-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateTieredBuilds(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
