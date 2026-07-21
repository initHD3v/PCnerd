import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-middleware';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  const result = requireAdmin(request);
  if ('error' in result) return result.error;

  try {
    const { newPassword } = await request.json();
    if (!newPassword) {
      return NextResponse.json({ error: 'Password baru wajib diisi.' }, { status: 400 });
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id: result.admin.id },
      data: { password: hashed },
    });

    return NextResponse.json({ message: 'Password berhasil diubah.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
