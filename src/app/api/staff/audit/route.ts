import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAttendanceOfficer } from '@/lib/attendanceOfficer';
import { ATTENDANCE_AUDIT_ACTIONS } from '@/lib/audit';

/** Librarian-visible attendance / suspicious audit trail (no full admin access). */
export async function GET(req: Request) {
  try {
    const access = await getAttendanceOfficer();
    if ('error' in access) return access.error;
    const { officer, effective } = access;

    if (!effective.librarian.can_flag && !effective.librarian.can_history) {
      return NextResponse.json(
        { error: 'Audit visibility is disabled by institution permissions.', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get('limit') || 80), 200);

    const logs = await prisma.audit_logs.findMany({
      where: {
        action: { in: [...ATTENDANCE_AUDIT_ACTIONS] },
        ...(officer.institution_id
          ? {
              OR: [
                { institution_id: officer.institution_id },
                { user: { institution_id: officer.institution_id } },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
      take,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
