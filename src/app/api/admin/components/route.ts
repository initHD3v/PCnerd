import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_TYPES = [
  'CPU', 'GPU', 'MOTHERBOARD', 'RAM', 'STORAGE', 'PSU', 'CASE', 'COOLER',
  'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET', 'SPEAKER',
];

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.brand || !body.type) {
      return NextResponse.json({ error: 'Missing required fields: name, brand, type' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }
    if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
    }
    const component = await prisma.hardwareComponent.create({
      data: {
        name: body.name,
        brand: body.brand,
        model: body.model || null,
        type: body.type,
        price: body.price || 0,
        specs: typeof body.specs === 'string' ? JSON.parse(body.specs) : (body.specs || {}),
        socket: body.socket || null,
        formFactor: body.formFactor || null,
        ramType: body.ramType || null,
        wattage: body.wattage ? Number(body.wattage) : null,
        tdp: body.tdp ? Number(body.tdp) : null,
        imageUrl: body.imageUrl || null,
        shopUrl: body.shopUrl || null,
        marketplace: body.marketplace || null,
      },
    });
    return NextResponse.json(component, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
