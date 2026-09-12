import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { countExpectedStudents, isSessionOpen } from '@/lib/markAttendance';
import { getAttendanceOfficer } from '@/lib/attendanceOfficer';
import { ensureInstitutionSessions } from '@/lib/sessionScheduler';
import { CHECK_IN_STATUS } from '@/lib/attendanceStatus';

export async function GET() {
  try {
    const access = await getAttendanceOfficer();
    if ('error' in access) return access.error;

    const { officer, effective } = access;
    if (!effective.librarian.can_view_sessions) {
      return NextResponse.json(
        { error: 'Viewing sessions is disabled by institution permissions.', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }
    if (officer.institution_id) {
      await ensureInstitutionSessions(officer.institution_id).catch(() => undefined);
    }

    const classFilter = officer.institution_id
      ? { class: { institution_id: officer.institution_id } }
      : {};

    await prisma.attendance_sessions.updateMany({
      where: {
        status: { in: ['active', 'scheduled'] },
        expires_at: { lt: new Date() },
        ...classFilter,
      },
      data: { status: 'closed' },
    });

    const sessions = await prisma.attendance_sessions.findMany({
      where: {
        status: { in: ['active', 'scheduled'] },
        ...classFilter,
      },
      include: {
        class: {
          include: {
            classroom: { select: { id: true, name: true, building: true } },
            lecturer: { select: { id: true, name: true } },
          },
        },
        records: {
          select: { id: true, check_in_status: true, verification_type: true, method: true },
        },
      },
      orderBy: [{ status: 'asc' }, { scheduled_start: 'asc' }, { created_at: 'desc' }],
      take: 40,
    });

    const payload = await Promise.all(
      sessions.map(async (session) => {
        const expected = await countExpectedStudents(session.class);
        const present = session.records.filter((r) => r.check_in_status === CHECK_IN_STATUS.PRESENT).length;
        const late = session.records.filter((r) => r.check_in_status === CHECK_IN_STATUS.LATE).length;
        const checkedIn = session.records.length;
        const absent = Math.max(0, expected - checkedIn);
        const staffVerified = session.records.filter((r) => r.verification_type === 'staff_verified').length;
        const open = isSessionOpen(session);

        return {
          id: session.id,
          status: session.status,
          open,
          created_at: session.created_at,
          expires_at: session.expires_at,
          scheduled_start: session.scheduled_start,
          scheduled_end: session.scheduled_end,
          attendance_method: session.attendance_method,
          present,
          late,
          absent,
          checkedIn,
          expected,
          staffVerified,
          class: {
            id: session.class.id,
            name: session.class.name,
            course_code: session.class.course_code,
            level: session.class.level,
            classroom: session.class.classroom,
            lecturer: session.class.lecturer,
          },
        };
      })
    );

    // Prefer active first for default selection
    payload.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return 0;
    });

    return NextResponse.json({
      sessions: payload,
      officer: {
        id: officer.id,
        name: officer.name,
        role: officer.role,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
