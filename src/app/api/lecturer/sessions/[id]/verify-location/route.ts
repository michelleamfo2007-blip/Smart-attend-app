import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';
import { isSessionOpen } from '@/lib/markAttendance';
import { verifyLecturerLocation } from '@/lib/lecturerLocation';

/**
 * On-demand lecturer geofence check for an active session.
 * Does NOT enable background tracking.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const accuracy = body.accuracy != null ? Number(body.accuracy) : null;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: 'Location coordinates are required.' }, { status: 400 });
    }

    const session = await prisma.attendance_sessions.findUnique({ where: { id } });
    if (!session || session.lecturer_id !== auth.userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (!isSessionOpen(session)) {
      return NextResponse.json({ error: 'Session is not active.' }, { status: 400 });
    }

    const result = await verifyLecturerLocation({
      sessionId: id,
      lecturerId: auth.userId,
      latitude,
      longitude,
      accuracy,
      ip: req.headers.get('x-forwarded-for'),
    });

    const status = result.controlsAllowed ? 200 : 403;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error(error);
    const status = error?.status || 500;
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status }
    );
  }
}
