import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import {
  AttendanceError,
  markStudentPresent,
  parseStudentAttendanceMethod,
} from '@/lib/markAttendance';

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
        marked_by: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const sessionId = body.sessionId as string | undefined;
    const attendanceCode = body.attendanceCode as string | undefined;
    const latitude = body.latitude;
    const longitude = body.longitude;
    const qrTimestamp = body.qrTimestamp ?? body.t ?? body.timestamp;
    const deviceId = body.device_id || body.deviceId;
    const method = parseStudentAttendanceMethod(body.method || body.source);

    if ((!sessionId && !attendanceCode) || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        device_id: true,
        needs_device_reset: true,
      },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can mark attendance' }, { status: 403 });
    }

    if (!student.needs_device_reset && student.device_id) {
      if (!deviceId) {
        return NextResponse.json(
          { error: 'This account is bound to a registered device. Open the mobile app to check in.' },
          { status: 403 }
        );
      }
      if (deviceId !== student.device_id) {
        return NextResponse.json(
          { error: 'This account is registered on another device. Please contact an administrator if you got a new phone.' },
          { status: 403 }
        );
      }
    }

    if (sessionId && qrTimestamp == null) {
      return NextResponse.json({ error: 'Invalid QR Code format. Dynamic QR required.' }, { status: 400 });
    }

    if (sessionId && qrTimestamp != null) {
      const qrAgeMs = Date.now() - Number(qrTimestamp);
      if (Number.isNaN(qrAgeMs) || qrAgeMs > 30000 || qrAgeMs < -10000) {
        return NextResponse.json(
          { error: 'This QR code has expired. Please scan the current code on the screen.' },
          { status: 400 }
        );
      }
    }

    const resolvedSession = sessionId
      ? await prisma.attendance_sessions.findUnique({ where: { id: sessionId } })
      : await prisma.attendance_sessions.findFirst({
          where: {
            status: 'active',
            attendance_code: attendanceCode,
          },
        });

    if (!resolvedSession) {
      return NextResponse.json({ error: 'Invalid attendance code or session has ended.' }, { status: 400 });
    }

    if (student.needs_device_reset && deviceId) {
      await prisma.users.update({
        where: { id: userId },
        data: { device_id: deviceId, needs_device_reset: false },
      });
    } else if (!student.device_id && deviceId) {
      await prisma.users.update({
        where: { id: userId },
        data: { device_id: deviceId },
      });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const accuracy = body.accuracy != null ? Number(body.accuracy) : null;
    const { record, distance } = await markStudentPresent({
      studentId: userId,
      sessionId: resolvedSession.id,
      method,
      location: `Lat: ${latitude}, Lng: ${longitude}`,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy,
      enforceGps: true,
      ip,
    });

    return NextResponse.json({ record, distance }, { status: 201 });
  } catch (error) {
    if (error instanceof AttendanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
