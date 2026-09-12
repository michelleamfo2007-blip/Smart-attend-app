import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';
import { canMutateAttendanceRecord, permissionDenied } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { CHECK_IN_STATUS } from '@/lib/attendanceStatus';

async function loadActor() {
  const auth = await getAuth();
  if (!auth?.userId) return null;
  return prisma.users.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      institution_id: true,
      can_mark_attendance: true,
    },
  });
}

async function loadRecord(id: string) {
  return prisma.attendance_records.findUnique({
    where: { id },
    include: {
      session: {
        include: {
          class: { select: { institution_id: true, name: true, course_code: true } },
        },
      },
      student: { select: { id: true, name: true, student_id: true } },
    },
  });
}

/** Edit Present/Late status or notes — permission gated. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await loadActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const record = await loadRecord(id);
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const allowed = await canMutateAttendanceRecord({
      user: actor,
      record,
      action: 'edit',
    });
    if (!allowed) {
      return permissionDenied('You are not allowed to edit attendance records.');
    }

    const body = await req.json();
    const data: { check_in_status?: string; notes?: string | null } = {};
    if (body.checkInStatus != null) {
      if (![CHECK_IN_STATUS.PRESENT, CHECK_IN_STATUS.LATE].includes(body.checkInStatus)) {
        return NextResponse.json({ error: 'checkInStatus must be present or late.' }, { status: 400 });
      }
      data.check_in_status = body.checkInStatus;
    }
    if (body.notes !== undefined) {
      data.notes = body.notes == null || body.notes === '' ? null : String(body.notes).trim();
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.attendance_records.update({
      where: { id },
      data,
    });

    await logAudit({
      userId: actor.id,
      action: 'ATTENDANCE_MODIFIED',
      details: `Record ${id} updated: ${JSON.stringify(data)}; student=${record.student_id}; session=${record.session_id}`,
      ip: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ record: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Delete a check-in — off by default for lecturer/librarian. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await loadActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const record = await loadRecord(id);
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const allowed = await canMutateAttendanceRecord({
      user: actor,
      record,
      action: 'delete',
    });
    if (!allowed) {
      return permissionDenied('You are not allowed to delete attendance records.');
    }

    await prisma.attendance_records.delete({ where: { id } });
    await logAudit({
      userId: actor.id,
      action: 'ATTENDANCE_DELETED',
      details: `Record ${id} deleted; student=${record.student_id}; session=${record.session_id}`,
      ip: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
