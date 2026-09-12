import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';
import { formatUserLimit, getPlan, resolveMaxUsers } from '@/lib/plans';
import { refreshInstitutionSubscription } from '@/lib/subscription';
import {
  DEFAULT_INSTITUTION_TIMEZONE,
  DEFAULT_SESSION_PERIODS,
  normalizeTimezone,
  parseSessionPeriods,
  type SessionPeriod,
} from '@/lib/institutionTime';
import { normalizeLecturerGeoPolicy, type LecturerGeoPolicy } from '@/lib/lecturerLocation';
import { normalizeLateGraceMinutes } from '@/lib/attendanceStatus';
import {
  DEFAULT_ROLE_PERMISSIONS,
  mergeRolePermissionsPatch,
  parseRolePermissions,
  type RolePermissions,
} from '@/lib/rolePermissions';

async function ensureInstitutionDefaults(institutionId: string) {
  const institution = await prisma.institutions.findUnique({ where: { id: institutionId } });
  if (!institution) return null;

  const updates: {
    timezone?: string;
    session_periods?: SessionPeriod[];
    lecturer_geo_policy?: string;
    late_grace_minutes?: number;
    role_permissions?: RolePermissions;
  } = {};
  if (!institution.timezone) {
    updates.timezone = DEFAULT_INSTITUTION_TIMEZONE;
  }
  if (institution.session_periods == null) {
    updates.session_periods = DEFAULT_SESSION_PERIODS;
  }
  if (!institution.lecturer_geo_policy) {
    updates.lecturer_geo_policy = 'warn';
  }
  if (institution.late_grace_minutes == null) {
    updates.late_grace_minutes = 15;
  }
  if (institution.role_permissions == null) {
    updates.role_permissions = DEFAULT_ROLE_PERMISSIONS;
  }

  if (Object.keys(updates).length > 0) {
    return prisma.institutions.update({
      where: { id: institutionId },
      data: updates,
    });
  }

  return institution;
}

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.institutionId) {
      return NextResponse.json({ code: 'SUPER-ADMIN-N/A' });
    }

    await ensureInstitutionDefaults(auth.institutionId);
    const institution = await refreshInstitutionSubscription(auth.institutionId);
    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    const fresh = await prisma.institutions.findUnique({
      where: { id: auth.institutionId },
      select: {
        invite_code: true,
        timezone: true,
        session_periods: true,
        lecturer_geo_policy: true,
        campus_latitude: true,
        campus_longitude: true,
        campus_radius_meters: true,
        late_grace_minutes: true,
        role_permissions: true,
      },
    });

    const userCount = await prisma.users.count({
      where: { institution_id: auth.institutionId },
    });

    const plan = getPlan(institution.subscription_plan);
    const maxUsers = resolveMaxUsers(institution);

    return NextResponse.json({
      code: fresh?.invite_code || 'N/A',
      timezone: normalizeTimezone(fresh?.timezone),
      sessionPeriods: parseSessionPeriods(fresh?.session_periods),
      lecturerGeoPolicy: normalizeLecturerGeoPolicy(fresh?.lecturer_geo_policy),
      campusLatitude: fresh?.campus_latitude ?? null,
      campusLongitude: fresh?.campus_longitude ?? null,
      campusRadiusMeters: fresh?.campus_radius_meters ?? 200,
      lateGraceMinutes: normalizeLateGraceMinutes(fresh?.late_grace_minutes),
      rolePermissions: parseRolePermissions(fresh?.role_permissions),
      subscription: {
        plan: plan.id,
        planName: plan.name,
        status: institution.status,
        billingCycle: institution.billing_cycle,
        maxUsers,
        userCount,
        userLimitLabel: formatUserLimit(maxUsers),
        endsAt: institution.subscription_ends_at,
        features: plan.features,
      },
    });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.institutionId) {
      return NextResponse.json({ error: 'Super admins cannot update school settings' }, { status: 400 });
    }

    const body = await req.json();

    if (typeof body.code === 'string') {
      if (body.code.length < 5) {
        return NextResponse.json({ error: 'Code must be at least 5 characters' }, { status: 400 });
      }
      const updated = await prisma.institutions.update({
        where: { id: auth.institutionId },
        data: { invite_code: body.code },
      });
      return NextResponse.json({ success: true, code: updated.invite_code });
    }

    const data: {
      timezone?: string;
      session_periods?: SessionPeriod[];
      lecturer_geo_policy?: LecturerGeoPolicy;
      campus_latitude?: number | null;
      campus_longitude?: number | null;
      campus_radius_meters?: number | null;
      late_grace_minutes?: number;
      role_permissions?: RolePermissions;
    } = {};

    if (body.timezone != null) {
      data.timezone = normalizeTimezone(String(body.timezone));
    }
    if (body.sessionPeriods != null) {
      data.session_periods = parseSessionPeriods(body.sessionPeriods);
    }
    if (body.lecturerGeoPolicy != null) {
      data.lecturer_geo_policy = normalizeLecturerGeoPolicy(String(body.lecturerGeoPolicy));
    }
    if (body.campusLatitude !== undefined) {
      data.campus_latitude =
        body.campusLatitude === null || body.campusLatitude === ''
          ? null
          : Number(body.campusLatitude);
    }
    if (body.campusLongitude !== undefined) {
      data.campus_longitude =
        body.campusLongitude === null || body.campusLongitude === ''
          ? null
          : Number(body.campusLongitude);
    }
    if (body.campusRadiusMeters !== undefined) {
      data.campus_radius_meters =
        body.campusRadiusMeters === null || body.campusRadiusMeters === ''
          ? null
          : Number(body.campusRadiusMeters);
    }
    if (body.lateGraceMinutes !== undefined) {
      data.late_grace_minutes = normalizeLateGraceMinutes(Number(body.lateGraceMinutes));
    }
    if (body.rolePermissions != null) {
      const current = await prisma.institutions.findUnique({
        where: { id: auth.institutionId },
        select: { role_permissions: true },
      });
      data.role_permissions = mergeRolePermissionsPatch(
        parseRolePermissions(current?.role_permissions),
        body.rolePermissions
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.institutions.update({
      where: { id: auth.institutionId },
      data,
      select: {
        timezone: true,
        session_periods: true,
        invite_code: true,
        lecturer_geo_policy: true,
        campus_latitude: true,
        campus_longitude: true,
        campus_radius_meters: true,
        late_grace_minutes: true,
        role_permissions: true,
      },
    });

    return NextResponse.json({
      success: true,
      timezone: normalizeTimezone(updated.timezone),
      sessionPeriods: parseSessionPeriods(updated.session_periods),
      lecturerGeoPolicy: normalizeLecturerGeoPolicy(updated.lecturer_geo_policy),
      campusLatitude: updated.campus_latitude,
      campusLongitude: updated.campus_longitude,
      campusRadiusMeters: updated.campus_radius_meters,
      lateGraceMinutes: normalizeLateGraceMinutes(updated.late_grace_minutes),
      rolePermissions: parseRolePermissions(updated.role_permissions),
      code: updated.invite_code,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'That invite code is already in use' }, { status: 400 });
    }
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
