import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';
import { ensureInstitutionSessions } from '@/lib/sessionScheduler';
import { generateShortAttendanceCode, shortCodeExpiry } from '@/lib/attendanceTokens';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (auth.institutionId) {
      await ensureInstitutionSessions(auth.institutionId).catch((err) =>
        console.error('ensureInstitutionSessions failed', err)
      );
    }

    await prisma.attendance_sessions.updateMany({
      where: {
        lecturer_id: auth.userId,
        status: { in: ['active', 'scheduled'] },
        expires_at: { lt: new Date() },
      },
      data: { status: 'closed' },
    });

    const sessions = await prisma.attendance_sessions.findMany({
      where: { lecturer_id: auth.userId },
      include: {
        class: { include: { classroom: true } },
        records: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                student_id: true,
              },
            },
            marked_by: { select: { id: true, name: true } },
          },
          orderBy: { timestamp: 'desc' },
        },
      },
      orderBy: [{ scheduled_start: 'desc' }, { created_at: 'desc' }],
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Manual override start. Prefer activating today's scheduled auto-session
 * when one exists; otherwise create an ad-hoc active session.
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId, latitude, longitude } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Location coordinates are required.' }, { status: 400 });
    }

    const course = await prisma.classes.findUnique({
      where: { id: courseId },
      include: { classroom: true },
    });
    if (!course || course.lecturer_id !== auth.userId) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 });
    }

    if (auth.institutionId) {
      await ensureInstitutionSessions(auth.institutionId).catch(() => undefined);
    }

    const now = new Date();
    const scheduledToday = await prisma.attendance_sessions.findFirst({
      where: {
        class_id: courseId,
        lecturer_id: auth.userId,
        status: { in: ['scheduled', 'active'] },
        OR: [
          { scheduled_start: { lte: now }, scheduled_end: { gte: now } },
          { scheduled_start: null, status: 'active', expires_at: { gte: now } },
        ],
      },
      include: { class: { include: { classroom: true } } },
      orderBy: { created_at: 'desc' },
    });

    if (scheduledToday) {
      const updated = await prisma.attendance_sessions.update({
        where: { id: scheduledToday.id },
        data: {
          status: 'active',
          latitude: Number(latitude),
          longitude: Number(longitude),
          attendance_code: scheduledToday.attendance_code || generateShortAttendanceCode(),
          code_expires_at:
            scheduledToday.code_expires_at && new Date(scheduledToday.code_expires_at) > now
              ? scheduledToday.code_expires_at
              : shortCodeExpiry(now, scheduledToday.scheduled_end || scheduledToday.expires_at),
        },
        include: { class: { include: { classroom: true } } },
      });

      await logAudit({
        userId: auth.userId,
        action: 'SESSION_MANUAL_OVERRIDE',
        details: `Lecturer activated/overrode session ${updated.id} for class ${courseId}`,
      });

      return NextResponse.json({
        session: updated,
        radius: updated.class.classroom?.radius_meters || 50,
        override: true,
      }, { status: 200 });
    }

    await prisma.attendance_sessions.updateMany({
      where: { class_id: courseId, lecturer_id: auth.userId, status: 'active' },
      data: { status: 'closed', expires_at: new Date() },
    });

    const expiresAt = new Date();
    if (course.end_time) {
      const [hours, minutes] = course.end_time.split(':').map(Number);
      expiresAt.setHours(hours, minutes, 0, 0);
      if (expiresAt.getTime() < Date.now()) {
        expiresAt.setDate(expiresAt.getDate() + 1);
      }
    } else {
      expiresAt.setHours(expiresAt.getHours() + 2);
    }

    const attendance_code = generateShortAttendanceCode();
    const code_expires_at = shortCodeExpiry(new Date(), expiresAt);

    const session = await prisma.attendance_sessions.create({
      data: {
        class_id: courseId,
        lecturer_id: auth.userId,
        attendance_code,
        code_expires_at,
        latitude: Number(latitude),
        longitude: Number(longitude),
        status: 'active',
        expires_at: expiresAt,
        attendance_method: 'both',
        auto_created: false,
      },
      include: { class: { include: { classroom: true } } },
    });

    await logAudit({
      userId: auth.userId,
      action: 'SESSION_MANUAL_STARTED',
      details: `Lecturer manually started ad-hoc session ${session.id} for class ${courseId}`,
    });

    return NextResponse.json(
      { session, radius: session.class.classroom?.radius_meters || 50, override: false },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
