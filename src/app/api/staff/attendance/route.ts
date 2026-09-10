import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAttendanceOfficer } from '@/lib/attendanceOfficer';
import {
  ATTENDANCE_METHODS,
  AttendanceError,
  loadOpenSession,
  markStudentPresent,
} from '@/lib/markAttendance';

function parseStudentQr(raw: unknown) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const data = JSON.parse(raw);
    if (data.type === 'smartattend_student' && (data.id || data.student_id)) {
      return { id: data.id as string | undefined, student_id: data.student_id as string | undefined };
    }
  } catch {
    return { student_id: raw.trim() };
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const access = await getAttendanceOfficer();
    if ('error' in access) return access.error;

    const { officer } = access;
    const body = await req.json();
    const sessionId = body.sessionId as string | undefined;
    const method = body.method === ATTENDANCE_METHODS.STAFF_MANUAL
      ? ATTENDANCE_METHODS.STAFF_MANUAL
      : ATTENDANCE_METHODS.STAFF_SCAN;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await loadOpenSession(sessionId);
    if (officer.institution_id && session.class.institution_id !== officer.institution_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let studentId = typeof body.studentId === 'string' ? body.studentId : undefined;
    const qr = parseStudentQr(body.studentQr);

    if (!studentId && qr?.id) {
      studentId = qr.id;
    }

    if (!studentId && (qr?.student_id || body.student_id)) {
      const index = qr?.student_id || body.student_id;
      const match = await prisma.users.findFirst({
        where: {
          role: 'STUDENT',
          student_id: String(index),
          ...(officer.institution_id ? { institution_id: officer.institution_id } : {}),
        },
        select: { id: true },
      });
      studentId = match?.id;
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Student could not be identified.' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const { record, student } = await markStudentPresent({
      studentId,
      sessionId: session.id,
      method,
      markedById: officer.id,
      location: `Staff: ${officer.name || officer.id}`,
      enforceGps: false,
      ip,
    });

    return NextResponse.json({
      message: 'Attendance Recorded',
      record: {
        id: record.id,
        method: record.method,
        timestamp: record.timestamp,
        studentName: student.name,
        studentId: student.student_id,
        course: record.session.class.course_code || record.session.class.name,
        className: record.session.class.name,
        room: record.session.class.classroom?.name || null,
        markedBy: officer.name,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AttendanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
