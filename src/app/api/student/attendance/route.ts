import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

// GET: student's attendance history
export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const records = await prisma.attendance_records.findMany({
      where: { student_id: userId },
      include: {
        session: {
          include: { class: true },
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

    const { attendanceCode, latitude, longitude } = await req.json();

    if (!attendanceCode || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify session is active and matches code
    const session = await prisma.attendance_sessions.findFirst({
      where: { 
        status: 'active',
        attendance_code: attendanceCode
      },
      include: { class: { include: { classroom: true } } }
    });
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid attendance code or session has ended.' }, { status: 400 });
    }

    // Verify the student is enrolled in this class!
    const enrollment = await prisma.enrollments.findUnique({
      where: {
        student_id_class_id: {
          student_id: userId,
          class_id: session.class_id
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'You are not enrolled in this class. Attendance rejected.' }, { status: 403 });
    }

    // Check already marked (Duplicate Scan Prevention)
    const existing = await prisma.attendance_records.findUnique({
      where: { student_id_session_id: { session_id: session.id, student_id: userId } },
    });
    if (existing) {
      // Audit log the failed attempt
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      await prisma.audit_logs.create({
        data: {
          user_id: userId,
          action: 'DUPLICATE_SCAN_ATTEMPT',
          details: `Student attempted to scan into session ${session.id} again.`,
          ip_address: ip
        }
      });
      return NextResponse.json({ error: 'You have already successfully scanned into this class!' }, { status: 400 });
    }

    // Calculate distance
    let distance = 0;
    const allowedRadius = 50; 


    if (session.latitude != null && session.longitude != null) {
      const R = 6371000; // metres
      const φ1 = (session.latitude * Math.PI) / 180;
      const φ2 = (latitude * Math.PI) / 180;
      const Δφ = ((latitude - session.latitude) * Math.PI) / 180;
      const Δλ = ((longitude - session.longitude) * Math.PI) / 180;
      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      // Must be within allowedRadius (bypassed in development)
      if (distance > allowedRadius && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: `You are outside the approved attendance location (${Math.round(distance)}m away). Must be within ${allowedRadius}m.` },
          { status: 400 }
        );
      } else if (distance > allowedRadius) {
        console.warn(`[DEV] Bypassing distance check. Distance was ${Math.round(distance)}m. Allowed: ${allowedRadius}m.`);
      }
    }

    const record = await prisma.attendance_records.create({
      data: { 
        session_id: session.id, 
        student_id: userId, 
        class_id: session.class_id,
        location: `Lat: ${latitude}, Lng: ${longitude}`,
        timestamp: new Date()
      },
    });

    // Audit log successful scan
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    await prisma.audit_logs.create({
      data: {
        user_id: userId,
        action: 'ATTENDANCE_MARKED',
        details: `Student marked present for session ${session.id}`,
        ip_address: ip
      }
    });

    return NextResponse.json({ record, distance: Math.round(distance) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
