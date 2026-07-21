import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-only-secret';
export const COOKIE_NAME = 'bw_admin_token';
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '8h';
const RESET_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// Rate limiting: simple in-memory store
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export interface JwtPayload {
  id: string;
  username: string;
  role: string;
}

// --- Password ---
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf kapital.';
  if (!/[a-z]/.test(password)) return 'Password harus mengandung huruf kecil.';
  if (!/[0-9]/.test(password)) return 'Password harus mengandung angka.';
  return null;
}

// --- JWT ---
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// --- Cookie ---
export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value || null;
}

export function getTokenFromCookieString(cookieString: string): string | null {
  const match = cookieString.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? match[1] : null;
}

export function createSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${8 * 60 * 60}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// --- Rate Limit ---
export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - 1 };
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - entry.count };
}

export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}

// --- Token Generation ---
export function generateResetToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getResetExpiry(): Date {
  return new Date(Date.now() + RESET_EXPIRY_MS);
}
