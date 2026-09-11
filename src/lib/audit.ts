import prisma from '@/lib/prisma';

export async function logAudit(options: {
  userId?: string | null;
  action: string;
  details: string;
  ip?: string | null;
}) {
  try {
    await prisma.audit_logs.create({
      data: {
        user_id: options.userId || undefined,
        action: options.action,
        details: options.details,
        ip_address: options.ip || 'unknown',
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function logAttendanceRejection(options: {
  userId?: string | null;
  reason: string;
  details: string;
  ip?: string | null;
}) {
  await logAudit({
    userId: options.userId,
    action: 'ATTENDANCE_REJECTED',
    details: `${options.reason}: ${options.details}`,
    ip: options.ip,
  });
}
