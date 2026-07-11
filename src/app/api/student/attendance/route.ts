import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

// GET: student's attendance history
export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: userId },
      include: {
        session: {
          include: { course: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: mark attendance
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, latitude, longitude } = await req.json();

    if (!sessionId || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify session is active
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || !session.isActive) {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    // Check student is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: session.courseId } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 });
    }

    // Check already marked
    const existing = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: userId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Attendance already marked' }, { status: 400 });
    }

    // Calculate distance (Haversine formula)
    const R = 6371000; // metres
    const φ1 = (session.latitude * Math.PI) / 180;
    const φ2 = (latitude * Math.PI) / 180;
    const Δφ = ((latitude - session.latitude) * Math.PI) / 180;
    const Δλ = ((longitude - session.longitude) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Must be within 100 metres
    if (distance > 100) {
      return NextResponse.json(
        { error: `You are too far from the class (${Math.round(distance)}m away). Must be within 100m.` },
        { status: 400 }
      );
    }

    const record = await prisma.attendanceRecord.create({
      data: { sessionId, studentId: userId, latitude, longitude, distance },
    });

    return NextResponse.json({ record, distance: Math.round(distance) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
