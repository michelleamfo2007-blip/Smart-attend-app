import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {
  DEFAULT_ROLE_PERMISSIONS,
  parseRolePermissions,
  type RolePermissions,
} from '@/lib/rolePermissions';
import { canUseStaffAttendance } from '@/lib/attendanceAccess';

export async function getInstitutionRolePermissions(
  institutionId?: string | null
): Promise<RolePermissions> {
  if (!institutionId) return DEFAULT_ROLE_PERMISSIONS;
  const institution = await prisma.institutions.findUnique({
    where: { id: institutionId },
    select: { role_permissions: true },
  });
  return parseRolePermissions(institution?.role_permissions);
}

export function permissionDenied(message: string) {
  return NextResponse.json(
    { error: message, code: 'PERMISSION_DENIED' },
    { status: 403 }
  );
}

/** Effective capabilities for the signed-in user (UI + API). */
export async function getEffectivePermissions(user: {
  role?: string | null;
  institution_id?: string | null;
  can_mark_attendance?: boolean | null;
}) {
  const rolePermissions = await getInstitutionRolePermissions(user.institution_id);
  const isTenantAdmin = user.role === 'ADMIN' && Boolean(user.institution_id);
  const isSuperAdmin = user.role === 'ADMIN' && !user.institution_id;
  const isLecturer = user.role === 'LECTURER';
  const isLibrarian = user.role === 'STAFF';
  const isAdmin = isTenantAdmin || isSuperAdmin;

  const canUseLibrarianTools =
    isAdmin ||
    (isLibrarian && rolePermissions.librarian.staff_assisted_attendance) ||
    (isLecturer &&
      Boolean(user.can_mark_attendance) &&
      rolePermissions.lecturer.manually_mark_students &&
      rolePermissions.librarian.staff_assisted_attendance);

  const canEdit =
    isAdmin ||
    (isLecturer && rolePermissions.lecturer.edit_attendance) ||
    (isLibrarian && rolePermissions.librarian.edit_attendance);

  const canDelete =
    isAdmin ||
    (isLecturer && rolePermissions.lecturer.delete_attendance) ||
    (isLibrarian && rolePermissions.librarian.delete_attendance);

  return {
    rolePermissions,
    isTenantAdmin,
    isSuperAdmin,
    lecturer: {
      ...rolePermissions.lecturer,
      view_assigned_classes: true,
      view_attendance: true,
      verify_location: true,
      manage_students: false,
      manage_lecturers: false,
      manage_institution: false,
    },
    librarian: {
      ...rolePermissions.librarian,
      manage_institution: false,
      can_use_tools: canUseLibrarianTools,
      can_mark: canUseLibrarianTools && rolePermissions.librarian.staff_assisted_attendance,
      can_view_sessions:
        canUseLibrarianTools && rolePermissions.librarian.view_active_attendance,
      can_verify: canUseLibrarianTools && rolePermissions.librarian.verify_students,
      can_history:
        canUseLibrarianTools && rolePermissions.librarian.view_attendance_history,
      can_flag: canUseLibrarianTools && rolePermissions.librarian.flag_suspicious,
      can_edit: canEdit,
      can_delete: canDelete,
    },
  };
}

export async function assertStaffToolAccess(user: {
  role?: string | null;
  institution_id?: string | null;
  can_mark_attendance?: boolean | null;
}) {
  if (!canUseStaffAttendance(user)) {
    return { ok: false as const, response: permissionDenied('Forbidden') };
  }
  const effective = await getEffectivePermissions(user);
  if (!effective.librarian.can_use_tools) {
    return {
      ok: false as const,
      response: permissionDenied(
        'Librarian / officer tools are disabled by your institution permissions.'
      ),
      effective,
    };
  }
  return { ok: true as const, effective };
}

/** Resolve whether this user may edit or delete a specific record. */
export async function canMutateAttendanceRecord(opts: {
  user: {
    id: string;
    role?: string | null;
    institution_id?: string | null;
    can_mark_attendance?: boolean | null;
  };
  record: {
    session: {
      lecturer_id: string;
      class: { institution_id?: string | null };
    };
  };
  action: 'edit' | 'delete';
}) {
  const { user, record, action } = opts;
  if (user.role === 'ADMIN') {
    if (!user.institution_id) return true;
    return record.session.class.institution_id === user.institution_id;
  }

  const perms = await getInstitutionRolePermissions(user.institution_id);

  if (user.role === 'LECTURER') {
    const onOwnSession = record.session.lecturer_id === user.id;
    if (onOwnSession) {
      return action === 'edit' ? perms.lecturer.edit_attendance : perms.lecturer.delete_attendance;
    }
    if (
      user.can_mark_attendance &&
      perms.lecturer.manually_mark_students &&
      (!user.institution_id || record.session.class.institution_id === user.institution_id)
    ) {
      return action === 'edit' ? perms.librarian.edit_attendance : perms.librarian.delete_attendance;
    }
    return false;
  }

  if (user.role === 'STAFF') {
    if (user.institution_id && record.session.class.institution_id !== user.institution_id) {
      return false;
    }
    return action === 'edit' ? perms.librarian.edit_attendance : perms.librarian.delete_attendance;
  }

  return false;
}
