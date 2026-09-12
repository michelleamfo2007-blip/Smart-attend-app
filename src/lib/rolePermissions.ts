export type LecturerPermissions = {
  view_assigned_classes: boolean;
  view_attendance: boolean;
  verify_location: boolean;
  use_short_code: boolean;
  manually_mark_students: boolean;
  edit_attendance: boolean;
  delete_attendance: boolean;
  manage_students: boolean;
  manage_lecturers: boolean;
  manage_institution: boolean;
};

export type LibrarianPermissions = {
  view_active_attendance: boolean;
  verify_students: boolean;
  staff_assisted_attendance: boolean;
  view_attendance_history: boolean;
  flag_suspicious: boolean;
  edit_attendance: boolean;
  delete_attendance: boolean;
  manage_institution: boolean;
};

export type RolePermissions = {
  lecturer: LecturerPermissions;
  librarian: LibrarianPermissions;
};

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  lecturer: {
    view_assigned_classes: true,
    view_attendance: true,
    verify_location: true,
    use_short_code: true,
    manually_mark_students: false,
    edit_attendance: false,
    delete_attendance: false,
    manage_students: false,
    manage_lecturers: false,
    manage_institution: false,
  },
  librarian: {
    view_active_attendance: true,
    verify_students: true,
    staff_assisted_attendance: true,
    view_attendance_history: true,
    flag_suspicious: true,
    edit_attendance: false,
    delete_attendance: false,
    manage_institution: false,
  },
};

/** Permissions Tenant Admin may toggle (everything else is locked by security policy). */
export const CONFIGURABLE_LECTURER_KEYS = [
  'use_short_code',
  'manually_mark_students',
  'edit_attendance',
  'delete_attendance',
] as const;

export const CONFIGURABLE_LIBRARIAN_KEYS = [
  'view_active_attendance',
  'verify_students',
  'staff_assisted_attendance',
  'view_attendance_history',
  'flag_suspicious',
  'edit_attendance',
  'delete_attendance',
] as const;

function asBool(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

export function parseRolePermissions(raw: unknown): RolePermissions {
  const src = (raw && typeof raw === 'object' ? raw : {}) as {
    lecturer?: Partial<LecturerPermissions>;
    librarian?: Partial<LibrarianPermissions>;
  };

  const lecturerIn = src.lecturer || {};
  const librarianIn = src.librarian || {};
  const d = DEFAULT_ROLE_PERMISSIONS;

  return {
    lecturer: {
      // Locked — lecturers never become tenant admins via this matrix
      view_assigned_classes: true,
      view_attendance: true,
      verify_location: true,
      manage_students: false,
      manage_lecturers: false,
      manage_institution: false,
      use_short_code: asBool(lecturerIn.use_short_code, d.lecturer.use_short_code),
      manually_mark_students: asBool(
        lecturerIn.manually_mark_students,
        d.lecturer.manually_mark_students
      ),
      edit_attendance: asBool(lecturerIn.edit_attendance, d.lecturer.edit_attendance),
      delete_attendance: asBool(lecturerIn.delete_attendance, d.lecturer.delete_attendance),
    },
    librarian: {
      manage_institution: false,
      view_active_attendance: asBool(
        librarianIn.view_active_attendance,
        d.librarian.view_active_attendance
      ),
      verify_students: asBool(librarianIn.verify_students, d.librarian.verify_students),
      staff_assisted_attendance: asBool(
        librarianIn.staff_assisted_attendance,
        d.librarian.staff_assisted_attendance
      ),
      view_attendance_history: asBool(
        librarianIn.view_attendance_history,
        d.librarian.view_attendance_history
      ),
      flag_suspicious: asBool(librarianIn.flag_suspicious, d.librarian.flag_suspicious),
      edit_attendance: asBool(librarianIn.edit_attendance, d.librarian.edit_attendance),
      delete_attendance: asBool(librarianIn.delete_attendance, d.librarian.delete_attendance),
    },
  };
}

export function mergeRolePermissionsPatch(
  current: RolePermissions,
  patch: Partial<{ lecturer: Partial<LecturerPermissions>; librarian: Partial<LibrarianPermissions> }>
): RolePermissions {
  return parseRolePermissions({
    lecturer: { ...current.lecturer, ...(patch.lecturer || {}) },
    librarian: { ...current.librarian, ...(patch.librarian || {}) },
  });
}

export const PERMISSION_LABELS: Record<string, { title: string; help: string }> = {
  'lecturer.use_short_code': {
    title: 'Use short attendance code',
    help: 'Allow lecturers to generate and refresh the 6-digit short code.',
  },
  'lecturer.manually_mark_students': {
    title: 'Manually mark students (officer mode)',
    help: 'Allow lecturers who also have officer access to use the librarian assist tools.',
  },
  'lecturer.edit_attendance': {
    title: 'Edit attendance records',
    help: 'Allow lecturers to correct Present/Late status or notes on their sessions.',
  },
  'lecturer.delete_attendance': {
    title: 'Delete attendance records',
    help: 'Off by default. Only enable if your school policy allows lecturers to remove check-ins.',
  },
  'librarian.view_active_attendance': {
    title: 'View active / scheduled sessions',
    help: 'See live class sessions on the librarian dashboard.',
  },
  'librarian.verify_students': {
    title: 'Verify / search students',
    help: 'Search roster and confirm student identity.',
  },
  'librarian.staff_assisted_attendance': {
    title: 'Staff-assisted attendance',
    help: 'Scan or manually mark students who do not have a smartphone.',
  },
  'librarian.view_attendance_history': {
    title: 'View attendance history',
    help: 'Browse recent check-ins across classes.',
  },
  'librarian.flag_suspicious': {
    title: 'Flag suspicious activity',
    help: 'Create and review suspicious-attendance flags.',
  },
  'librarian.edit_attendance': {
    title: 'Edit attendance records',
    help: 'Correct Present/Late status or notes. Off by default.',
  },
  'librarian.delete_attendance': {
    title: 'Delete attendance records',
    help: 'Off by default. Librarians cannot delete unless explicitly enabled.',
  },
};
