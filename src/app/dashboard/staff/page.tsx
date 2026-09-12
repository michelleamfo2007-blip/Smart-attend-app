'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { canUseStaffAttendance } from '@/lib/attendanceAccess';
import styles from './staff.module.css';

type SessionCard = {
  id: string;
  status: string;
  open: boolean;
  present: number;
  late: number;
  absent: number;
  expected: number;
  staffVerified: number;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  class: {
    name: string;
    course_code: string | null;
    classroom: { name: string; building?: string | null } | null;
    lecturer?: { name: string | null } | null;
  };
};

type RosterRow = {
  studentId: string;
  name: string | null;
  studentIndex: string | null;
  status: string;
  method: string | null;
  methodLabel: string | null;
  verificationType: string | null;
  timestamp: string | null;
  notes: string | null;
  markedBy: string | null;
  recordId: string | null;
  flags: { id: string; reason: string }[];
};

type HistoryRow = {
  id: string;
  timestamp: string;
  status: string;
  methodLabel: string;
  verificationType: string;
  notes: string | null;
  studentName: string | null;
  studentIndex: string | null;
  markedBy: string | null;
  course: string;
  room: string | null;
  flagCount: number;
};

type FlagRow = {
  id: string;
  reason: string;
  created_at: string;
  flagged_by_user?: { name: string | null };
  record?: {
    student_name?: string | null;
    student?: { name: string | null; student_id: string | null };
    session?: { class?: { name: string; course_code: string | null } };
  } | null;
};

type SuccessCard = {
  studentName: string;
  studentId: string | null;
  course: string;
  timestamp: string;
  markedBy: string | null;
  checkInStatus?: string;
  verificationType?: string;
};

type Tab = 'live' | 'roster' | 'history' | 'flags' | 'audit';

