'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import styles from './kiosk.module.css';

type KioskPayload = {
  refreshMs?: number;
  kiosk: {
    name: string;
    deviceLabel?: string | null;
    classroom: { name: string; building?: string | null };
  };
  session: {
    id: string;
    status: string;
    attendanceMethod?: string;
    present?: number;
    expected?: number;
    qrAvailable?: boolean;
    scheduled_start?: string | null;
    scheduled_end?: string | null;
    class: {
      name: string;
      course_code: string | null;
      level: string | null;
      start_time?: string | null;
      end_time?: string | null;
      classroom: { name: string; building?: string | null } | null;
    };
    qr: { payload: string; expiresAt: string } | null;
  } | null;
  waiting?: {
    className: string;
    courseCode: string | null;
    level: string | null;
    startsAt: string | null;
    endsAt: string | null;
  } | null;
};

function formatClock(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function ClassroomKioskPage() {
  const params = useParams();
  const token = String(params.token || '');
  const [data, setData] = useState<KioskPayload | null>(null);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/public/kiosk/${token}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'This desktop is not authorized.');
        setData(null);
        return;
      }
      setError('');
      setData(json);
    } catch {
      setError('Unable to reach Smart Attend.');
    }
  }, [token]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 5000);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    if (!data?.session) return;
    const refreshMs = data.refreshMs || 15000;
    const tick = setInterval(load, refreshMs);
    return () => clearInterval(tick);
  }, [data?.session?.id, data?.refreshMs, load]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const open = Boolean(data?.session);
  const session = data?.session;
  const courseTitle =
    session?.class.course_code || session?.class.name || data?.waiting?.courseCode || data?.waiting?.className || '—';
  const courseSubtitle = session
    ? [session.class.name !== session.class.course_code ? session.class.name : null, session.class.level]
        .filter(Boolean)
        .join(' · ')
    : data?.waiting
      ? [data.waiting.className, data.waiting.level].filter(Boolean).join(' · ')
      : null;

  const building =
    session?.class.classroom?.building || data?.kiosk.classroom.building || null;
  const room =
    session?.class.classroom?.name || data?.kiosk.classroom.name || '—';

  const timeRange = session
    ? session.class.start_time && session.class.end_time
      ? `${session.class.start_time} – ${session.class.end_time}`
      : [formatClock(session.scheduled_start), formatClock(session.scheduled_end)]
          .filter(Boolean)
          .join(' – ') || null
    : data?.waiting
      ? [formatClock(data.waiting.startsAt), formatClock(data.waiting.endsAt)].filter(Boolean).join(' – ') ||
        null
      : null;

  const qrValue = session?.qr?.payload || '';
  const showQr = Boolean(open && session?.qrAvailable && qrValue);
  const shortCodeOnly = open && session && session.qrAvailable === false;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>SMART ATTEND</div>
        <div className={styles.clock}>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      </header>

      <p className={styles.modeLabel}>Classroom Mode</p>

      {open ? (
        <>
          <h1 className={styles.courseTitle}>{courseTitle}</h1>
          {courseSubtitle ? <p className={styles.courseSub}>{courseSubtitle}</p> : null}

          <div className={styles.qrWrap}>
            {showQr ? (
              <QRCode value={qrValue} size={300} level="M" />
            ) : shortCodeOnly ? (
              <div className={styles.closedQr}>
                This session uses short code only.
                <span>Ask the lecturer for the 6-digit code.</span>
              </div>
            ) : (
              <div className={styles.closedQr}>Preparing secure QR…</div>
            )}
          </div>

          <div className={styles.meta}>
            <div>
              <span>Room</span>
              <strong>{building ? `${building} · ${room}` : room}</strong>
            </div>
            <div>
              <span>Session time</span>
              <strong>{timeRange || 'Live'}</strong>
            </div>
            <div>
              <span>Attendance</span>
              <strong className={styles.open}>OPEN</strong>
            </div>
            <div>
              <span>Checked in</span>
              <strong>
                {session?.present ?? 0}
                {session?.expected ? ` / ${session.expected}` : ''}
              </strong>
            </div>
          </div>

          <p className={styles.prompt}>
            {showQr ? 'Students: open SmartAttend and scan this QR' : 'Attendance is open'}
          </p>
        </>
      ) : (
        <>
          <h1 className={styles.courseTitle}>Waiting for class</h1>
          <p className={styles.courseSub}>
            No active QR session in this room right now. Sessions open automatically from the timetable.
          </p>

          <div className={styles.qrWrap}>
            <div className={styles.closedQr}>
              INACTIVE
              {data?.waiting ? (
                <span>
                  Next: {data.waiting.courseCode || data.waiting.className}
                  {data.waiting.startsAt ? ` · ${formatClock(data.waiting.startsAt)}` : ''}
                </span>
              ) : (
                <span>Classroom display — no admin access</span>
              )}
            </div>
          </div>

          <div className={styles.meta}>
            <div>
              <span>Room</span>
              <strong>
                {building ? `${building} · ${room}` : room}
              </strong>
            </div>
            <div>
              <span>Attendance</span>
              <strong className={styles.closed}>CLOSED</strong>
            </div>
            <div>
              <span>Next session</span>
              <strong>
                {data?.waiting
                  ? [data.waiting.courseCode || data.waiting.className, formatClock(data.waiting.startsAt)]
                      .filter(Boolean)
                      .join(' · ')
                  : 'None scheduled'}
              </strong>
            </div>
          </div>
        </>
      )}

      {data?.kiosk && (
        <p className={styles.desktop}>
          {data.kiosk.name}
          {data.kiosk.deviceLabel ? ` · ${data.kiosk.deviceLabel}` : ''}
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
