import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const result = requireAdmin(request);
  if ('error' in result) return result.error;

  return NextResponse.json({
    id: result.admin.id,
    username: result.admin.username,
    role: result.admin.role,
  });
}
