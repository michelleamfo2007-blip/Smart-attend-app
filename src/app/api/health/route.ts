import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Public uptime probe for monitors (UptimeRobot, Better Stack, etc.).
 * Does not expose secrets — only ok/degraded and latency.
 */
export async function GET() {
  const started = Date.now();
  let databaseOk = false;
  let databaseError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch {
    databaseError = 'database_unreachable';
  }

  const ok = databaseOk;
  const body = {
    ok,
    status: ok ? 'healthy' : 'degraded',
    service: 'smartattend',
    database: databaseOk ? 'up' : 'down',
    ...(databaseError ? { error: databaseError } : {}),
    latencyMs: Date.now() - started,
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: ok ? 200 : 503 });
}
