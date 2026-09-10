import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { countExpectedStudents, isSessionOpen } from '@/lib/markAttendance';
import { getAttendanceOfficer, officerInstitutionFilter } from '@/lib/attendanceOfficer';

export async function GET() {
  try {
    const access = await getAttendanceOfficer();
    if ('error' in access) return access.error;

    const { officer } = access;
    const classFilter = officer.institution_id
      ? { class: { institution_id: officer.institution_id } }
      : {};

    await prisma.attendance_sessions.updateMany({
      where: {
        status: 'active',
        expires_at: { lt: new Date() },
        ...classFilter,
      },
      data: { status: 'closed' },
    });

    const sessions = await prisma.attendance_sessions.findMany({
      where: {
        status: 'active',
        ...classFilter,
      },
      include: {
        class: {
          include: { classroom: { select: { id: true, name: true } } },
        },
        records: {
          select: { id: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const openSessions = sessions.filter((session) => isSessionOpen(session));
    const payload = await Promise.all(
      openSessions.map(async (session) => {
        const expected = await countExpectedStudents(session.class);
        return {
          id: session.id,
          status: session.status,
          created_at: session.created_at,
          expires_at: session.expires_at,
          present: session.records.length,
          expected,
          class: {
            id: session.class.id,
            name: session.class.name,
            course_code: session.class.course_code,
            level: session.class.level,
            classroom: session.class.classroom,
          },
        };
      })
    );

    return NextResponse.json({
      sessions: payload,
      officer: {
        id: officer.id,
        name: officer.name,
        role: officer.role,
      },
      institutionFilter: officerInstitutionFilter(officer),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
