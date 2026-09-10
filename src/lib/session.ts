import { cookies, headers } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export type AuthSession = {
  userId: string;
  userRole: string;
  institutionId: string | null;
};

export async function getAuth(): Promise<AuthSession | null> {
  const headerStore = await headers();
  const headerUserId = headerStore.get('x-user-id');

  if (headerUserId) {
    return {
      userId: headerUserId,
      userRole: headerStore.get('x-user-role') || '',
      institutionId: headerStore.get('x-institution-id'),
    };
  }

  const authHeader = headerStore.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = (await cookies()).get('token')?.value;
  const token = cookieToken || bearer;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  return {
    userId: payload.userId as string,
    userRole: (payload.userRole as string) || '',
    institutionId: (payload.institutionId as string) || null,
  };
}

export function isCrossTenant(auth: AuthSession, resourceInstitutionId?: string | null) {
  if (!auth.institutionId) return false;
  return auth.institutionId !== resourceInstitutionId;
}
