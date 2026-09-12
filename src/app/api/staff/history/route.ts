import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAttendanceOfficer } from '@/lib/attendanceOfficer';
import { methodLabel } from '@/lib/markAttendance';

/** Recent attendance activity for librarian history view. */
export async function GET(req: Request) {
  try {
    const access = await getAttendanceOfficer();
    if ('error' in access) return access.error;

    const { officer, effective } = access;
    if (!effective.librarian.can_history) {
      return NextResponse.json(
        { error: 'Attendance history is disabled by institution permissions.', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const take = Math.min(Number(searchParams.get('limit') || 40), 100);

    const records = await prisma.attendance_records.findMany({
      where: {
        ...(officer.institution_id
          ? { session: { class: { institution_id: officer.institution_id } } }
          : {}),
        ...(q
          ? {
              OR: [
                { student_name: { contains: q, mode: 'insensitive' } },
                { student: { student_id: { contains: q, mode: 'insensitive' } } },
                { student: { name: { contains: q, mode: 'insensitive' } } },
                { session: { class: { name: { contains: q, mode: 'insensitive' } } } },
                { session: { class: { course_code: { contains: q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: {
        student: { select: { id: true, name: true, student_id: true } },
        marked_by: { select: { id: true, name: true } },
        session: {
          select: {
            id: true,
            status: true,
            scheduled_start: true,
            class: {
              select: {
                name: true,
                course_code: true,
                classroom: { select: { name: true } },
              },
            },
          },
        },
        flags: {
          where: { status: 'open' },
          select: { id: true, reason: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take,
    });

    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        status: r.check_in_status,
        method: r.method,
        methodLabel: methodLabel(r.method),
        verificationType: r.verification_type,
        notes: r.notes,
        studentName: r.student?.name || r.student_name,
        studentIndex: r.student?.student_id,
        markedBy: r.marked_by?.name || null,
        course: r.session.class.course_code || r.session.class.name,
        room: r.session.class.classroom?.name || null,
        sessionId: r.session.id,
        sessionStatus: r.session.status,
        flagCount: r.flags.length,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
