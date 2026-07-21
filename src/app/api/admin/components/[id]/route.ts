import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function handlePrismaError(error: any) {
  if (error?.code === 'P2025') {
    return NextResponse.json({ error: 'Component not found' }, { status: 404 });
  }
  return NextResponse.json({ error: error.message }, { status: 500 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { id } = await params;
    const existing = await prisma.hardwareComponent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }
    const component = await prisma.hardwareComponent.update({
      where: { id },
      data: {
        ...body,
        specs: body.specs !== undefined ? (typeof body.specs === 'string' ? JSON.parse(body.specs) : body.specs) : undefined,
      },
    });
    return NextResponse.json(component);
  } catch (error: any) {
    return handlePrismaError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.hardwareComponent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }
    await prisma.hardwareComponent.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return handlePrismaError(error);
  }
}
