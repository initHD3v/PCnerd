import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-middleware';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request, ['superadmin']);
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Admin tidak ditemukan.' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.username) {
      const dup = await prisma.admin.findUnique({ where: { username: body.username } });
      if (dup && dup.id !== id) {
        return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 409 });
      }
      data.username = body.username;
    }
    if (body.password) {
      const strengthError = validatePasswordStrength(body.password);
      if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });
      data.password = await hashPassword(body.password);
    }
    if (body.role) {
      if (!['superadmin', 'admin'].includes(body.role)) {
        return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 });
      }
      data.role = body.role;
    }

    const admin = await prisma.admin.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, lastLoginAt: true, createdAt: true },
    });

    return NextResponse.json(admin);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request, ['superadmin']);
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;

    if (id === auth.admin.id) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri.' }, { status: 400 });
    }

    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Admin tidak ditemukan.' }, { status: 404 });
    }

    await prisma.admin.delete({ where: { id } });
    return NextResponse.json({ message: 'Admin berhasil dihapus.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
