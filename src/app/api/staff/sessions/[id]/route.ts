import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAttendanceOfficer } from '@/lib/attendanceOfficer';
import { AttendanceError, isSessionOpen, methodLabel } from '@/lib/markAttendance';
import { CHECK_IN_STATUS, listExpectedStudents } from '@/lib/attendanceStatus';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    const session = await prisma.attendance_sessions.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            classroom: { select: { id: true, name: true, building: true } },
            lecturer: { select: { id: true, name: true } },
          },
        },
        records: {
          include: {
            student: { select: { id: true, name: true, student_id: true } },
            marked_by: { select: { id: true, name: true } },
            flags: {
              where: { status: 'open' },
              select: { id: true, reason: true, created_at: true },
            },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (officer.institution_id && session.class.institution_id !== officer.institution_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const expectedStudents = await listExpectedStudents(session.class);
    const byStudent = new Map(session.records.map((r) => [r.student_id, r]));

    const roster = expectedStudents.map((student) => {
      const record = byStudent.get(student.id);
      if (!record) {
        return {
          studentId: student.id,
          name: student.name,
          studentIndex: student.student_id,
          status: session.status === 'closed' || !isSessionOpen(session)
            ? CHECK_IN_STATUS.ABSENT
            : 'pending',
          method: null,
          methodLabel: null,
          verificationType: null,
          timestamp: null,
          notes: null,
          markedBy: null,
          recordId: null,
          flags: [] as { id: string; reason: string; created_at: Date }[],
        };
      }
      return {
        studentId: student.id,
        name: student.name || record.student_name,
        studentIndex: student.student_id,
        status: record.check_in_status || CHECK_IN_STATUS.PRESENT,
        method: record.method,
        methodLabel: methodLabel(record.method),
        verificationType: record.verification_type,
        timestamp: record.timestamp,
        notes: record.notes,
        markedBy: record.marked_by?.name || null,
        recordId: record.id,
        flags: record.flags,
      };
    });

    const present = roster.filter((r) => r.status === CHECK_IN_STATUS.PRESENT).length;
    const late = roster.filter((r) => r.status === CHECK_IN_STATUS.LATE).length;
    const absent = roster.filter((r) => r.status === CHECK_IN_STATUS.ABSENT || r.status === 'pending').length;

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        open: isSessionOpen(session),
        scheduled_start: session.scheduled_start,
        scheduled_end: session.scheduled_end,
        expires_at: session.expires_at,
        attendance_method: session.attendance_method,
        class: {
          id: session.class.id,
          name: session.class.name,
          course_code: session.class.course_code,
          level: session.class.level,
          classroom: session.class.classroom,
          lecturer: session.class.lecturer,
        },
      },
      counts: {
        expected: expectedStudents.length,
        present,
        late,
        absent,
        staffVerified: roster.filter((r) => r.verificationType === 'staff_verified').length,
      },
      roster,
    });
  } catch (error) {
    if (error instanceof AttendanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
