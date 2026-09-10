'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { canUseStaffAttendance } from '@/lib/attendanceAccess';
import styles from './staff.module.css';

type SessionCard = {
  id: string;
  present: number;
  expected: number;
  class: {
    name: string;
    course_code: string | null;
    classroom: { name: string } | null;
  };
};

type StudentHit = {
  id: string;
  name: string | null;
  student_id: string | null;
};

type SuccessCard = {
  studentName: string;
  studentId: string | null;
  course: string;
  timestamp: string;
  markedBy: string | null;
};

export default function StaffAttendancePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [mode, setMode] = useState<'home' | 'scan' | 'search'>('home');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessCard | null>(null);
  const [scanHint, setScanHint] = useState('Point the camera at the student QR');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const current = sessions.find((s) => s.id === sessionId) || sessions[0] || null;

  const loadSessions = useCallback(async () => {
    const res = await fetch('/api/staff/sessions');
    const data = await res.json();
    if (res.status === 403) {
      setError('You are not authorized for attendance officer mode.');
      return;
    }
    if (!res.ok) {
      setError(data.error || 'Unable to load sessions');
      return;
    }
    setOfficerName(data.officer?.name || '');
    setSessions(data.sessions || []);
    setSessionId((prev) => {
      if (prev && (data.sessions || []).some((s: SessionCard) => s.id === prev)) return prev;
      return data.sessions?.[0]?.id || '';
    });
  }, [router]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role === 'STUDENT' || !canUseStaffAttendance(user)) {
      router.replace(user?.role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/lecturer');
    }
  }, [user, loading, router]);

  useEffect(() => {
    loadSessions();
    const poll = setInterval(loadSessions, 4000);
    return () => clearInterval(poll);
  }, [loadSessions]);

  useEffect(() => {
    if (mode !== 'scan') {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      scanningRef.current = false;
      return;
    }

    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const Detector = (window as any).BarcodeDetector;
        if (!Detector) {
          setScanHint('Camera scanning is not supported in this browser. Use Find Student Manually.');
          return;
        }
        const detector = new Detector({ formats: ['qr_code'] });
        scanningRef.current = true;
        const loop = async () => {
          if (!scanningRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              scanningRef.current = false;
              await markPresent({ studentQr: codes[0].rawValue, method: 'staff_scan' });
              return;
            }
          } catch {
            // keep scanning
          }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      } catch {
        setScanHint('Camera access was blocked. Use Find Student Manually.');
      }
    };
    start();
    return () => {
      cancelled = true;
      scanningRef.current = false;
    };
  }, [mode]);

  const markPresent = async (payload: { studentId?: string; studentQr?: string; method: 'staff_scan' | 'staff_manual' }) => {
    if (!sessionId) {
      setError('No attendance session is currently active.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not record attendance');
        if (payload.method === 'staff_scan') {
          setTimeout(() => {
            scanningRef.current = true;
          }, 1500);
        }
        return;
      }
      setSuccess({
        studentName: data.record.studentName,
        studentId: data.record.studentId,
        course: data.record.course || data.record.className,
        timestamp: data.record.timestamp,
        markedBy: data.record.markedBy,
      });
      setMode('home');
      setQuery('');
      setHits([]);
      loadSessions();
    } finally {
      setBusy(false);
    }
  };

  const searchStudents = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2 || !sessionId) {
      setHits([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/staff/students?sessionId=${encodeURIComponent(sessionId)}&q=${encodeURIComponent(value)}`);
    const data = await res.json();
    setHits(data.students || []);
    setSearching(false);
  };

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Attendance Officer</h1>
          <p>Scan a student QR or search by name / student ID.</p>
        </div>
      </div>

      <section className={styles.sessionCard}>
        <div>
          <span>Current Attendance Session</span>
          {sessions.length > 1 ? (
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.class.course_code || session.class.name}
                </option>
              ))}
            </select>
          ) : (
            <strong>{current ? (current.class.course_code || current.class.name) : 'No active session'}</strong>
          )}
          <p>{current?.class.classroom?.name || current?.class.name || 'Start a lecturer session to begin.'}</p>
        </div>
        <div className={styles.counts}>
          <div>
            <b>{current?.present ?? 0}</b>
            <span>Present</span>
          </div>
          <div>
            <b>{current?.expected ?? 0}</b>
            <span>Expected</span>
          </div>
        </div>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      {mode === 'home' && (
        <div className={styles.actions}>
          <button className={styles.primary} disabled={!current} onClick={() => { setError(''); setMode('scan'); }}>
            Scan Student
          </button>
          <button className={styles.secondary} disabled={!current} onClick={() => { setError(''); setMode('search'); }}>
            Find Student Manually
          </button>
        </div>
      )}

      {mode === 'scan' && (
        <section className={styles.panel}>
          <video ref={videoRef} className={styles.video} playsInline muted />
          <p>{scanHint}</p>
          <button className={styles.secondary} onClick={() => setMode('home')}>Cancel</button>
        </section>
      )}

      {mode === 'search' && (
        <section className={styles.panel}>
          <input
            autoFocus
            className={styles.search}
            placeholder="Student ID or full name"
            value={query}
            onChange={(e) => searchStudents(e.target.value)}
          />
          {searching && <p>Searching…</p>}
          <div className={styles.hits}>
            {hits.map((student) => (
              <button
                key={student.id}
                className={styles.hit}
                disabled={busy}
                onClick={() => markPresent({ studentId: student.id, method: 'staff_manual' })}
              >
                <strong>{student.name}</strong>
                <span>{student.student_id || 'No student ID'}</span>
                <em>Mark Present</em>
              </button>
            ))}
          </div>
          <button className={styles.secondary} onClick={() => setMode('home')}>Back</button>
        </section>
      )}

      {success && (
        <div className={styles.overlay} onClick={() => setSuccess(null)}>
          <div className={styles.success} onClick={(e) => e.stopPropagation()}>
            <h2>Attendance Recorded</h2>
            <p><strong>{success.studentName}</strong></p>
            <p>Student ID: {success.studentId || '—'}</p>
            <p>Course/Class: {success.course}</p>
            <p>Time: {new Date(success.timestamp).toLocaleString()}</p>
            <p>Marked by Staff Member: {success.markedBy || officerName || user.name}</p>
            <button className={styles.primary} onClick={() => setSuccess(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
