import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateResetToken, getResetExpiry } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username wajib diisi.' }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      // Jangan ungkap apakah username ada atau tidak (security)
      return NextResponse.json({ message: 'Jika username terdaftar, token reset akan tersedia.' });
    }

    const resetToken = generateResetToken();
    await prisma.admin.update({
      where: { id: admin.id },
      data: { resetToken, resetExpiry: getResetExpiry() },
    });

    return NextResponse.json({
      message: 'Token reset berhasil dibuat.',
      resetToken,
      expiresIn: '15 menit',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
