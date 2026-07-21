import { NextRequest, NextResponse } from 'next/server';
import { generateBuild } from '@/lib/build-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const build = await generateBuild(body);
    return NextResponse.json(build);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
