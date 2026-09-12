/** Sync check for UI when only the user row is available (no institution matrix loaded yet). */
export function canUseStaffAttendance(user: {
  role?: string | null;
  can_mark_attendance?: boolean | null;
  permissions?: { librarian?: { can_use_tools?: boolean } } | null;
} | null | undefined) {
  if (!user?.role || user.role === 'STUDENT') return false;
  if (user.permissions?.librarian?.can_use_tools != null) {
    return Boolean(user.permissions.librarian.can_use_tools);
  }
  return user.role === 'ADMIN' || Boolean(user.can_mark_attendance);
}
