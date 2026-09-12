import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { studentEligibleForClass } from '@/lib/markAttendance';
import { getAttendanceOfficer } from '@/lib/attendanceOfficer';
import { loadOpenSession, AttendanceError } from '@/lib/markAttendance';

export async function GET(req: Request) {
  try {
    const access = await getAttendanceOfficer();
    if ('error' in access) return access.error;

    const { officer, effective } = access;
    if (!effective.librarian.can_verify) {
      return NextResponse.json(
        { error: 'Student verification is disabled by institution permissions.', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    let session;
    try {
      session = await loadOpenSession(sessionId);
    } catch (error) {
      if (error instanceof AttendanceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    if (officer.institution_id && session.class.institution_id !== officer.institution_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (q.length < 2) {
      return NextResponse.json({ students: [] });
    }

    const students = await prisma.users.findMany({
      where: {
        role: 'STUDENT',
        ...(officer.institution_id ? { institution_id: officer.institution_id } : {}),
        OR: [
          { student_id: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        student_id: true,
        email: true,
        level: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    const eligible = [];
    for (const student of students) {
      if (await studentEligibleForClass(student.id, session.class_id)) {
        eligible.push(student);
      }
    }

    return NextResponse.json({ students: eligible });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
