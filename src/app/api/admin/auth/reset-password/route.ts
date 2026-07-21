import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token dan password baru wajib diisi.' }, { status: 400 });
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }

    const admin = await prisma.admin.findFirst({
      where: { resetToken: token, resetExpiry: { gt: new Date() } },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Token tidak valid atau sudah kedaluwarsa.' }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashed, resetToken: null, resetExpiry: null },
    });

    return NextResponse.json({ message: 'Password berhasil direset. Silakan login.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
