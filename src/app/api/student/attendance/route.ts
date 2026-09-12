import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import {
  AttendanceError,
  ATTENDANCE_METHODS,
  markStudentPresent,
  parseStudentAttendanceMethod,
  sessionAllowsMethod,
} from '@/lib/markAttendance';
import { assertAndBindStudentDevice, DeviceBindingError } from '@/lib/deviceBinding';
import { logAttendanceRejection, logAudit } from '@/lib/audit';
import {
  extractQrTokenFromScan,
  isShortCodeValid,
  parseLegacyQrPayload,
  verifyQrToken,
} from '@/lib/attendanceTokens';

export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const records = await prisma.attendance_records.findMany({
      where: { student_id: userId },
      include: {
        session: {
          include: { class: true },
        },
        marked_by: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  let userId: string | null = null;
  let lastSessionId: string | null = null;
  let lastInstitutionId: string | null = null;

  try {
    const headersList = await headers();
    userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const latitude = body.latitude;
    const longitude = body.longitude;
    const deviceId = body.device_id || body.deviceId;
    const deviceFingerprint = body.device_fingerprint || body.deviceFingerprint || null;

    const qrTokenRaw =
      body.qrToken ||
      body.token ||
      body.tok ||
      (typeof body.qrPayload === 'string' ? extractQrTokenFromScan(body.qrPayload) : null);

    let sessionId = body.sessionId as string | undefined;
    let attendanceCode = (body.attendanceCode || body.code) as string | undefined;
    let method = parseStudentAttendanceMethod(body.method || body.source);
    const qrTimestamp = body.qrTimestamp ?? body.t ?? body.timestamp;

    if (latitude == null || longitude == null) {
      await logAttendanceRejection({
        userId,
        reason: 'MISSING_FIELDS',
        details: 'Missing coordinates',
        ip,
      });
      return NextResponse.json({ error: 'Location coordinates are required.' }, { status: 400 });
    }

    if (!sessionId && !attendanceCode && !qrTokenRaw && !body.qrPayload) {
      await logAttendanceRejection({
        userId,
        reason: 'MISSING_FIELDS',
        details: 'Missing session token or short code',
        ip,
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        device_id: true,
        device_fingerprint: true,
        needs_device_reset: true,
        institution_id: true,
      },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can mark attendance' }, { status: 403 });
    }

    try {
      await assertAndBindStudentDevice(
        student,
        { deviceId, deviceFingerprint },
        { ip, context: 'attendance' }
      );
    } catch (err) {
      if (err instanceof DeviceBindingError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    // Prefer signed QR token
    if (qrTokenRaw || body.qrPayload) {
      try {
        const token =
          typeof qrTokenRaw === 'string'
            ? qrTokenRaw
            : extractQrTokenFromScan(String(body.qrPayload || ''));
        if (!token) throw new Error('Invalid QR token format.');
        const verified = verifyQrToken(token);
        sessionId = verified.sessionId;
        method = verified.source;
      } catch (err: any) {
        // Fall back to legacy payload embedded in qrPayload
        const legacy = parseLegacyQrPayload(String(body.qrPayload || body.rawQr || ''));
        if (legacy) {
          sessionId = legacy.sessionId;
          method = legacy.source;
          const qrAgeMs = Date.now() - legacy.qrTimestamp;
          if (Number.isNaN(qrAgeMs) || qrAgeMs > 30000 || qrAgeMs < -10000) {
            await logAttendanceRejection({
              userId,
              reason: 'QR_EXPIRED',
              details: `legacy session=${sessionId} ageMs=${qrAgeMs}`,
              ip,
            });
            await logAudit({
              userId,
              action: 'QR_EXPIRED',
              details: `Legacy QR expired for session ${sessionId}`,
              ip,
            });
            return NextResponse.json(
              { error: 'This QR code has expired. Please scan the current code on the screen.' },
              { status: 400 }
            );
          }
        } else {
          await logAttendanceRejection({
            userId,
            reason: 'INVALID_QR',
            details: err.message || 'token verify failed',
            ip,
          });
          return NextResponse.json(
            { error: err.message || 'Invalid or expired QR code.' },
            { status: 400 }
          );
        }
      }
    } else if (sessionId && qrTimestamp != null) {
      // Legacy mobile clients still sending sessionId + timestamp
      const qrAgeMs = Date.now() - Number(qrTimestamp);
      if (Number.isNaN(qrAgeMs) || qrAgeMs > 30000 || qrAgeMs < -10000) {
        await logAttendanceRejection({
          userId,
          reason: 'QR_EXPIRED',
          details: `session=${sessionId} ageMs=${qrAgeMs}`,
          ip,
        });
        return NextResponse.json(
          { error: 'This QR code has expired. Please scan the current code on the screen.' },
          { status: 400 }
        );
      }
    } else if (sessionId && !attendanceCode) {
      await logAttendanceRejection({
        userId,
        reason: 'INVALID_QR_FORMAT',
        details: `session=${sessionId}`,
        ip,
      });
      return NextResponse.json({ error: 'Invalid QR Code format. Dynamic QR required.' }, { status: 400 });
    }

    if (attendanceCode && !sessionId) {
      method = ATTENDANCE_METHODS.SHORT_CODE;
    }

    const resolvedSession = sessionId
      ? await prisma.attendance_sessions.findUnique({
          where: { id: sessionId },
          include: { class: { select: { institution_id: true } } },
        })
      : await prisma.attendance_sessions.findFirst({
          where: {
            status: 'active',
            attendance_code: String(attendanceCode).trim(),
          },
          include: { class: { select: { institution_id: true } } },
        });

    if (!resolvedSession) {
      await logAttendanceRejection({
        userId,
        reason: 'SESSION_INVALID',
        details: `sessionId=${sessionId || ''} code=${attendanceCode || ''}`,
        ip,
      });
      return NextResponse.json({ error: 'Invalid attendance code or session has ended.' }, { status: 400 });
    }

    lastSessionId = resolvedSession.id;
    lastInstitutionId = resolvedSession.class.institution_id;

    if (
      student.institution_id &&
      resolvedSession.class.institution_id &&
      student.institution_id !== resolvedSession.class.institution_id
    ) {
      await logAttendanceRejection({
        userId,
        reason: 'WRONG_INSTITUTION',
        details: `session=${resolvedSession.id}`,
        ip,
      });
      return NextResponse.json({ error: 'This session belongs to another institution.' }, { status: 403 });
    }

    if (!sessionAllowsMethod(resolvedSession.attendance_method, method)) {
      await logAttendanceRejection({
        userId,
        reason: 'METHOD_NOT_ALLOWED',
        details: `method=${method} sessionMethod=${resolvedSession.attendance_method}`,
        ip,
      });
      return NextResponse.json(
        { error: 'This session does not accept that attendance method right now.' },
        { status: 400 }
      );
    }

    if (method === ATTENDANCE_METHODS.SHORT_CODE || (attendanceCode && !qrTokenRaw)) {
      const code = attendanceCode || resolvedSession.attendance_code || '';
      if (
        !isShortCodeValid(
          {
            attendance_code: resolvedSession.attendance_code,
            code_expires_at: resolvedSession.code_expires_at,
            status: resolvedSession.status,
          },
          code
        )
      ) {
        await logAttendanceRejection({
          userId,
          reason: 'CODE_EXPIRED_OR_INVALID',
          details: `session=${resolvedSession.id}`,
          ip,
        });
        return NextResponse.json(
          { error: 'That attendance code is invalid or has expired. Ask for the current code.' },
          { status: 400 }
        );
      }
      method = ATTENDANCE_METHODS.SHORT_CODE;
    }

    const accuracy = body.accuracy != null ? Number(body.accuracy) : null;
    const { record, distance } = await markStudentPresent({
      studentId: userId,
      sessionId: resolvedSession.id,
      method,
      location: `Lat: ${latitude}, Lng: ${longitude}`,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy,
      enforceGps: true,
      ip,
    });

    await logAudit({
      userId,
      role: 'STUDENT',
      institutionId: lastInstitutionId,
      sessionId: resolvedSession.id,
      studentId: userId,
      action: 'ATTENDANCE_SUBMITTED',
      result: 'success',
      details: `Student check-in via ${method} for session ${resolvedSession.id}`,
      metadata: { method, distance },
      ip,
    });

    return NextResponse.json({ record, distance }, { status: 201 });
  } catch (error) {
    if (error instanceof AttendanceError) {
      const outside = /outside|location/i.test(error.message);
      await logAttendanceRejection({
        userId,
        institutionId: lastInstitutionId,
        sessionId: lastSessionId,
        studentId: userId,
        reason: outside ? 'OUTSIDE_GEOFENCE' : error.status === 403 ? 'NOT_ENROLLED' : 'GPS_OR_RULES',
        details: error.message,
        ip,
      });
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
