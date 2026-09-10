import { randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { assertProductionJwtConfigured } from '@/lib/env';

function getResetKey() {
  assertProductionJwtConfigured();
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production.');
    }
    return new TextEncoder().encode('fallback-secret-for-development-only');
  }
  return new TextEncoder().encode(secret);
}

export async function signPasswordResetToken(userId: string, email: string) {
  return new SignJWT({
    purpose: 'password_reset',
    userId,
    email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getResetKey());
}

export async function verifyPasswordResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getResetKey());
    if (payload.purpose !== 'password_reset' || typeof payload.userId !== 'string') {
      return null;
    }
    return {
      userId: payload.userId as string,
      email: typeof payload.email === 'string' ? payload.email : null,
    };
  } catch {
    return null;
  }
}

export function generateTemporaryPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(length);
  let password = '';
  for (const byte of bytes) {
    password += alphabet[byte % alphabet.length];
  }
  return password;
}
