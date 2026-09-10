'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import styles from './kiosk.module.css';

type KioskPayload = {
  kiosk: { name: string; classroom: { name: string } };
  session: {
    id: string;
    status: string;
    class: { name: string; course_code: string | null; classroom: { name: string } | null };
  } | null;
};

export default function ClassroomKioskPage() {
  const params = useParams();
  const token = String(params.token || '');
  const [data, setData] = useState<KioskPayload | null>(null);
  const [error, setError] = useState('');
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/public/kiosk/${token}`);
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
    const tick = setInterval(() => setQrTimestamp(Date.now()), 10000);
    return () => clearInterval(tick);
  }, []);

  const open = Boolean(data?.session);
  const course = data?.session?.class.course_code || data?.session?.class.name || '—';
  const room = data?.session?.class.classroom?.name || data?.kiosk.classroom.name || '—';
  const qrValue = data?.session
    ? JSON.stringify({
        sessionId: data.session.id,
        t: qrTimestamp,
        timestamp: qrTimestamp,
        source: 'desktop_qr',
      })
    : '';

  return (
    <div className={styles.page}>
      <div className={styles.brand}>SMART ATTEND</div>
      <p className={styles.prompt}>Scan to access today’s attendance</p>

      <div className={styles.qrWrap}>
        {open && qrValue ? (
          <QRCode value={qrValue} size={280} level="M" />
        ) : (
          <div className={styles.closedQr}>No active session</div>
        )}
      </div>

      <div className={styles.meta}>
        <div><span>Course</span><strong>{course}</strong></div>
        <div><span>Room</span><strong>{room}</strong></div>
        <div>
          <span>Attendance</span>
          <strong className={open ? styles.open : styles.closed}>{open ? 'OPEN' : 'CLOSED'}</strong>
        </div>
      </div>

      {data?.kiosk && (
        <p className={styles.desktop}>{data.kiosk.name}</p>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
