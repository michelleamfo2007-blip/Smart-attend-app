import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const session = await prisma.attendance_sessions.findUnique({
      where: { id },
      include: {
        class: true,
        records: {
          include: {
            student: { select: { id: true, name: true, student_id: true } },
            marked_by: { select: { id: true, name: true } },
          },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!session || session.lecturer_id !== auth.userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'active' && session.expires_at && new Date(session.expires_at) < new Date()) {
      const closed = await prisma.attendance_sessions.update({
        where: { id },
        data: { status: 'closed' },
        include: {
          class: true,
          records: {
            include: {
              student: { select: { id: true, name: true, student_id: true } },
            marked_by: { select: { id: true, name: true } },
            },
            orderBy: { timestamp: 'desc' },
          },
        },
      });
      return NextResponse.json({
        session: closed,
        checkedInCount: closed.records.length,
      });
    }

    return NextResponse.json({
      session,
      checkedInCount: session.records.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const session = await prisma.attendance_sessions.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.lecturer_id !== auth.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updated = await prisma.attendance_sessions.update({
      where: { id },
      data: { status: 'closed', expires_at: new Date() },
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
