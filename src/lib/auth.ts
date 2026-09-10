import { SignJWT, jwtVerify } from 'jose';

function getEncodedKey() {
  const envSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

  if (!envSecret) {
    console.warn('JWT_SECRET is not set. Using an insecure development fallback.');
  }

  return new TextEncoder().encode(envSecret || 'fallback-secret-for-development-only');
}

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
    .sign(getEncodedKey());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getEncodedKey());
    return payload;
  } catch (error) {
    return null;
  }
}
