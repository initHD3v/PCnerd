import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-middleware';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const result = requireAdmin(request, ['superadmin']);
  if ('error' in result) return result.error;

  const admins = await prisma.admin.findMany({
    select: { id: true, username: true, role: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(admins);
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request, ['superadmin']);
  if ('error' in auth) return auth.error;

  try {
    const { username, password, role } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }

    if (role && !['superadmin', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 });
    }

    const existing = await prisma.admin.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const admin = await prisma.admin.create({
      data: { username, password: hashed, role: role || 'admin' },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
