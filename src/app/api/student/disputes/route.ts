import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getStudentClasses } from '@/lib/student';
import { headers } from 'next/headers';

async function getUserId() {
  const headersList = await headers();
  return headersList.get('x-user-id');
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const disputes = await prisma.attendance_disputes.findMany({
      where: { student_id: userId },
      orderBy: { created_at: 'desc' },
    });

    const classIds = [...new Set(disputes.map((dispute) => dispute.class_id))];
    const classes = classIds.length
      ? await prisma.classes.findMany({
          where: { id: { in: classIds } },
          select: { id: true, name: true },
        })
      : [];
    const classNameById = new Map(classes.map((cls) => [cls.id, cls.name]));

    return NextResponse.json({
      disputes: disputes.map((dispute) => ({
        ...dispute,
        class: { name: classNameById.get(dispute.class_id) || 'Unknown Class' },
        classes: { name: classNameById.get(dispute.class_id) || 'Unknown Class' },
      })),
    });
  } catch (error) {
    console.error('Student disputes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { classId, sessionId, reason } = await req.json();
    if (!classId || !reason?.trim()) {
      return NextResponse.json({ error: 'Class and reason are required' }, { status: 400 });
    }

    const studentClasses = await getStudentClasses(userId);
    if (!studentClasses.some((cls) => cls.id === classId)) {
      return NextResponse.json({ error: 'You are not enrolled in this class' }, { status: 403 });
    }

    let resolvedSessionId = sessionId as string | undefined;
    if (!resolvedSessionId) {
      const recentSession = await prisma.attendance_sessions.findFirst({
        where: { class_id: classId },
        orderBy: { created_at: 'desc' },
        select: { id: true },
      });
      if (!recentSession) {
        return NextResponse.json(
          { error: 'No attendance sessions have been created for this class yet, so you cannot dispute attendance.' },
          { status: 400 }
        );
      }
      resolvedSessionId = recentSession.id;
    }

    const dispute = await prisma.attendance_disputes.create({
      data: {
        student_id: userId,
        class_id: classId,
        session_id: resolvedSessionId,
        reason: reason.trim(),
        status: 'pending',
      },
    });

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (error) {
    console.error('Student disputes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
