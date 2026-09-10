import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { closeExpiredSession, isSessionOpen } from '@/lib/markAttendance';

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
        classroom: { select: { id: true, name: true } },
      },
    });

    if (!kiosk || !kiosk.enabled) {
      return NextResponse.json({ error: 'This classroom desktop is not authorized.' }, { status: 404 });
    }

    await prisma.attendance_sessions.updateMany({
      where: {
        status: 'active',
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
            classroom: { select: { name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const open = session && isSessionOpen(session) && !(await closeExpiredSession(session));

    return NextResponse.json({
      kiosk: {
        id: kiosk.id,
        name: kiosk.name,
        classroom: kiosk.classroom,
      },
      session: open
        ? {
            id: session.id,
            status: session.status,
            expires_at: session.expires_at,
            class: session.class,
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
