import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.attendance_sessions.updateMany({
      where: {
        lecturer_id: auth.userId,
        status: 'active',
        expires_at: { lt: new Date() },
      },
      data: { status: 'closed' },
    });

    const sessions = await prisma.attendance_sessions.findMany({
      where: { lecturer_id: auth.userId },
      include: {
        class: true,
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
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const course = await prisma.classes.findUnique({ where: { id: courseId } });
    if (!course || course.lecturer_id !== auth.userId) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 });
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

    const attendance_code = Math.floor(100000 + Math.random() * 900000).toString();

    const session = await prisma.attendance_sessions.create({
      data: {
        class_id: courseId,
        lecturer_id: auth.userId,
        attendance_code,
        latitude,
        longitude,
        status: 'active',
        expires_at: expiresAt,
      },
      include: { class: { include: { classroom: true } } },
    });

    return NextResponse.json({ session, radius: 50 }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
