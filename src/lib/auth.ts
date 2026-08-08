import { SignJWT, jwtVerify } from 'jose';

// In Supabase, the JWT secret must be exactly the one configured in the Supabase project
const secretKey = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'fallback-secret-for-development-only';
const encodedKey = new TextEncoder().encode(secretKey);

export async function signToken(payload: any) {
  // Map our custom payload to a Supabase-compatible JWT payload
  const supabasePayload = {
    ...payload,
    userRole: payload.role, // Save our custom role here so it's not overwritten
    sub: payload.userId, // Required by Supabase for auth.uid()
    role: 'authenticated', // Required for RLS
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
