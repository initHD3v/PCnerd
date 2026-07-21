import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getTokenFromCookieString, COOKIE_NAME } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/auth/')) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = getTokenFromCookieString(cookieHeader);
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized. Silakan login terlebih dahulu.' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/admin/:path*',
};
