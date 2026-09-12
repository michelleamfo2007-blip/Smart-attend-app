import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAttendanceOfficer } from '@/lib/attendanceOfficer';
import { logAudit } from '@/lib/audit';

/** Flag suspicious attendance — does not delete records. */
export async function GET() {
  try {
    const access = await getAttendanceOfficer();
    if ('error' in access) return access.error;
    const { officer, effective } = access;
    if (!effective.librarian.can_flag) {
      return NextResponse.json(
        { error: 'Flagging is disabled by institution permissions.', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    const flags = await prisma.attendance_flags.findMany({
      where: {
        status: 'open',
        ...(officer.institution_id ? { institution_id: officer.institution_id } : {}),
      },
      include: {
        record: {
          select: {
            id: true,
            student_name: true,
            method: true,
            check_in_status: true,
            timestamp: true,
            student: { select: { student_id: true, name: true } },
            session: {
              select: {
                class: { select: { name: true, course_code: true } },
              },
            },
          },
        },
        flagged_by_user: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return NextResponse.json({ flags });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await getAttendanceOfficer();
    if ('error' in access) return access.error;
    const { officer, effective } = access;
    if (!effective.librarian.can_flag) {
      return NextResponse.json(
        { error: 'Flagging is disabled by institution permissions.', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < 3) {
      return NextResponse.json({ error: 'A reason is required to flag attendance.' }, { status: 400 });
    }

    let institutionId = officer.institution_id;
    let recordId: string | null = typeof body.recordId === 'string' ? body.recordId : null;
    let sessionId: string | null = typeof body.sessionId === 'string' ? body.sessionId : null;
    let studentId: string | null = typeof body.studentId === 'string' ? body.studentId : null;

    if (recordId) {
      const record = await prisma.attendance_records.findUnique({
        where: { id: recordId },
        include: { session: { include: { class: { select: { institution_id: true } } } } },
      });
      if (!record) {
        return NextResponse.json({ error: 'Attendance record not found.' }, { status: 404 });
      }
      if (officer.institution_id && record.session.class.institution_id !== officer.institution_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      institutionId = record.session.class.institution_id;
      sessionId = record.session_id;
      studentId = record.student_id;
    }

    if (!institutionId) {
      return NextResponse.json({ error: 'Institution context required.' }, { status: 400 });
    }

    const flag = await prisma.attendance_flags.create({
      data: {
        institution_id: institutionId,
        record_id: recordId,
        session_id: sessionId,
        student_id: studentId,
        flagged_by: officer.id,
        reason,
      },
    });

    await logAudit({
      userId: officer.id,
      action: 'ATTENDANCE_FLAGGED',
      details: `Flag ${flag.id}: ${reason}; record=${recordId || 'n/a'}; session=${sessionId || 'n/a'}; student=${studentId || 'n/a'}`,
      ip: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ flag }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const access = await getAttendanceOfficer();
    if ('error' in access) return access.error;
    const { officer, effective } = access;
    if (!effective.librarian.can_flag) {
      return NextResponse.json(
        { error: 'Flagging is disabled by institution permissions.', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const flagId = body.flagId as string | undefined;
    const status = body.status as string | undefined;
    if (!flagId || !['reviewed', 'dismissed', 'open'].includes(String(status))) {
      return NextResponse.json({ error: 'flagId and status are required.' }, { status: 400 });
    }

    const existing = await prisma.attendance_flags.findUnique({ where: { id: flagId } });
    if (!existing) {
      return NextResponse.json({ error: 'Flag not found.' }, { status: 404 });
    }
    if (officer.institution_id && existing.institution_id !== officer.institution_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const flag = await prisma.attendance_flags.update({
      where: { id: flagId },
      data: { status: String(status) },
    });

    await logAudit({
      userId: officer.id,
      action: 'ATTENDANCE_FLAG_UPDATED',
      details: `Flag ${flagId} → ${status}`,
      ip: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ flag });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