export default function StaffAttendancePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('live');
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [mode, setMode] = useState<'home' | 'scan' | 'search'>('home');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<{ id: string; name: string | null; student_id: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessCard | null>(null);
  const [scanHint, setScanHint] = useState('Point the camera at the student QR');
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [rosterCounts, setRosterCounts] = useState({ present: 0, late: 0, absent: 0, expected: 0, staffVerified: 0 });
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyQ, setHistoryQ] = useState('');
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [manualTarget, setManualTarget] = useState<{ id: string; name: string | null; student_id: string | null } | null>(null);
  const [manualReason, setManualReason] = useState('');
  const [flagTarget, setFlagTarget] = useState<{ recordId: string; label: string } | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const current = sessions.find((s) => s.id === sessionId) || sessions.find((s) => s.status === 'active') || sessions[0] || null;

  const loadSessions = useCallback(async () => {
    const res = await fetch('/api/staff/sessions');
    const data = await res.json();
    if (res.status === 403) {
      setError('You are not authorized for librarian / attendance officer mode.');
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
      const active = (data.sessions || []).find((s: SessionCard) => s.status === 'active');
      return active?.id || data.sessions?.[0]?.id || '';
    });
  }, []);

  const loadRoster = useCallback(async (id: string) => {
    if (!id) {
      setRoster([]);
      return;
    }
    const res = await fetch(`/api/staff/sessions/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to load roster');
      return;
    }
    setRoster(data.roster || []);
    setRosterCounts(data.counts || { present: 0, late: 0, absent: 0, expected: 0, staffVerified: 0 });
  }, []);

  const loadHistory = useCallback(async (q = '') => {
    const res = await fetch(`/api/staff/history?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (res.ok) setHistory(data.records || []);
  }, []);

  const loadFlags = useCallback(async () => {
    const res = await fetch('/api/staff/flags');
    const data = await res.json();
    if (res.ok) setFlags(data.flags || []);
  }, []);

  const loadAudit = useCallback(async () => {
    const res = await fetch('/api/staff/audit');
    const data = await res.json();
    if (res.ok) setAuditLogs(data.logs || []);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role === 'STUDENT' || !canUseStaffAttendance(user)) {
      router.replace(user?.role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/lecturer');
    }
  }, [user, loading, router]);

  useEffect(() => {
    loadSessions();
    const poll = setInterval(loadSessions, 5000);
    return () => clearInterval(poll);
  }, [loadSessions]);

  useEffect(() => {
    if (tab === 'roster' && sessionId) loadRoster(sessionId);
    if (tab === 'history') loadHistory(historyQ);
    if (tab === 'flags') loadFlags();
    if (tab === 'audit') loadAudit();
  }, [tab, sessionId, historyQ, loadRoster, loadHistory, loadFlags, loadAudit]);

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

  const markPresent = async (payload: {
    studentId?: string;
    studentQr?: string;
    method: 'staff_scan' | 'staff_manual';
    reason?: string;
  }) => {
    if (!sessionId || !current?.open) {
      setError('No open attendance session. Wait for a scheduled class to become active.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          studentId: payload.studentId,
          studentQr: payload.studentQr,
          method: payload.method,
          reason: payload.reason,
        }),
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
        checkInStatus: data.record.checkInStatus,
        verificationType: data.record.verificationType,
      });
      setMode('home');
      setManualTarget(null);
      setManualReason('');
      setQuery('');
      setHits([]);
      loadSessions();
      if (tab === 'roster') loadRoster(sessionId);
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

  const submitManual = async () => {
    if (!manualTarget) return;
    await markPresent({
      studentId: manualTarget.id,
      method: 'staff_manual',
      reason: manualReason,
    });
  };

  const submitFlag = async () => {
    if (!flagTarget) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/staff/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: flagTarget.recordId, reason: flagReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not flag attendance');
        return;
      }
      setFlagTarget(null);
      setFlagReason('');
      if (tab === 'roster' && sessionId) loadRoster(sessionId);
      if (tab === 'flags') loadFlags();
      if (tab === 'history') loadHistory(historyQ);
    } finally {
      setBusy(false);
    }
  };

  const resolveFlag = async (flagId: string, status: 'reviewed' | 'dismissed') => {
    await fetch('/api/staff/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagId, status }),
    });
    loadFlags();
  };

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  const lib = user.permissions?.librarian;
  const canMark = lib?.can_mark !== false;
  const canHistory = lib?.can_history !== false;
  const canFlag = lib?.can_flag !== false;
  const canEdit = Boolean(lib?.can_edit);
  const canDelete = Boolean(lib?.can_delete);

  const formatTime = (value?: string | null) =>
    value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  const editRecord = async (recordId: string, checkInStatus: 'present' | 'late') => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/staff/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not edit record');
        return;
      }
      if (sessionId) loadRoster(sessionId);
      if (tab === 'history') loadHistory(historyQ);
    } finally {
      setBusy(false);
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (!window.confirm('Delete this attendance record? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/staff/records/${recordId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not delete record');
        return;
      }
      if (sessionId) loadRoster(sessionId);
      if (tab === 'history') loadHistory(historyQ);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Librarian Attendance</h1>
          <p>
            Verify students without phones, view Present / Late / Absent, and flag suspicious check-ins.
            Staff-verified marks are always audited.
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        {([
          ['live', 'Live assist', canMark],
          ['roster', 'Roster', true],
          ['history', 'History', canHistory],
          ['flags', 'Flags', canFlag],
          ['audit', 'Audit', canFlag || canHistory],
        ] as const).filter(([, , allowed]) => allowed).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? styles.tabActive : styles.tab}
            onClick={() => { setTab(id); setMode('home'); setError(''); }}
          >
            {label}
          </button>
        ))}
      </div>

      <section className={styles.sessionCard}>
        <div style={{ flex: 1 }}>
          <span>Class session</span>
          {sessions.length > 0 ? (
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  [{session.status}] {session.class.course_code || session.class.name}
                  {session.class.classroom?.name ? ` · ${session.class.classroom.name}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <strong>No active or scheduled sessions</strong>
          )}
          <p>
            {current?.class.classroom?.name || current?.class.name || 'Waiting for timetable sessions…'}
            {current?.class.lecturer?.name ? ` · ${current.class.lecturer.name}` : ''}
            {current?.scheduled_start
              ? ` · ${formatTime(current.scheduled_start)}–${formatTime(current.scheduled_end)}`
              : ''}
          </p>
        </div>
        <div className={styles.counts}>
          <div><b>{current?.present ?? rosterCounts.present}</b><span>Present</span></div>
          <div><b>{current?.late ?? rosterCounts.late}</b><span>Late</span></div>
          <div><b>{current?.absent ?? rosterCounts.absent}</b><span>Absent</span></div>
          <div><b>{current?.staffVerified ?? rosterCounts.staffVerified}</b><span>Staff</span></div>
        </div>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      {tab === 'live' && mode === 'home' && (
        <div className={styles.actions}>
          <button
            className={styles.primary}
            disabled={!current?.open}
            onClick={() => { setError(''); setMode('scan'); }}
          >
            Scan student QR
          </button>
          <button
            className={styles.secondary}
            disabled={!current?.open}
            onClick={() => { setError(''); setMode('search'); }}
          >
            Find student manually
          </button>
        </div>
      )}

      {tab === 'live' && mode === 'scan' && (
        <section className={styles.panel}>
          <video ref={videoRef} className={styles.video} playsInline muted />
          <p>{scanHint}</p>
          <p className={styles.hint}>Staff scan = staff-verified attendance (no student GPS required).</p>
          <button className={styles.secondary} onClick={() => setMode('home')}>Cancel</button>
        </section>
      )}

      {tab === 'live' && mode === 'search' && (
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
                onClick={() => setManualTarget(student)}
              >
                <strong>{student.name}</strong>
                <span>{student.student_id || 'No student ID'}</span>
                <em>Verify &amp; mark</em>
              </button>
            ))}
          </div>
          <button className={styles.secondary} onClick={() => setMode('home')}>Back</button>
        </section>
      )}

      {tab === 'roster' && (
        <section className={styles.panel}>
          <div className={styles.rosterHeader}>
            <strong>Present / Late / Absent</strong>
            <button type="button" className={styles.linkBtn} onClick={() => sessionId && loadRoster(sessionId)}>
              Refresh
            </button>
          </div>
          <div className={styles.rosterList}>
            {roster.length === 0 && <p className={styles.hint}>Select a session to view the roster.</p>}
            {roster.map((row) => (
              <div key={row.studentId} className={styles.rosterRow}>
                <div>
                  <strong>{row.name || 'Student'}</strong>
                  <span>{row.studentIndex || '—'}</span>
                </div>
                <div className={styles.rosterMeta}>
                  <span className={`${styles.badge} ${styles[`badge_${row.status}`] || ''}`}>
                    {row.status}
                  </span>
                  {row.verificationType === 'staff_verified' && (
                    <span className={styles.badgeStaff}>staff-verified</span>
                  )}
                  {row.methodLabel && <span className={styles.muted}>{row.methodLabel}</span>}
                  {row.timestamp && (
                    <span className={styles.muted}>{new Date(row.timestamp).toLocaleTimeString()}</span>
                  )}
                  {row.markedBy && <span className={styles.muted}>by {row.markedBy}</span>}
                  {row.notes && <span className={styles.muted}>reason: {row.notes}</span>}
                </div>
                <div className={styles.rosterActions}>
                  {row.status === 'pending' && current?.open && canMark && (
                    <button
                      type="button"
                      className={styles.tinyPrimary}
                      onClick={() =>
                        setManualTarget({
                          id: row.studentId,
                          name: row.name,
                          student_id: row.studentIndex,
                        })
                      }
                    >
                      Mark
                    </button>
                  )}
                  {row.recordId && canEdit && (row.status === 'present' || row.status === 'late') && (
                    <button
                      type="button"
                      className={styles.tinySecondary}
                      disabled={busy}
                      onClick={() =>
                        editRecord(row.recordId!, row.status === 'present' ? 'late' : 'present')
                      }
                    >
                      {row.status === 'present' ? 'Mark late' : 'Mark present'}
                    </button>
                  )}
                  {row.recordId && canFlag && (
                    <button
                      type="button"
                      className={styles.tinySecondary}
                      onClick={() =>
                        setFlagTarget({
                          recordId: row.recordId!,
                          label: row.name || row.studentIndex || 'Student',
                        })
                      }
                    >
                      Flag
                    </button>
                  )}
                  {row.recordId && canDelete && (
                    <button
                      type="button"
                      className={styles.tinySecondary}
                      disabled={busy}
                      onClick={() => deleteRecord(row.recordId!)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'history' && (
        <section className={styles.panel}>
          <input
            className={styles.search}
            placeholder="Search history by student, ID, or course"
            value={historyQ}
            onChange={(e) => setHistoryQ(e.target.value)}
          />
          <div className={styles.rosterList}>
            {history.map((row) => (
              <div key={row.id} className={styles.rosterRow}>
                <div>
                  <strong>{row.studentName}</strong>
                  <span>{row.studentIndex || '—'} · {row.course}</span>
                </div>
                <div className={styles.rosterMeta}>
                  <span className={`${styles.badge} ${styles[`badge_${row.status}`] || ''}`}>{row.status}</span>
                  <span className={row.verificationType === 'staff_verified' ? styles.badgeStaff : styles.badgeSelf}>
                    {row.verificationType === 'staff_verified' ? 'staff-verified' : 'self check-in'}
                  </span>
                  <span className={styles.muted}>{row.methodLabel}</span>
                  <span className={styles.muted}>{new Date(row.timestamp).toLocaleString()}</span>
                  {row.markedBy && <span className={styles.muted}>by {row.markedBy}</span>}
                  {row.notes && <span className={styles.muted}>reason: {row.notes}</span>}
                </div>
                <div className={styles.rosterActions}>
                  <button
                    type="button"
                    className={styles.tinySecondary}
                    onClick={() => setFlagTarget({ recordId: row.id, label: row.studentName || 'Student' })}
                  >
                    Flag
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'flags' && (
        <section className={styles.panel}>
          <p className={styles.hint}>Open suspicious-activity flags. Records are never deleted from here.</p>
          <div className={styles.rosterList}>
            {flags.length === 0 && <p className={styles.hint}>No open flags.</p>}
            {flags.map((flag) => (
              <div key={flag.id} className={styles.rosterRow}>
                <div>
                  <strong>
                    {flag.record?.student?.name || flag.record?.student_name || 'Student'}
                  </strong>
                  <span>
                    {flag.record?.student?.student_id || '—'} ·{' '}
                    {flag.record?.session?.class?.course_code || flag.record?.session?.class?.name || 'Class'}
                  </span>
                </div>
                <div className={styles.rosterMeta}>
                  <span className={styles.muted}>{flag.reason}</span>
                  <span className={styles.muted}>
                    by {flag.flagged_by_user?.name || 'officer'} · {new Date(flag.created_at).toLocaleString()}
                  </span>
                </div>
                <div className={styles.rosterActions}>
                  <button type="button" className={styles.tinyPrimary} onClick={() => resolveFlag(flag.id, 'reviewed')}>
                    Reviewed
                  </button>
                  <button type="button" className={styles.tinySecondary} onClick={() => resolveFlag(flag.id, 'dismissed')}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'audit' && (
        <section className={styles.panel}>
          <p className={styles.hint}>Recent attendance and suspicious-activity events for your school.</p>
          <div className={styles.rosterList}>
            {auditLogs.length === 0 && <p className={styles.hint}>No audit events yet.</p>}
            {auditLogs.map((log) => (
              <div key={log.id} className={styles.rosterRow}>
                <div>
                  <strong>{log.action}</strong>
                  <span>{log.user?.name || log.role || 'System'} · {log.result || 'info'}</span>
                </div>
                <div className={styles.rosterMeta}>
                  <span className={styles.muted}>{log.details}</span>
                  <span className={styles.muted}>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {manualTarget && (
        <div className={styles.overlay} onClick={() => !busy && setManualTarget(null)}>
          <div className={styles.success} onClick={(e) => e.stopPropagation()}>
            <h2>Staff-verified attendance</h2>
            <p><strong>{manualTarget.name}</strong></p>
            <p>Student ID: {manualTarget.student_id || '—'}</p>
            <p className={styles.hint}>Confirm identity in person, then enter a reason (required for audit).</p>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="e.g. No smartphone — verified student ID card"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button className={styles.secondary} disabled={busy} onClick={() => setManualTarget(null)}>Cancel</button>
              <button
                className={styles.primary}
                disabled={busy || manualReason.trim().length < 3}
                onClick={submitManual}
              >
                {busy ? 'Saving…' : 'Mark present'}
              </button>
            </div>
          </div>
        </div>
      )}

      {flagTarget && (
        <div className={styles.overlay} onClick={() => !busy && setFlagTarget(null)}>
          <div className={styles.success} onClick={(e) => e.stopPropagation()}>
            <h2>Flag suspicious attendance</h2>
            <p><strong>{flagTarget.label}</strong></p>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Why is this suspicious?"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button className={styles.secondary} disabled={busy} onClick={() => setFlagTarget(null)}>Cancel</button>
              <button
                className={styles.primary}
                disabled={busy || flagReason.trim().length < 3}
                onClick={submitFlag}
              >
                {busy ? 'Saving…' : 'Flag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className={styles.overlay} onClick={() => setSuccess(null)}>
          <div className={styles.success} onClick={(e) => e.stopPropagation()}>
            <h2>Attendance Recorded</h2>
            <p><strong>{success.studentName}</strong></p>
            <p>Student ID: {success.studentId || '—'}</p>
            <p>Course/Class: {success.course}</p>
            <p>Status: {success.checkInStatus || 'present'}</p>
            <p>Type: {success.verificationType === 'staff_verified' ? 'Staff-verified' : 'Self check-in'}</p>
            <p>Time: {new Date(success.timestamp).toLocaleString()}</p>
            <p>Marked by Staff Member: {success.markedBy || officerName || user.name}</p>
            <button className={styles.primary} onClick={() => setSuccess(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
