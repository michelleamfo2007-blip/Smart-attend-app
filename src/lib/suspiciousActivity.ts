import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, logAudit } from '@/lib/audit';

const WINDOW_MS = 15 * 60 * 1000;

async function createSystemFlag(opts: {
  institutionId: string;
  studentId?: string | null;
  sessionId?: string | null;
  recordId?: string | null;
  reason: string;
}) {
  // Prefer an existing open flag for same student+session to avoid spam
  if (opts.studentId && opts.sessionId) {
    const existing = await prisma.attendance_flags.findFirst({
      where: {
        institution_id: opts.institutionId,
        student_id: opts.studentId,
        session_id: opts.sessionId,
        status: 'open',
        reason: { contains: opts.reason.slice(0, 40) },
      },
    });
    if (existing) return existing;
  }

  // System actor: use first institution admin, else first staff, else skip flag row but still audit
  const actor =
    (await prisma.users.findFirst({
      where: { institution_id: opts.institutionId, role: 'ADMIN' },
      select: { id: true },
    })) ||
    (await prisma.users.findFirst({
      where: { institution_id: opts.institutionId, role: 'STAFF' },
      select: { id: true },
    }));

  if (!actor) return null;

  return prisma.attendance_flags.create({
    data: {
      institution_id: opts.institutionId,
      student_id: opts.studentId || null,
      session_id: opts.sessionId || null,
      record_id: opts.recordId || null,
      flagged_by: actor.id,
      reason: opts.reason,
      status: 'open',
    },
  });
}

export async function reportSuspiciousActivity(opts: {
  institutionId: string;
  studentId?: string | null;
  sessionId?: string | null;
  recordId?: string | null;
  userId?: string | null;
  reason: string;
  details: string;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const flag = await createSystemFlag({
    institutionId: opts.institutionId,
    studentId: opts.studentId,
    sessionId: opts.sessionId,
    recordId: opts.recordId,
    reason: opts.reason,
  });

  await logAudit({
    userId: opts.userId || null,
    role: 'SYSTEM',
    institutionId: opts.institutionId,
    sessionId: opts.sessionId,
    studentId: opts.studentId,
    action: AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY_DETECTED,
    result: 'warning',
    details: opts.details,
    metadata: {
      reason: opts.reason,
      flagId: flag?.id || null,
      ...(opts.metadata || {}),
    },
    ip: opts.ip,
  });

  return flag;
}

/** After a rejection, escalate repeated failures in a short window. */
export async function evaluateSuspiciousFromRejection(opts: {
  studentId?: string | null;
  institutionId?: string | null;
  sessionId?: string | null;
  reason: string;
  ip?: string | null;
}) {
  if (!opts.studentId) return;

  let institutionId = opts.institutionId || null;
  if (!institutionId) {
    const student = await prisma.users.findUnique({
      where: { id: opts.studentId },
      select: { institution_id: true },
    });
    institutionId = student?.institution_id || null;
  }
  if (!institutionId) return;

  const since = new Date(Date.now() - WINDOW_MS);
  const failures = await prisma.audit_logs.count({
    where: {
      student_id: opts.studentId,
      action: AUDIT_ACTIONS.ATTENDANCE_REJECTED,
      created_at: { gte: since },
    },
  });

  const gpsFailures = await prisma.audit_logs.count({
    where: {
      student_id: opts.studentId,
      action: AUDIT_ACTIONS.ATTENDANCE_REJECTED,
      created_at: { gte: since },
      OR: [
        { details: { contains: 'outside', mode: 'insensitive' } },
        { details: { contains: 'OUTSIDE_GEOFENCE', mode: 'insensitive' } },
      ],
    },
  });

  if (failures >= 5) {
    await reportSuspiciousActivity({
      institutionId,
      studentId: opts.studentId,
      sessionId: opts.sessionId,
      userId: opts.studentId,
      reason: 'Repeated attendance failures',
      details: `Student ${opts.studentId} had ${failures} rejected check-ins in 15 minutes (latest: ${opts.reason}).`,
      ip: opts.ip,
      metadata: { failures, latestReason: opts.reason },
    });
  } else if (
    gpsFailures >= 3 ||
    opts.reason === 'OUTSIDE_GEOFENCE' ||
    /LOCATION|OUTSIDE/i.test(opts.reason)
  ) {
    if (gpsFailures >= 3) {
      await reportSuspiciousActivity({
        institutionId,
        studentId: opts.studentId,
        sessionId: opts.sessionId,
        userId: opts.studentId,
        reason: 'Repeated geofence failures',
        details: `Student ${opts.studentId} failed geofence ${gpsFailures} times in 15 minutes.`,
        ip: opts.ip,
        metadata: { gpsFailures },
      });
    }
  }
}

/** Duplicate scan spam → suspicious. */
export async function evaluateSuspiciousDuplicate(opts: {
  studentId: string;
  institutionId?: string | null;
  sessionId: string;
  ip?: string | null;
}) {
  let institutionId = opts.institutionId || null;
  if (!institutionId) {
    const student = await prisma.users.findUnique({
      where: { id: opts.studentId },
      select: { institution_id: true },
    });
    institutionId = student?.institution_id || null;
  }
  if (!institutionId) return;

  const since = new Date(Date.now() - WINDOW_MS);
  const dupes = await prisma.audit_logs.count({
    where: {
      student_id: opts.studentId,
      session_id: opts.sessionId,
      action: AUDIT_ACTIONS.DUPLICATE_SCAN_ATTEMPT,
      created_at: { gte: since },
    },
  });

  if (dupes >= 3) {
    await reportSuspiciousActivity({
      institutionId,
      studentId: opts.studentId,
      sessionId: opts.sessionId,
      userId: opts.studentId,
      reason: 'Repeated duplicate scan attempts',
      details: `Student ${opts.studentId} attempted ${dupes} duplicate scans for session ${opts.sessionId} in 15 minutes.`,
      ip: opts.ip,
      metadata: { dupes },
    });
  }
}

/** Device binding / tamper signals. */
export async function evaluateSuspiciousDevice(opts: {
  studentId: string;
  institutionId?: string | null;
  reason: string;
  details: string;
  ip?: string | null;
}) {
  let institutionId = opts.institutionId || null;
  if (!institutionId) {
    const student = await prisma.users.findUnique({
      where: { id: opts.studentId },
      select: { institution_id: true },
    });
    institutionId = student?.institution_id || null;
  }
  if (!institutionId) return;

  await reportSuspiciousActivity({
    institutionId,
    studentId: opts.studentId,
    userId: opts.studentId,
    reason: opts.reason,
    details: opts.details,
    ip: opts.ip,
  });
}
