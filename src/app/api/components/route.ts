import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const components = await prisma.hardwareComponent.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(components);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
