import prisma from '@/lib/prisma';
import { levelsMatch, semestersMatch } from '@/lib/attendance';

export const CHECK_IN_STATUS = {
  PRESENT: 'present',
  LATE: 'late',
  ABSENT: 'absent',
} as const;

export type CheckInStatus = (typeof CHECK_IN_STATUS)[keyof typeof CHECK_IN_STATUS];

export const VERIFICATION_TYPE = {
  SELF: 'self',
  STAFF: 'staff_verified',
} as const;

export const DEFAULT_LATE_GRACE_MINUTES = 15;

export function normalizeLateGraceMinutes(value?: number | null) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_LATE_GRACE_MINUTES;
  return Math.min(Math.round(n), 180);
}

export function isStaffVerifiedMethod(method?: string | null) {
  return method === 'staff_scan' || method === 'staff_manual';
}

export function resolveCheckInStatus(opts: {
  checkedAt: Date;
  scheduledStart?: Date | null;
  sessionCreatedAt?: Date | null;
  graceMinutes: number;
}): 'present' | 'late' {
  const start = opts.scheduledStart || opts.sessionCreatedAt;
  if (!start) return CHECK_IN_STATUS.PRESENT;
  const graceMs = normalizeLateGraceMinutes(opts.graceMinutes) * 60 * 1000;
  const cutoff = new Date(start).getTime() + graceMs;
  return opts.checkedAt.getTime() <= cutoff ? CHECK_IN_STATUS.PRESENT : CHECK_IN_STATUS.LATE;
}

export async function getInstitutionLateGrace(institutionId?: string | null) {
  if (!institutionId) return DEFAULT_LATE_GRACE_MINUTES;
  const institution = await prisma.institutions.findUnique({
    where: { id: institutionId },
    select: { late_grace_minutes: true },
  });
  return normalizeLateGraceMinutes(institution?.late_grace_minutes);
}

/** Students expected for a class (enrollments + level/semester match). */
export async function listExpectedStudents(cls: {
  id: string;
  institution_id?: string | null;
  level?: string | null;
  semester?: string | null;
}) {
  const enrollments = await prisma.enrollments.findMany({
    where: { class_id: cls.id },
    select: {
      student: {
        select: { id: true, name: true, student_id: true, email: true },
      },
    },
  });

  const byId = new Map<string, { id: string; name: string | null; student_id: string | null; email: string | null }>();
  for (const row of enrollments) {
    if (row.student) byId.set(row.student.id, row.student);
  }

  if (cls.institution_id && cls.level && cls.semester) {
    const students = await prisma.users.findMany({
      where: {
        institution_id: cls.institution_id,
        role: 'STUDENT',
      },
      select: { id: true, name: true, student_id: true, email: true, level: true, semester: true },
    });
    for (const student of students) {
      if (levelsMatch(student.level, cls.level) && semestersMatch(student.semester, cls.semester)) {
        byId.set(student.id, {
          id: student.id,
          name: student.name,
          student_id: student.student_id,
          email: student.email,
        });
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    String(a.name || a.student_id || '').localeCompare(String(b.name || b.student_id || ''))
  );
}
