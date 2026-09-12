import { DateTime } from 'luxon';

export const DEFAULT_INSTITUTION_TIMEZONE = 'Africa/Accra';

export type SessionPeriod = {
  key: string;
  name: string;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  enabled: boolean;
};

export const DEFAULT_SESSION_PERIODS: SessionPeriod[] = [
  { key: 'morning', name: 'Morning', start_time: '09:00', end_time: '12:00', enabled: true },
  { key: 'afternoon', name: 'Afternoon', start_time: '13:00', end_time: '15:00', enabled: true },
  { key: 'evening', name: 'Evening', start_time: '16:00', end_time: '19:00', enabled: true },
];

/** Detect browser IANA timezone; fall back for SSR / unknown. */
export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return normalizeTimezone(tz);
  } catch {
    return DEFAULT_INSTITUTION_TIMEZONE;
  }
}

export function normalizeTimezone(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_INSTITUTION_TIMEZONE;
  const probe = DateTime.now().setZone(raw);
  if (!probe.isValid) return DEFAULT_INSTITUTION_TIMEZONE;
  return raw;
}

export function parseSessionPeriods(value: unknown): SessionPeriod[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_SESSION_PERIODS.map((p) => ({ ...p }));
  }

  const parsed: SessionPeriod[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const start = String(item.start_time || '').trim();
    const end = String(item.end_time || '').trim();
    if (!/^\d{1,2}:\d{2}$/.test(start) || !/^\d{1,2}:\d{2}$/.test(end)) continue;
    parsed.push({
      key: String(item.key || item.name || `period_${parsed.length + 1}`)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_'),
      name: String(item.name || item.key || 'Period').trim() || 'Period',
      start_time: normalizeHm(start),
      end_time: normalizeHm(end),
      enabled: item.enabled !== false,
    });
  }

  return parsed.length > 0 ? parsed : DEFAULT_SESSION_PERIODS.map((p) => ({ ...p }));
}

function normalizeHm(value: string) {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  return `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

export function nowInTimezone(timeZone: string) {
  return DateTime.now().setZone(normalizeTimezone(timeZone));
}

/** Map Luxon weekday (1=Mon..7=Sun) and common schedule labels. */
export function weekdayMatchesSchedule(scheduleTime: string | null | undefined, dt: DateTime) {
  if (!scheduleTime || !String(scheduleTime).trim()) return true;
  const raw = String(scheduleTime).trim().toLowerCase();
  if (raw === 'daily' || raw === 'everyday' || raw === 'every day') return true;

  const luxonWeekday = dt.weekday; // 1-7 Mon-Sun
  const aliases: Record<number, string[]> = {
    1: ['mon', 'monday', 'm'],
    2: ['tue', 'tues', 'tuesday'],
    3: ['wed', 'weds', 'wednesday'],
    4: ['thu', 'thur', 'thurs', 'thursday'],
    5: ['fri', 'friday'],
    6: ['sat', 'saturday'],
    7: ['sun', 'sunday'],
  };

  for (const [day, names] of Object.entries(aliases)) {
    if (Number(day) !== luxonWeekday) continue;
    return names.some((name) => raw === name || raw.startsWith(name) || raw.includes(name));
  }

  // Numeric day-of-week strings like "1" (Mon) sometimes used
  if (/^[1-7]$/.test(raw)) return Number(raw) === luxonWeekday;

  return false;
}

/** Build a UTC Date for a local wall-clock time on the given zoned calendar day. */
export function wallTimeOnDayToUtc(
  timeZone: string,
  day: DateTime,
  hm: string
): Date {
  const tz = normalizeTimezone(timeZone);
  const [hour, minute] = normalizeHm(hm).split(':').map((n) => parseInt(n, 10));
  const local = day.setZone(tz).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
  return local.toUTC().toJSDate();
}

export function generateAttendanceCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
