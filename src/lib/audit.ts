import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';

export const AUDIT_ACTIONS = {
  SESSION_AUTO_SCHEDULED: 'SESSION_AUTO_SCHEDULED',
  SESSION_AUTO_OPENED: 'SESSION_AUTO_OPENED',
  SESSION_AUTO_CLOSED: 'SESSION_AUTO_CLOSED',
  SHORT_CODE_GENERATED: 'SHORT_CODE_GENERATED',
  QR_GENERATED: 'QR_GENERATED',
  QR_EXPIRED: 'QR_EXPIRED',
  ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',
  STAFF_ATTENDANCE_MARKED: 'STAFF_ATTENDANCE_MARKED',
  ATTENDANCE_REJECTED: 'ATTENDANCE_REJECTED',
  ATTENDANCE_MODIFIED: 'ATTENDANCE_MODIFIED',
  ATTENDANCE_DELETED: 'ATTENDANCE_DELETED',
  ATTENDANCE_FLAGGED: 'ATTENDANCE_FLAGGED',
  ATTENDANCE_FLAG_UPDATED: 'ATTENDANCE_FLAG_UPDATED',
  DUPLICATE_SCAN_ATTEMPT: 'DUPLICATE_SCAN_ATTEMPT',
  LECTURER_LOCATION_PASSED: 'LECTURER_LOCATION_PASSED',
  LECTURER_LOCATION_FAILED: 'LECTURER_LOCATION_FAILED',
  LECTURER_LOCATION_SKIPPED: 'LECTURER_LOCATION_SKIPPED',
  SUSPICIOUS_ACTIVITY_DETECTED: 'SUSPICIOUS_ACTIVITY_DETECTED',
} as const;

export type AuditResult = 'success' | 'failure' | 'warning' | 'info';

export type AuditEvent = {
  userId?: string | null;
  role?: string | null;
  institutionId?: string | null;
  sessionId?: string | null;
  studentId?: string | null;
  action: string;
  result?: AuditResult;
  details: string;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

/** Backward-compatible + structured attendance audit writer. */
export async function logAudit(options: AuditEvent | {
  userId?: string | null;
  action: string;
  details: string;
  ip?: string | null;
}) {
  try {
    const event = options as AuditEvent;
    await prisma.audit_logs.create({
      data: {
        user_id: event.userId || undefined,
        role: event.role || undefined,
        institution_id: event.institutionId || undefined,
        session_id: event.sessionId || undefined,
        student_id: event.studentId || undefined,
        result: event.result || 'info',
        action: event.action,
        details: event.details,
        metadata:
          event.metadata == null
            ? undefined
            : (event.metadata as Prisma.InputJsonValue),
        ip_address: event.ip || 'unknown',
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function logAttendanceRejection(options: {
  userId?: string | null;
  role?: string | null;
  institutionId?: string | null;
  sessionId?: string | null;
  studentId?: string | null;
  reason: string;
  details: string;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await logAudit({
    userId: options.userId,
    role: options.role || 'STUDENT',
    institutionId: options.institutionId,
    sessionId: options.sessionId,
    studentId: options.studentId || options.userId,
    action: AUDIT_ACTIONS.ATTENDANCE_REJECTED,
    result: 'failure',
    details: `${options.reason}: ${options.details}`,
    metadata: { reason: options.reason, ...(options.metadata || {}) },
    ip: options.ip,
  });

  // Fire-and-forget suspicious pattern check
  try {
    const { evaluateSuspiciousFromRejection } = await import('@/lib/suspiciousActivity');
    await evaluateSuspiciousFromRejection({
      studentId: options.studentId || options.userId || null,
      institutionId: options.institutionId || null,
      sessionId: options.sessionId || null,
      reason: options.reason,
      ip: options.ip,
    });
  } catch {
    // never block attendance path on detector failure
  }
}

export const ATTENDANCE_AUDIT_ACTIONS = [
  AUDIT_ACTIONS.SESSION_AUTO_SCHEDULED,
  AUDIT_ACTIONS.SESSION_AUTO_OPENED,
  AUDIT_ACTIONS.SESSION_AUTO_CLOSED,
  AUDIT_ACTIONS.SHORT_CODE_GENERATED,
  AUDIT_ACTIONS.QR_GENERATED,
  AUDIT_ACTIONS.QR_EXPIRED,
  AUDIT_ACTIONS.ATTENDANCE_MARKED,
  AUDIT_ACTIONS.STAFF_ATTENDANCE_MARKED,
  AUDIT_ACTIONS.ATTENDANCE_REJECTED,
  AUDIT_ACTIONS.ATTENDANCE_MODIFIED,
  AUDIT_ACTIONS.ATTENDANCE_DELETED,
  AUDIT_ACTIONS.ATTENDANCE_FLAGGED,
  AUDIT_ACTIONS.ATTENDANCE_FLAG_UPDATED,
  AUDIT_ACTIONS.DUPLICATE_SCAN_ATTEMPT,
  AUDIT_ACTIONS.LECTURER_LOCATION_PASSED,
  AUDIT_ACTIONS.LECTURER_LOCATION_FAILED,
  AUDIT_ACTIONS.LECTURER_LOCATION_SKIPPED,
  AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY_DETECTED,
] as const;
