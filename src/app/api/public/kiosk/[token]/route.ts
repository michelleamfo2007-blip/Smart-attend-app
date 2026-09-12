import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { closeExpiredSession, countExpectedStudents, isSessionOpen } from '@/lib/markAttendance';
import { ensureInstitutionSessions } from '@/lib/sessionScheduler';
import {
  encodeQrPayload,
  mintQrToken,
  QR_REFRESH_MS,
} from '@/lib/attendanceTokens';

/**
 * Public Classroom Mode endpoint.
 * No admin UI — only room identity + active QR session (or waiting state).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Missing kiosk token' }, { status: 400 });
    }

    const kiosk = await prisma.classroom_kiosks.findUnique({
      where: { access_token: token },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
            building: true,
          },
        },
      },
    });

    if (!kiosk || !kiosk.enabled) {
      return NextResponse.json({ error: 'This classroom desktop is not authorized.' }, { status: 404 });
    }

    // Advance timetable sessions for this school so Classroom Mode works without a lecturer opening the dashboard.
    await ensureInstitutionSessions(kiosk.institution_id).catch((err) =>
      console.error('kiosk ensureInstitutionSessions', err)
    );

    await prisma.classroom_kiosks.update({
      where: { id: kiosk.id },
      data: { last_seen_at: new Date() },
    }).catch(() => undefined);

    await prisma.attendance_sessions.updateMany({
      where: {
        status: { in: ['active', 'scheduled'] },
        expires_at: { lt: new Date() },
        class: { classroom_id: kiosk.classroom_id },
      },
      data: { status: 'closed' },
    });

    const session = await prisma.attendance_sessions.findFirst({
      where: {
        status: 'active',
        class: {
          classroom_id: kiosk.classroom_id,
          institution_id: kiosk.institution_id,
        },
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            course_code: true,
            level: true,
            start_time: true,
            end_time: true,
            classroom: { select: { name: true, building: true } },
          },
        },
        records: { select: { id: true } },
      },
      orderBy: [{ scheduled_start: 'desc' }, { created_at: 'desc' }],
    });

    const open = Boolean(session && isSessionOpen(session) && !(await closeExpiredSession(session!)));
    const method = session?.attendance_method || 'both';
    const showQr = open && (method === 'dynamic_qr' || method === 'both');

    let qr: { token: string; payload: string; expiresAt: string } | null = null;
    if (showQr && session) {
      const minted = mintQrToken(session.id, 'desktop_qr');
      qr = {
        token: minted.token,
        payload: encodeQrPayload(minted.token),
        expiresAt: minted.expiresAt.toISOString(),
      };
    }

    let present = 0;
    let expected = 0;
    if (open && session) {
      present = session.records.length;
      expected = await countExpectedStudents(session.class);
    }

    // Waiting state: next scheduled session for this room (today/upcoming)
    let waiting: null | {
      className: string;
      courseCode: string | null;
      level: string | null;
      startsAt: string | null;
      endsAt: string | null;
    } = null;

    if (!open) {
      const upcoming = await prisma.attendance_sessions.findFirst({
        where: {
          status: 'scheduled',
          class: {
            classroom_id: kiosk.classroom_id,
            institution_id: kiosk.institution_id,
          },
          OR: [
            { scheduled_start: { gte: new Date() } },
            { scheduled_start: null },
          ],
        },
        include: {
          class: {
            select: { name: true, course_code: true, level: true },
          },
        },
        orderBy: { scheduled_start: 'asc' },
      });

      if (upcoming) {
        waiting = {
          className: upcoming.class.name,
          courseCode: upcoming.class.course_code,
          level: upcoming.class.level,
          startsAt: upcoming.scheduled_start?.toISOString() || null,
          endsAt: upcoming.scheduled_end?.toISOString() || null,
        };
      }
    }

    return NextResponse.json({
      mode: 'classroom',
      refreshMs: QR_REFRESH_MS,
      kiosk: {
        id: kiosk.id,
        name: kiosk.name,
        deviceLabel: kiosk.device_label,
        classroom: {
          id: kiosk.classroom.id,
          name: kiosk.classroom.name,
          building: kiosk.classroom.building,
        },
      },
      session: open && session
        ? {
            id: session.id,
            status: session.status,
            attendanceMethod: method,
            expires_at: session.expires_at,
            scheduled_start: session.scheduled_start,
            scheduled_end: session.scheduled_end,
            present,
            expected,
            class: {
              id: session.class.id,
              name: session.class.name,
              course_code: session.class.course_code,
              level: session.class.level,
              start_time: session.class.start_time,
              end_time: session.class.end_time,
              classroom: session.class.classroom,
            },
            qr,
            // If method is short_code only, Classroom Mode cannot show QR
            qrAvailable: showQr,
          }
        : null,
      waiting,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
