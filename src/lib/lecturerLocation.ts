import prisma from '@/lib/prisma';
import { getDistanceMeters } from '@/lib/attendance';
import { logAudit } from '@/lib/audit';

/** On-demand lecturer geofence (classroom first, campus fallback). */
export type LecturerGeoPolicy = 'off' | 'warn' | 'block';

export const LECTURER_VERIFY_TTL_MS = 30 * 60 * 1000; // re-check after 30 minutes

export function normalizeLecturerGeoPolicy(value?: string | null): LecturerGeoPolicy {
  if (value === 'off' || value === 'block' || value === 'warn') return value;
  return 'warn';
}

export function isLecturerVerificationFresh(verifiedAt?: Date | null) {
  if (!verifiedAt) return false;
  return Date.now() - new Date(verifiedAt).getTime() < LECTURER_VERIFY_TTL_MS;
}

type Anchor = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  classroomId: string | null;
  source: 'classroom' | 'campus';
};

export async function resolveSessionGeoAnchor(sessionId: string): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof loadSessionForVerify>>>;
  institution: {
    id: string;
    lecturer_geo_policy: string | null;
    campus_latitude: number | null;
    campus_longitude: number | null;
    campus_radius_meters: number | null;
  };
  anchor: Anchor | null;
}> {
  const session = await loadSessionForVerify(sessionId);
  if (!session) {
    throw Object.assign(new Error('Session not found'), { status: 404 });
  }

  const institutionId = session.class.institution_id;
  if (!institutionId) {
    throw Object.assign(new Error('Session has no institution'), { status: 400 });
  }

  const institution = await prisma.institutions.findUnique({
    where: { id: institutionId },
    select: {
      id: true,
      lecturer_geo_policy: true,
      campus_latitude: true,
      campus_longitude: true,
      campus_radius_meters: true,
    },
  });

  if (!institution) {
    throw Object.assign(new Error('Institution not found'), { status: 404 });
  }

  const classroom = session.class.classroom;
  let anchor: Anchor | null = null;

  if (classroom?.latitude != null && classroom?.longitude != null) {
    anchor = {
      latitude: classroom.latitude,
      longitude: classroom.longitude,
      radiusMeters: classroom.radius_meters || 75,
      classroomId: classroom.id,
      source: 'classroom',
    };
  } else if (institution.campus_latitude != null && institution.campus_longitude != null) {
    anchor = {
      latitude: institution.campus_latitude,
      longitude: institution.campus_longitude,
      radiusMeters: institution.campus_radius_meters || 200,
      classroomId: classroom?.id || null,
      source: 'campus',
    };
  }

  return { session, institution, anchor };
}

async function loadSessionForVerify(sessionId: string) {
  return prisma.attendance_sessions.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: {
          classroom: true,
        },
      },
    },
  });
}

