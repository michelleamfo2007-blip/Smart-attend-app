import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';
import { NextResponse } from 'next/server';
import { canUseStaffAttendance } from '@/lib/attendanceAccess';
import { assertStaffToolAccess, getEffectivePermissions } from '@/lib/permissions';

export type AttendanceOfficer = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  institution_id: string | null;
  can_mark_attendance: boolean;
};

export { canUseStaffAttendance };

export async function getAttendanceOfficer(): Promise<
  | { officer: AttendanceOfficer; effective: Awaited<ReturnType<typeof getEffectivePermissions>> }
  | { error: NextResponse }
> {
  const auth = await getAuth();
  if (!auth?.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const officer = await prisma.users.findUnique({
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

  if (!officer || !canUseStaffAttendance(officer)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const gate = await assertStaffToolAccess(officer);
  if (!gate.ok) return { error: gate.response };

  return { officer, effective: gate.effective };
}

export function officerInstitutionFilter(officer: AttendanceOfficer) {
  return officer.institution_id ? { institution_id: officer.institution_id } : {};
}
