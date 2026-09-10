import prisma from '@/lib/prisma';
import { getStudentClasses } from '@/lib/student';
import { getDistanceMeters, shouldEnforceGps, levelsMatch, semestersMatch } from '@/lib/attendance';

export const ATTENDANCE_METHODS = {
  DYNAMIC_QR: 'dynamic_qr',
  DESKTOP_QR: 'desktop_qr',
  STAFF_SCAN: 'staff_scan',
  STAFF_MANUAL: 'staff_manual',
} as const;

export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[keyof typeof ATTENDANCE_METHODS];

export const STUDENT_QR_METHODS: AttendanceMethod[] = [
  ATTENDANCE_METHODS.DYNAMIC_QR,
  ATTENDANCE_METHODS.DESKTOP_QR,
];

export class AttendanceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AttendanceError';
    this.status = status;
  }
}

export function methodLabel(method?: string | null) {
  switch (method) {
    case ATTENDANCE_METHODS.DESKTOP_QR:
      return 'Classroom desktop QR';
    case ATTENDANCE_METHODS.STAFF_SCAN:
      return 'Staff scan';
    case ATTENDANCE_METHODS.STAFF_MANUAL:
      return 'Staff manual';
    default:
      return 'Dynamic classroom QR';
  }
}

export function parseStudentAttendanceMethod(value?: string | null): AttendanceMethod {
  if (value === ATTENDANCE_METHODS.DESKTOP_QR) return ATTENDANCE_METHODS.DESKTOP_QR;
  return ATTENDANCE_METHODS.DYNAMIC_QR;
}

export function isSessionOpen(session: { status: string; expires_at: Date | null }) {
  return session.status === 'active' && (!session.expires_at || new Date(session.expires_at) >= new Date());
}

export async function closeExpiredSession(session: { id: string; status: string; expires_at: Date | null }) {
  if (session.status === 'active' && session.expires_at && new Date(session.expires_at) < new Date()) {
    await prisma.attendance_sessions.update({
      where: { id: session.id },
      data: { status: 'closed' },
    });
    return true;
  }
  return false;
}

export async function studentEligibleForClass(studentId: string, classId: string) {
  const classes = await getStudentClasses(studentId);
  return classes.some((cls) => cls.id === classId);
}

export async function countExpectedStudents(cls: {
  id: string;
  institution_id?: string | null;
  level?: string | null;
  semester?: string | null;
}) {
  const enrollments = await prisma.enrollments.findMany({
    where: { class_id: cls.id },
    select: { student_id: true },
  });
  const ids = new Set(enrollments.map((row) => row.student_id));

  if (cls.institution_id && cls.level && cls.semester) {
    const students = await prisma.users.findMany({
      where: {
        institution_id: cls.institution_id,
        role: 'STUDENT',
      },
      select: { id: true, level: true, semester: true },
    });
    for (const student of students) {
      if (levelsMatch(student.level, cls.level) && semestersMatch(student.semester, cls.semester)) {
        ids.add(student.id);
      }
    }
  }

  return ids.size;
}

export async function loadOpenSession(sessionId: string) {
  const session = await prisma.attendance_sessions.findUnique({
    where: { id: sessionId },
    include: { class: { include: { classroom: true } } },
  });

  if (!session) {
    throw new AttendanceError('Invalid attendance session.', 400);
  }

  if (await closeExpiredSession(session)) {
    throw new AttendanceError('This attendance session has ended.', 400);
  }

  if (!isSessionOpen(session)) {
    throw new AttendanceError('This attendance session has ended.', 400);
  }

  return session;
}

export async function markStudentPresent(opts: {
  studentId: string;
  sessionId: string;
  method: AttendanceMethod;
  markedById?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  enforceGps?: boolean;
  ip?: string;
}) {
  const session = await loadOpenSession(opts.sessionId);

  const student = await prisma.users.findUnique({
    where: { id: opts.studentId },
    select: { id: true, name: true, role: true, student_id: true },
  });

  if (!student || student.role !== 'STUDENT') {
    throw new AttendanceError('Student not found.', 404);
  }

  const eligible = await studentEligibleForClass(student.id, session.class_id);
  if (!eligible) {
    throw new AttendanceError('Student is not enrolled in this class. Attendance rejected.', 403);
  }

  await prisma.enrollments
    .create({
      data: {
        student_id: student.id,
        class_id: session.class_id,
      },
    })
    .catch(() => undefined);

  const existing = await prisma.attendance_records.findUnique({
    where: { student_id_session_id: { session_id: session.id, student_id: student.id } },
  });

  if (existing) {
    await prisma.audit_logs.create({
      data: {
        user_id: opts.markedById || student.id,
        action: 'DUPLICATE_SCAN_ATTEMPT',
        details: `Duplicate attendance attempt for session ${session.id} (${opts.method}).`,
        ip_address: opts.ip || 'unknown',
      },
    });
    throw new AttendanceError('This student has already been marked present for this session.', 400);
  }

  let distance = 0;
  if (opts.enforceGps) {
    // Indoor phone GPS is often 50–120m off; default 150m unless classroom sets its own radius.
    const allowedRadius = session.class.classroom?.radius_meters || 150;
    if (session.latitude != null && session.longitude != null) {
      if (opts.latitude == null || opts.longitude == null) {
        throw new AttendanceError('Location coordinates are required.', 400);
      }
      distance = getDistanceMeters(session.latitude, session.longitude, Number(opts.latitude), Number(opts.longitude));
      // Credit reported GPS accuracy (capped) so noisy fixes don't falsely reject nearby students.
      const accuracyCredit = Math.min(Math.max(Number(opts.accuracy) || 0, 0), 75);
      const effectiveDistance = Math.max(0, distance - accuracyCredit);
      if (effectiveDistance > allowedRadius && shouldEnforceGps()) {
        throw new AttendanceError(
          `You are outside the approved attendance location (${Math.round(distance)}m away). Must be within ${allowedRadius}m.`,
          400
        );
      }
    }
  }

  let record;
  try {
    record = await prisma.attendance_records.create({
      data: {
        session_id: session.id,
        student_id: student.id,
        class_id: session.class_id,
        student_name: student.name,
        location: opts.location || null,
        timestamp: new Date(),
        method: opts.method,
        marked_by_id: opts.markedById || null,
      },
      include: {
        student: { select: { id: true, name: true, student_id: true } },
        marked_by: { select: { id: true, name: true, email: true } },
        session: {
          include: {
            class: { select: { id: true, name: true, course_code: true, classroom: { select: { name: true } } } },
          },
        },
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new AttendanceError('This student has already been marked present for this session.', 400);
    }
    throw error;
  }

  await prisma.audit_logs.create({
    data: {
      user_id: opts.markedById || student.id,
      action: 'ATTENDANCE_MARKED',
      details: `Attendance marked for ${student.name || student.id} on session ${session.id} via ${opts.method}.`,
      ip_address: opts.ip || 'unknown',
    },
  });

  return { record, session, student, distance: Math.round(distance) };
}
