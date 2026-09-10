import { SignJWT, jwtVerify } from 'jose';

const envSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

if (!envSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET or SUPABASE_JWT_SECRET must be set in production');
}

if (!envSecret) {
  console.warn('JWT_SECRET is not set. Using an insecure development fallback.');
}

const secretKey = envSecret || 'fallback-secret-for-development-only';
const encodedKey = new TextEncoder().encode(secretKey);

export async function signToken(payload: any) {
  const supabasePayload = {
    ...payload,
    userRole: payload.role,
    sub: payload.userId,
    role: 'authenticated',
    app_metadata: {
      institution_id: payload.institutionId,
    }
  };

  return new SignJWT(supabasePayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
    return payload;
  } catch (error) {
    return null;
  }
}
