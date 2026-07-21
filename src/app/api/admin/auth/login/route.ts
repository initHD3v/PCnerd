import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyPassword,
  signToken,
  createSessionCookie,
  checkRateLimit,
  resetRateLimit,
  validatePasswordStrength,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
        { status: 429 },
      );
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin || !(await verifyPassword(password, admin.password))) {
      return NextResponse.json(
        { error: 'Username atau password salah.', remaining },
        { status: 401 },
      );
    }

    // Update last login
    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    resetRateLimit(ip);

    const token = signToken({ id: admin.id, username: admin.username, role: admin.role });
    const cookie = createSessionCookie(token);

    return NextResponse.json(
      { id: admin.id, username: admin.username, role: admin.role },
      { status: 200, headers: { 'Set-Cookie': cookie } },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
