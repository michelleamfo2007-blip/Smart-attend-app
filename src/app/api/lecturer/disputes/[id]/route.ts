import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { action } = await req.json();
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const dispute = await prisma.attendance_disputes.findUnique({ where: { id } });
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const course = await prisma.classes.findUnique({ where: { id: dispute.class_id } });
    if (!course || course.lecturer_id !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'approve') {
      await prisma.attendance_records.create({
        data: {
          student_id: dispute.student_id,
          class_id: dispute.class_id,
          session_id: dispute.session_id,
          timestamp: new Date(),
          method: 'dynamic_qr',
          marked_by_id: auth.userId,
        },
      }).catch(() => undefined);
    }

    const updated = await prisma.attendance_disputes.update({
      where: { id },
      data: { status: action === 'approve' ? 'approved' : 'rejected' },
    });

    return NextResponse.json({ dispute: updated });
  } catch (error) {
    console.error('Lecturer dispute PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
