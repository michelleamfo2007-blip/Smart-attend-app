import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

// GET: all sessions by this lecturer
export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessions = await prisma.session.findMany({
      where: { lecturerId: userId },
      include: {
        course: true,
        attendanceRecords: { include: { student: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: start a new session
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId, latitude, longitude } = await req.json();
    if (!courseId || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // End any other active sessions for this course by this lecturer
    await prisma.session.updateMany({
      where: { courseId, lecturerId: userId, isActive: true },
      data: { isActive: false, endTime: new Date() },
    });

    const session = await prisma.session.create({
      data: {
        courseId,
        lecturerId: userId,
        latitude,
        longitude,
        startTime: new Date(),
        isActive: true,
      },
      include: { course: true },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
