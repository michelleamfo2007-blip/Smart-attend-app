export function canUseStaffAttendance(user: { role?: string | null; can_mark_attendance?: boolean | null } | null | undefined) {
  if (!user?.role || user.role === 'STUDENT') return false;
  return user.role === 'ADMIN' || Boolean(user.can_mark_attendance);
}
