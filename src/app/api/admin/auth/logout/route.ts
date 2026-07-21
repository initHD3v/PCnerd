import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  return NextResponse.json(
    { message: 'Logout berhasil.' },
    { status: 200, headers: { 'Set-Cookie': clearSessionCookie() } },
  );
}
