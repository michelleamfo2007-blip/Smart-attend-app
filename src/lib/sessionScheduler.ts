import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  DEFAULT_INSTITUTION_TIMEZONE,
  normalizeTimezone,
  nowInTimezone,
  parseSessionPeriods,
  wallTimeOnDayToUtc,
  weekdayMatchesSchedule,
} from '@/lib/institutionTime';
import {
  generateShortAttendanceCode,
  shortCodeExpiry,
} from '@/lib/attendanceTokens';

export type SchedulerResult = {
  institutions: number;
  created: number;
  activated: number;
  closed: number;
};

function sessionAnchorFromClassroom(classroom?: {
  latitude?: number | null;
  longitude?: number | null;
} | null) {
  if (
    classroom &&
    classroom.latitude != null &&
    classroom.longitude != null &&
    Number.isFinite(classroom.latitude) &&
    Number.isFinite(classroom.longitude)
  ) {
    return { latitude: classroom.latitude, longitude: classroom.longitude };
  }
  return { latitude: null as number | null, longitude: null as number | null };
}

/**
 * Creates scheduled sessions for today's timetable and advances lifecycle:
 * scheduled → active → closed (idempotent).
 */
export async function runSessionScheduler(opts?: {
  institutionId?: string;
}): Promise<SchedulerResult> {
  const result: SchedulerResult = { institutions: 0, created: 0, activated: 0, closed: 0 };
  const now = new Date();

  const institutions = await prisma.institutions.findMany({
    where: {
      status: { notIn: ['expired', 'suspended', 'cancelled'] },
      ...(opts?.institutionId ? { id: opts.institutionId } : {}),
    },
    select: {
      id: true,
      timezone: true,
      session_periods: true,
      status: true,
    },
  });

  for (const institution of institutions) {
    result.institutions += 1;
    const timeZone = normalizeTimezone(institution.timezone || DEFAULT_INSTITUTION_TIMEZONE);
    // Ensure periods exist for settings UI; scheduler itself uses class start/end times.
    parseSessionPeriods(institution.session_periods);

    const localNow = nowInTimezone(timeZone);

    const classes = await prisma.classes.findMany({
      where: {
        institution_id: institution.id,
        lecturer_id: { not: null },
        start_time: { not: null },
        end_time: { not: null },
      },
      include: {
        classroom: { select: { latitude: true, longitude: true, radius_meters: true, name: true } },
      },
    });

    for (const cls of classes) {
      if (!cls.lecturer_id || !cls.start_time || !cls.end_time) continue;
      if (!weekdayMatchesSchedule(cls.schedule_time, localNow)) continue;

      const scheduledStart = wallTimeOnDayToUtc(timeZone, localNow, cls.start_time);
      const scheduledEnd = wallTimeOnDayToUtc(timeZone, localNow, cls.end_time);

      // Skip overnight-invalid or inverted ranges
      if (!(scheduledEnd.getTime() > scheduledStart.getTime())) continue;

      // Don't create sessions for classes that already fully ended earlier today
      // unless we still need to close leftovers (handled below).
      const existing = await prisma.attendance_sessions.findFirst({
        where: {
          class_id: cls.id,
          scheduled_start: scheduledStart,
        },
      });

      if (!existing) {
        // Only create if the class hasn't ended yet (or ended within last few minutes for late cron)
        if (now.getTime() > scheduledEnd.getTime() + 5 * 60 * 1000) {
          continue;
        }

        const anchor = sessionAnchorFromClassroom(cls.classroom);
        const shouldBeActive =
          now.getTime() >= scheduledStart.getTime() && now.getTime() < scheduledEnd.getTime();
        const code = generateShortAttendanceCode();

        try {
          const created = await prisma.attendance_sessions.create({
            data: {
              class_id: cls.id,
              lecturer_id: cls.lecturer_id,
              attendance_code: code,
              code_expires_at: shortCodeExpiry(scheduledStart, scheduledEnd),
              latitude: anchor.latitude,
              longitude: anchor.longitude,
              status: shouldBeActive ? 'active' : 'scheduled',
              scheduled_start: scheduledStart,
              scheduled_end: scheduledEnd,
              expires_at: scheduledEnd,
              attendance_method: 'both',
              auto_created: true,
            },
          });
          result.created += 1;
          await logAudit({
            userId: cls.lecturer_id,
            role: 'SYSTEM',
            institutionId: institution.id,
            sessionId: created.id,
            action: shouldBeActive ? 'SESSION_AUTO_OPENED' : 'SESSION_AUTO_SCHEDULED',
            result: 'success',
            details: `Auto session for class ${cls.id} (${cls.name}) ${shouldBeActive ? 'opened' : 'scheduled'} at ${scheduledStart.toISOString()}`,
            metadata: {
              classId: cls.id,
              className: cls.name,
              scheduledStart: scheduledStart.toISOString(),
              scheduledEnd: scheduledEnd.toISOString(),
            },
          });
          if (shouldBeActive) {
            const { notifyLecturerSessionOpened } = await import('@/lib/notifications');
            await notifyLecturerSessionOpened({
              lecturerId: cls.lecturer_id,
              className: cls.name,
              sessionId: created.id,
              roomName: cls.classroom?.name || null,
            });
          }
        } catch (error: any) {
          // Unique violation = another worker created it — ignore
          if (error?.code !== 'P2002') throw error;
        }
      }
    }

    // Activate due scheduled sessions for this institution
    const toActivate = await prisma.attendance_sessions.findMany({
      where: {
        status: 'scheduled',
        scheduled_start: { lte: now },
        scheduled_end: { gt: now },
        class: { institution_id: institution.id },
      },
      include: {
        class: { include: { classroom: true } },
      },
    });

    for (const session of toActivate) {
      const anchor = sessionAnchorFromClassroom(session.class.classroom);
      await prisma.attendance_sessions.update({
        where: { id: session.id },
        data: {
          status: 'active',
          expires_at: session.scheduled_end || session.expires_at,
          ...(session.latitude == null && anchor.latitude != null
            ? { latitude: anchor.latitude, longitude: anchor.longitude }
            : {}),
        },
      });
      result.activated += 1;
      await logAudit({
        userId: session.lecturer_id,
        role: 'SYSTEM',
        institutionId: institution.id,
        sessionId: session.id,
        action: 'SESSION_AUTO_OPENED',
        result: 'success',
        details: `Session ${session.id} auto-activated for class ${session.class.name || session.class_id}`,
        metadata: {
          classId: session.class_id,
          className: session.class.name,
          scheduledStart: session.scheduled_start,
        },
      });
      const { notifyLecturerSessionOpened } = await import('@/lib/notifications');
      await notifyLecturerSessionOpened({
        lecturerId: session.lecturer_id,
        className: session.class.name || 'Class',
        sessionId: session.id,
        roomName: session.class.classroom?.name || null,
      });
    }

    // Close expired active (and overdue scheduled) sessions — capture ids for audit
    const toClose = await prisma.attendance_sessions.findMany({
      where: {
        status: { in: ['active', 'scheduled'] },
        class: { institution_id: institution.id },
        OR: [
          { scheduled_end: { lte: now } },
          { expires_at: { lte: now } },
        ],
      },
      select: { id: true, lecturer_id: true, class_id: true },
      take: 200,
    });

    if (toClose.length > 0) {
      await prisma.attendance_sessions.updateMany({
        where: { id: { in: toClose.map((s) => s.id) } },
        data: { status: 'closed' },
      });
      result.closed += toClose.length;
      await logAudit({
        role: 'SYSTEM',
        institutionId: institution.id,
        action: 'SESSION_AUTO_CLOSED',
        result: 'success',
        details: `Closed ${toClose.length} session(s) for institution ${institution.id}`,
        metadata: { sessionIds: toClose.map((s) => s.id) },
      });
    }
  }

  return result;
}

/** Lightweight ensure for a single institution (lecturer/kiosk/staff poll path). */
export async function ensureInstitutionSessions(institutionId: string) {
  if (!institutionId) return null;
  return runSessionScheduler({ institutionId });
}
