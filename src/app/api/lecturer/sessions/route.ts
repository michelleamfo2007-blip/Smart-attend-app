import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

// GET: all sessions by this lecturer
export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessions = await prisma.attendance_sessions.findMany({
      where: { lecturer_id: userId },
      include: {
        class: true,
        records: true,
      },
      orderBy: { created_at: 'desc' },
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

    const { courseId, latitude, longitude, useClassroomLocation } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let finalLat = latitude;
    let finalLng = longitude;
    let radius = 100; // default 100 meters

    // If using predefined classroom
    if (useClassroomLocation) {
      const classData = await prisma.classes.findUnique({
        where: { id: courseId },
        include: { classroom: true }
      });
      if (!classData || !classData.classroom) {
        return NextResponse.json({ error: 'No predefined classroom assigned to this course.' }, { status: 400 });
      }
      finalLat = classData.classroom.latitude;
      finalLng = classData.classroom.longitude;
      radius = classData.classroom.radius_meters || 50;
    }

    if (finalLat == null || finalLng == null) {
       return NextResponse.json({ error: 'Location coordinates are required.' }, { status: 400 });
    }

    // End any other active sessions for this course by this lecturer
    await prisma.attendance_sessions.updateMany({
      where: { class_id: courseId, lecturer_id: userId, status: 'active' },
      data: { status: 'closed', expires_at: new Date() },
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // default 2 hours

    const session = await prisma.attendance_sessions.create({
      data: {
        class_id: courseId,
        lecturer_id: userId,
        latitude: finalLat,
        longitude: finalLng,
        status: 'active',
        expires_at: expiresAt,
      },
      include: { class: { include: { classroom: true } } },
    });

    // We can return the radius to the client so it knows what was used
    return NextResponse.json({ session, radius }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
