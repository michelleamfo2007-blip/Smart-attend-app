import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/session';
import { getEnvStatus } from '@/lib/env';
import prisma from '@/lib/prisma';

/**
 * Presence-only production secrets check.
 * Never returns secret values — only whether each var is set.
 * Restricted to ADMIN users (school admins + super admins).
 */
export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const env = getEnvStatus();

    let databaseOk = false;
    let databaseError: string | null = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
    } catch (err: any) {
      databaseError = err?.message ? 'Database connection failed' : 'Database connection failed';
    }

    return NextResponse.json({
      ...env,
      databaseOk,
      databaseError,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Env status error:', error);
    return NextResponse.json({ error: 'Failed to check environment' }, { status: 500 });
  }
}
