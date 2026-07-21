import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getTokenFromRequest, JwtPayload } from './auth';

export function getAuthenticatedAdmin(request: NextRequest): JwtPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(
  request: NextRequest,
  allowedRoles?: string[],
): { admin: JwtPayload } | { error: NextResponse } {
  const admin = getAuthenticatedAdmin(request);
  if (!admin) {
    return { error: NextResponse.json({ error: 'Unauthorized. Silakan login terlebih dahulu.' }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    return { error: NextResponse.json({ error: 'Forbidden. Anda tidak memiliki akses.' }, { status: 403 }) };
  }
  return { admin };
}
