import { NextResponse } from 'next/server';
import { runSessionScheduler } from '@/lib/sessionScheduler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow in development without secret; require in production.
    return process.env.NODE_ENV !== 'production';
  }
  const header = req.headers.get('authorization');
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get('secret') === secret;
}

/**
 * Vercel Cron / external monitor hits this to advance timetable sessions.
 * Also safe to call manually with CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runSessionScheduler();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error('Session cron failed:', error);
    return NextResponse.json({ error: 'Scheduler failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