export async function verifyLecturerLocation(opts: {
  sessionId: string;
  lecturerId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  ip?: string | null;
}) {
  const { session, institution, anchor } = await resolveSessionGeoAnchor(opts.sessionId);

  if (session.lecturer_id !== opts.lecturerId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  if (session.status !== 'active') {
    throw Object.assign(new Error('Session is not active.'), { status: 400 });
  }

  const policy = normalizeLecturerGeoPolicy(institution.lecturer_geo_policy);

  if (policy === 'off') {
    await prisma.attendance_sessions.update({
      where: { id: session.id },
      data: { lecturer_verified_at: new Date() },
    });
    return {
      ok: true,
      result: 'skipped_policy_off' as const,
      policy,
      distanceMeters: null as number | null,
      allowedRadius: null as number | null,
      anchorSource: null as string | null,
      controlsAllowed: true,
      message: 'Location verification is disabled for this institution.',
    };
  }

  if (!anchor) {
    const row = await prisma.lecturer_location_verifications.create({
      data: {
        institution_id: institution.id,
        lecturer_id: opts.lecturerId,
        session_id: session.id,
        class_id: session.class_id,
        classroom_id: session.class.classroom_id,
        latitude: opts.latitude,
        longitude: opts.longitude,
        accuracy_meters: opts.accuracy ?? null,
        result: 'skipped_no_anchor',
        policy,
      },
    });

    // No room/campus GPS configured — cannot enforce; allow with warning.
    await prisma.attendance_sessions.update({
      where: { id: session.id },
      data: { lecturer_verified_at: new Date() },
    });

    await logAudit({
      userId: opts.lecturerId,
      role: 'LECTURER',
      institutionId: institution.id,
      sessionId: session.id,
      action: 'LECTURER_LOCATION_SKIPPED',
      result: 'warning',
      details: `No classroom/campus GPS for session ${session.id}; verification ${row.id}`,
      metadata: { verificationId: row.id, policy },
      ip: opts.ip,
    });

    return {
      ok: true,
      result: 'skipped_no_anchor' as const,
      policy,
      distanceMeters: null as number | null,
      allowedRadius: null as number | null,
      anchorSource: null as string | null,
      controlsAllowed: true,
      message:
        'No classroom or campus GPS is configured. Location could not be checked — ask an admin to set room coordinates.',
    };
  }

  const distance = getDistanceMeters(
    opts.latitude,
    opts.longitude,
    anchor.latitude,
    anchor.longitude
  );
  const accuracyCredit = Math.min(Math.max(Number(opts.accuracy) || 0, 0), 75);
  const effectiveDistance = Math.max(0, distance - accuracyCredit);
  const passed = effectiveDistance <= anchor.radiusMeters;

  await prisma.lecturer_location_verifications.create({
    data: {
      institution_id: institution.id,
      lecturer_id: opts.lecturerId,
      session_id: session.id,
      class_id: session.class_id,
      classroom_id: anchor.classroomId,
      latitude: opts.latitude,
      longitude: opts.longitude,
      accuracy_meters: opts.accuracy ?? null,
      expected_latitude: anchor.latitude,
      expected_longitude: anchor.longitude,
      expected_radius_m: anchor.radiusMeters,
      distance_meters: Math.round(distance * 10) / 10,
      result: passed ? 'passed' : 'failed',
      policy,
    },
  });

  if (passed) {
    await prisma.attendance_sessions.update({
      where: { id: session.id },
      data: { lecturer_verified_at: new Date() },
    });
    await logAudit({
      userId: opts.lecturerId,
      role: 'LECTURER',
      institutionId: institution.id,
      sessionId: session.id,
      action: 'LECTURER_LOCATION_PASSED',
      result: 'success',
      details: `Session ${session.id} verified within ${Math.round(distance)}m (limit ${anchor.radiusMeters}m, ${anchor.source})`,
      metadata: {
        distanceMeters: Math.round(distance),
        allowedRadius: anchor.radiusMeters,
        anchorSource: anchor.source,
        policy,
      },
      ip: opts.ip,
    });
    return {
      ok: true,
      result: 'passed' as const,
      policy,
      distanceMeters: Math.round(distance),
      allowedRadius: anchor.radiusMeters,
      anchorSource: anchor.source,
      controlsAllowed: true,
      message: `Location verified (${Math.round(distance)}m from ${anchor.source}).`,
    };
  }

  const controlsAllowed = policy !== 'block';

  await logAudit({
    userId: opts.lecturerId,
    role: 'LECTURER',
    institutionId: institution.id,
    sessionId: session.id,
    action: 'LECTURER_LOCATION_FAILED',
    result: 'failure',
    details: `Session ${session.id} failed: ${Math.round(distance)}m > ${anchor.radiusMeters}m (${anchor.source}), policy=${policy}`,
    metadata: {
      distanceMeters: Math.round(distance),
      allowedRadius: anchor.radiusMeters,
      anchorSource: anchor.source,
      policy,
      controlsAllowed,
    },
    ip: opts.ip,
  });

  return {
    ok: false,
    result: 'failed' as const,
    policy,
    distanceMeters: Math.round(distance),
    allowedRadius: anchor.radiusMeters,
    anchorSource: anchor.source,
    controlsAllowed,
    message:
      policy === 'block'
        ? `You appear outside the permitted location (${Math.round(distance)}m away; allowed ${anchor.radiusMeters}m). Attendance controls are blocked.`
        : `Warning: you appear outside the permitted location (${Math.round(distance)}m away; allowed ${anchor.radiusMeters}m).`,
  };
}

/** Used by live QR/short-code endpoints — does not track continuously. */
export async function assertLecturerControlsAllowed(session: {
  id: string;
  lecturer_id: string;
  lecturer_verified_at?: Date | null;
  class: { institution_id?: string | null };
}) {
  const institutionId = session.class.institution_id;
  if (!institutionId) return { allowed: true, policy: 'off' as LecturerGeoPolicy, reason: null };

  const institution = await prisma.institutions.findUnique({
    where: { id: institutionId },
    select: { lecturer_geo_policy: true },
  });
  const policy = normalizeLecturerGeoPolicy(institution?.lecturer_geo_policy);

  if (policy === 'off') return { allowed: true, policy, reason: null };

  if (isLecturerVerificationFresh(session.lecturer_verified_at)) {
    return { allowed: true, policy, reason: null };
  }

  if (policy === 'warn') {
    // Warn mode still allows materials, but client should prompt verify.
    return {
      allowed: true,
      policy,
      reason: 'LOCATION_VERIFICATION_RECOMMENDED' as const,
    };
  }

  return {
    allowed: false,
    policy,
    reason: 'LOCATION_VERIFICATION_REQUIRED' as const,
  };
}
