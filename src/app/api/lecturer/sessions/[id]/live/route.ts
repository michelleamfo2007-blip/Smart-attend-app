import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';
import { isSessionOpen, closeExpiredSession } from '@/lib/markAttendance';
import {
  encodeQrPayload,
  generateShortAttendanceCode,
  mintQrToken,
  QR_REFRESH_MS,
  shortCodeExpiry,
} from '@/lib/attendanceTokens';
import { logAudit } from '@/lib/audit';
import { assertLecturerControlsAllowed } from '@/lib/lecturerLocation';
import { getInstitutionRolePermissions, permissionDenied } from '@/lib/permissions';

/**
 * Live check-in materials for an active session.
 * Requires on-demand lecturer location verification when institution policy is "block".
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const session = await prisma.attendance_sessions.findUnique({
      where: { id },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            course_code: true,
            institution_id: true,
            classroom: true,
          },
        },
      },
    });

    if (!session || session.lecturer_id !== auth.userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (await closeExpiredSession(session)) {
      return NextResponse.json({ error: 'This attendance session has ended.' }, { status: 400 });
    }
    if (!isSessionOpen(session)) {
      return NextResponse.json({ error: 'Session is not active.' }, { status: 400 });
    }

    const gate = await assertLecturerControlsAllowed(session);
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: 'Location verification is required before using attendance controls.',
          code: gate.reason,
          policy: gate.policy,
          requiresLocationVerification: true,
        },
        { status: 403 }
      );
    }

    const rolePerms = await getInstitutionRolePermissions(session.class.institution_id);
    const method = session.attendance_method || 'both';
    const showQr = method === 'dynamic_qr' || method === 'both';
    const showCode =
      rolePerms.lecturer.use_short_code && (method === 'short_code' || method === 'both');

    let attendanceCode = session.attendance_code;
    let codeExpiresAt = session.code_expires_at;

    if (
      showCode &&
      (!attendanceCode || (codeExpiresAt && new Date(codeExpiresAt) < new Date()))
    ) {
      attendanceCode = generateShortAttendanceCode();
      codeExpiresAt = shortCodeExpiry(new Date(), session.scheduled_end || session.expires_at);
      await prisma.attendance_sessions.update({
        where: { id: session.id },
        data: {
          attendance_code: attendanceCode,
          code_expires_at: codeExpiresAt,
        },
      });
      await logAudit({
        userId: auth.userId,
        role: 'LECTURER',
        institutionId: session.class.institution_id,
        sessionId: session.id,
        action: 'SHORT_CODE_GENERATED',
        result: 'success',
        details: `Short code refreshed for session ${session.id}`,
      });
    }

    let qrToken: string | null = null;
    let qrPayload: string | null = null;
    let qrExpiresAt: string | null = null;

    if (showQr) {
      const minted = mintQrToken(session.id, 'dynamic_qr');
      qrToken = minted.token;
      qrPayload = encodeQrPayload(minted.token);
      qrExpiresAt = minted.expiresAt.toISOString();
      // Avoid flooding audit on every 15s poll — only note generation when code also refreshed
      // or when this is the first materials fetch after open (no prior code).
    }

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      attendanceMethod: method,
      refreshMs: QR_REFRESH_MS,
      locationPolicy: gate.policy,
      locationWarning: gate.reason === 'LOCATION_VERIFICATION_RECOMMENDED',
      lecturerVerifiedAt: session.lecturer_verified_at,
      permissions: {
        useShortCode: rolePerms.lecturer.use_short_code,
        editAttendance: rolePerms.lecturer.edit_attendance,
        deleteAttendance: rolePerms.lecturer.delete_attendance,
      },
      qr: showQr
        ? {
            token: qrToken,
            payload: qrPayload,
            expiresAt: qrExpiresAt,
          }
        : null,
      shortCode: showCode
        ? {
            code: attendanceCode,
            expiresAt: codeExpiresAt,
          }
        : null,
      class: session.class,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'refresh_code';

    const session = await prisma.attendance_sessions.findUnique({
      where: { id },
      include: { class: { select: { institution_id: true } } },
    });
    if (!session || session.lecturer_id !== auth.userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (!isSessionOpen(session)) {
      return NextResponse.json({ error: 'Session is not active.' }, { status: 400 });
    }

    const gate = await assertLecturerControlsAllowed(session);
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: 'Location verification is required before using attendance controls.',
          code: gate.reason,
          requiresLocationVerification: true,
        },
        { status: 403 }
      );
    }

    if (action === 'set_method') {
      const method = body.method;
      if (!['dynamic_qr', 'short_code', 'both'].includes(method)) {
        return NextResponse.json({ error: 'Invalid attendance method.' }, { status: 400 });
      }
      const rolePerms = await getInstitutionRolePermissions(session.class.institution_id);
      if ((method === 'short_code' || method === 'both') && !rolePerms.lecturer.use_short_code) {
        return permissionDenied('Short attendance codes are disabled for lecturers at this school.');
      }
      const updated = await prisma.attendance_sessions.update({
        where: { id },
        data: { attendance_method: method },
      });
      return NextResponse.json({ session: updated });
    }

    const rolePerms = await getInstitutionRolePermissions(session.class.institution_id);
    if (!rolePerms.lecturer.use_short_code) {
      return permissionDenied('Short attendance codes are disabled for lecturers at this school.');
    }

    const code = generateShortAttendanceCode();
    const codeExpiresAt = shortCodeExpiry(new Date(), session.scheduled_end || session.expires_at);
    const updated = await prisma.attendance_sessions.update({
      where: { id },
      data: {
        attendance_code: code,
        code_expires_at: codeExpiresAt,
      },
    });

    await logAudit({
      userId: auth.userId,
      role: 'LECTURER',
      institutionId: session.class.institution_id,
      sessionId: id,
      action: 'SHORT_CODE_GENERATED',
      result: 'success',
      details: `Lecturer regenerated short code for session ${id}`,
    });

    return NextResponse.json({
      code: updated.attendance_code,
      expiresAt: updated.code_expires_at,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
