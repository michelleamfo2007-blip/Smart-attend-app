import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export class DeviceBindingError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

type StudentDeviceFields = {
  id: string;
  device_id: string | null;
  device_fingerprint: string | null;
  needs_device_reset: boolean;
};

/**
 * Enforces one-phone binding using device_id + hardware fingerprint.
 * Fingerprint mismatches on a known device_id are treated as tampering / cloned app data.
 */
export async function assertAndBindStudentDevice(
  student: StudentDeviceFields,
  incoming: { deviceId?: string | null; deviceFingerprint?: string | null },
  opts?: { ip?: string | null; context?: string }
) {
  const deviceId = incoming.deviceId?.trim() || null;
  const fingerprint = incoming.deviceFingerprint?.trim() || null;
  const ip = opts?.ip || 'unknown';
  const context = opts?.context || 'request';

  if (!deviceId) {
    throw new DeviceBindingError(
      'This account is bound to a registered device. Open the SmartAttend mobile app to continue.',
      403
    );
  }

  const otherOwner = await prisma.users.findFirst({
    where: { device_id: deviceId, id: { not: student.id } },
    select: { id: true },
  });
  if (otherOwner) {
    await logAudit({
      userId: student.id,
      action: 'DEVICE_CONFLICT',
      details: `Device already bound to another account during ${context}`,
      ip,
    });
    throw new DeviceBindingError(
      'This phone is already registered to another user. You cannot use the same phone for multiple accounts.',
      403
    );
  }

  if (student.needs_device_reset || !student.device_id) {
    await prisma.users.update({
      where: { id: student.id },
      data: {
        device_id: deviceId,
        device_fingerprint: fingerprint,
        needs_device_reset: false,
      },
    });
    await logAudit({
      userId: student.id,
      action: 'DEVICE_BOUND',
      details: `Device bound during ${context}`,
      ip,
    });
    return { deviceId, fingerprint, rebound: true };
  }

  if (student.device_id !== deviceId) {
    await logAudit({
      userId: student.id,
      action: 'DEVICE_MISMATCH',
      details: `Wrong device_id during ${context}`,
      ip,
    });
    throw new DeviceBindingError(
      'This account is registered on another device. Please contact an administrator if you got a new phone.',
      403
    );
  }

  if (
    student.device_fingerprint &&
    fingerprint &&
    student.device_fingerprint !== fingerprint
  ) {
    await logAudit({
      userId: student.id,
      action: 'DEVICE_FINGERPRINT_MISMATCH',
      details: `Fingerprint changed during ${context} — possible cloned app data or device spoofing`,
      ip,
    });
    throw new DeviceBindingError(
      'This phone no longer matches the registered device signature. Ask an administrator to reset your device binding.',
      403
    );
  }

  if (!student.device_fingerprint && fingerprint) {
    await prisma.users.update({
      where: { id: student.id },
      data: { device_fingerprint: fingerprint },
    });
  }

  return { deviceId, fingerprint, rebound: false };
}
