'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import styles from './lecturer.module.css';
import { BookOpen, PlusCircle, MinusCircle, Users, Activity } from 'lucide-react';
import QRCode from 'react-qr-code';

interface Class {
  id: string;
  name: string;
  level: string;
  semester: string;
  invite_code?: string;
  records: { id: string }[];
  sessions: { id: string; status: string }[];
}

interface Session {
  id: string;
  status: string;
  created_at: string;
  expires_at?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  auto_created?: boolean;
  class: { name: string; level: string };
  records: {
    id: string;
    student_id: string;
    student_name?: string | null;
    timestamp?: string;
    student?: { id: string; name: string | null; student_id?: string | null };
  }[];
}

interface CatalogueModule {
  id: string;
  name: string;
  course_code: string;
  level: string;
  credit_hours: number;
  programme?: {
    department: {
      name: string;
      college: {
        name: string;
      }
    }
  }
}

export default function LecturerDashboard() {
  const { user } = useUser();

  const [classes, setClasses] = useState<Class[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueModule[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [liveQrPayload, setLiveQrPayload] = useState<string>('');
  const [liveShortCode, setLiveShortCode] = useState<string>('');
  const [liveCodeExpires, setLiveCodeExpires] = useState<string | null>(null);
  const [locationGate, setLocationGate] = useState<{
    needed: boolean;
    verifying: boolean;
    message: string;
    warning?: string;
  }>({ needed: false, verifying: false, message: '' });
  const [locationVerifyKey, setLocationVerifyKey] = useState(0);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; body: string; read: boolean; created_at: string }[]
  >([]);
  
  // Create Class State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [newClassSemester, setNewClassSemester] = useState('');
  const [scheduleDay, setScheduleDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [creating, setCreating] = useState(false);
  const [locationPromptClassId, setLocationPromptClassId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [classesRes, sessionsRes, catalogueRes, notifRes] = await Promise.all([
      fetch('/api/lecturer/courses'),
      fetch('/api/lecturer/sessions'),
      fetch('/api/lecturer/catalogue'),
      fetch('/api/notifications'),
    ]);
    const classesData = await classesRes.json();
    const sessionsData = await sessionsRes.json();
    const catalogueData = await catalogueRes.json();
    const notifData = notifRes.ok ? await notifRes.json() : { notifications: [] };
    setClasses(classesData.courses || []);
    setSessions(sessionsData.sessions || []);
    setCatalogue(catalogueData.catalogue || []);
    setNotifications(notifData.notifications || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasActiveSession = sessions.some((session) => session.status === 'active');
  const activeSessionId = sessions.find((s) => s.status === 'active')?.id;

  useEffect(() => {
    if (!activeSessionId) {
      setLiveQrPayload('');
      setLiveShortCode('');
      setLiveCodeExpires(null);
      setLocationGate({ needed: false, verifying: false, message: '' });
      return;
    }

    let cancelled = false;

    const verifyThenLoad = async () => {
      // On-demand GPS only — not continuous tracking
      if (!navigator.geolocation) {
        setLocationGate({
          needed: true,
          verifying: false,
          message: 'Geolocation is required to unlock attendance controls.',
        });
        return;
      }

      setLocationGate((prev) => ({ ...prev, verifying: true, message: 'Checking your classroom location…' }));

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const verifyRes = await fetch(`/api/lecturer/sessions/${activeSessionId}/verify-location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              }),
            });
            const verifyData = await verifyRes.json();
            if (cancelled) return;

            if (!verifyRes.ok && verifyData.requiresLocationVerification === false && !verifyData.controlsAllowed) {
              setLocationGate({
                needed: true,
                verifying: false,
                message: verifyData.message || verifyData.error || 'Location check failed.',
              });
              return;
            }

            if (verifyData.controlsAllowed === false) {
              setLocationGate({
                needed: true,
                verifying: false,
                message: verifyData.message || 'You must be in the classroom to use attendance controls.',
              });
              return;
            }

            const warning =
              verifyData.ok === false || verifyData.result === 'failed'
                ? verifyData.message
                : verifyData.result === 'skipped_no_anchor'
                  ? verifyData.message
                  : undefined;

            setLocationGate({
              needed: false,
              verifying: false,
              message: verifyData.message || 'Location verified',
              warning,
            });
          } catch {
            if (!cancelled) {
              setLocationGate({
                needed: true,
                verifying: false,
                message: 'Could not verify location. Try again.',
              });
            }
          }
        },
        () => {
          if (!cancelled) {
            setLocationGate({
              needed: true,
              verifying: false,
              message: 'Location permission is required to unlock attendance controls.',
            });
          }
        },
        { enableHighAccuracy: true, timeout: 20000 }
      );
    };

    verifyThenLoad();
    const recheck = setInterval(verifyThenLoad, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(recheck);
    };
  }, [activeSessionId, locationVerifyKey]);

  useEffect(() => {
    if (!activeSessionId || locationGate.needed || locationGate.verifying) return;

    let cancelled = false;
    const loadLive = async () => {
      try {
        const res = await fetch(`/api/lecturer/sessions/${activeSessionId}/live`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          if (data.requiresLocationVerification) {
            setLocationGate({
              needed: true,
              verifying: false,
              message: data.error || 'Location verification required.',
            });
          }
          return;
        }
        if (data.qr?.payload) setLiveQrPayload(data.qr.payload);
        if (data.shortCode?.code) {
          setLiveShortCode(data.shortCode.code);
          setLiveCodeExpires(data.shortCode.expiresAt || null);
        }
      } catch {
        // ignore
      }
    };

    loadLive();
    const interval = setInterval(loadLive, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeSessionId, locationGate.needed, locationGate.verifying]);

  useEffect(() => {
    if (!hasActiveSession) return;

    const interval = setInterval(async () => {
      const res = await fetch('/api/lecturer/sessions');
      const data = await res.json();
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [hasActiveSession]);

  const refreshShortCode = async () => {
    if (!activeSessionId) return;
    const res = await fetch(`/api/lecturer/sessions/${activeSessionId}/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh_code' }),
    });
    const data = await res.json();
    if (res.ok) {
      setLiveShortCode(data.code);
      setLiveCodeExpires(data.expiresAt || null);
      setMsg({ type: 'success', text: 'Short code refreshed.' });
    } else {
      setMsg({ type: 'error', text: data.error || 'Could not refresh code.' });
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    try {
      const res = await fetch('/api/lecturer/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          moduleId: selectedModule, 
          semester: newClassSemester,
          scheduleDay,
          startTime,
          endTime
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: `✓ Class scheduled successfully!` });
        setShowCreateModal(false);
        setSelectedModule('');
        setNewClassSemester('');
        setScheduleDay('');
        setStartTime('');
        setEndTime('');
        fetchData();
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to create class' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error occurred' });
    } finally {
      setCreating(false);
    }
  };

  const handleStartSession = (courseId: string) => {
    setMsg(null);
    if (activeSession) {
      setMsg({ type: 'error', text: 'End the current session before starting another.' });
      return;
    }
    setLocationPromptClassId(courseId);
  };

  const confirmLocationAndStart = async () => {
    const courseId = locationPromptClassId;
    if (!courseId) return;

    if (!navigator.geolocation) {
      setMsg({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      setLocationPromptClassId(null);
      return;
    }

    setStarting(courseId);
    setMsg({ type: 'success', text: 'Waiting for your classroom location… Allow location access when your browser asks.' });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch('/api/lecturer/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, latitude, longitude }),
          });
          const data = await res.json();
          if (res.ok) {
            setMsg({
              type: 'success',
              text: `✓ Session started for ${data.session.class.name}. Location locked for this class.`,
            });
            setLocationPromptClassId(null);
            fetchData();
          } else {
            setMsg({ type: 'error', text: data.error || 'Failed to start session.' });
          }
        } catch {
          setMsg({ type: 'error', text: 'Failed to start session.' });
        } finally {
          setStarting(null);
        }
      },
      (err) => {
        const denied = err?.code === 1;
        setMsg({
          type: 'error',
          text: denied
            ? 'Location was blocked. Enable location for this site in browser settings, then try again.'
            : 'Could not get your location. Move near a window and try again.',
        });
        setStarting(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  const handleEndSession = async (sessionId: string) => {
    setEnding(sessionId);
    const res = await fetch(`/api/lecturer/sessions/${sessionId}`, { method: 'PATCH' });
    if (res.ok) {
      setMsg({ type: 'success', text: '✓ Session ended successfully.' });
      fetchData();
    } else {
      const data = await res.json();
      setMsg({ type: 'error', text: data.error || 'Failed to end session.' });
    }
    setEnding(null);
  };

  const handleRegenerateCode = async (courseId: string) => {
    const res = await fetch(`/api/lecturer/courses/${courseId}`, { method: 'PATCH' });
    if (res.ok) {
      setMsg({ type: 'success', text: '✓ New Invite Code generated for the class!' });
      fetchData();
    } else {
      setMsg({ type: 'error', text: 'Failed to generate new code.' });
    }
  };

  const activeSession = sessions.find(s => s.status === 'active');
  const scheduledSessions = sessions.filter((s) => s.status === 'scheduled');
  const totalStudents = classes.reduce((acc, c) => acc + (c.records?.length || 0), 0);
  const totalSessions = sessions.length;
  const totalAttendance = sessions.reduce((acc, s) => acc + (s.records?.length || 0), 0);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  const uniqueLevels = Array.from(new Set(catalogue.map(m => m.level))).sort();
  const uniqueColleges = Array.from(new Set(catalogue.map(m => m.programme?.department.college.name).filter(Boolean))).sort();

  const filteredCatalogue = catalogue.filter(m => {
    if (filterLevel && m.level !== filterLevel) return false;
    if (filterCollege && m.programme?.department.college.name !== filterCollege) return false;
    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Welcome, {user?.name?.split(' ')[0]}</h1>
          <p className={styles.pageSubtitle}>
            Timetable opens sessions automatically. Use Start only as an override when needed.
          </p>
        </div>
      </div>

      {msg && (
        <div className={`${styles.notification} ${msg.type === 'success' ? styles.notifSuccess : styles.notifError}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className={styles.notifClose}>✕</button>
        </div>
      )}

      {notifications.filter((n) => !n.read).slice(0, 3).map((n) => (
        <div
          key={n.id}
          className={`${styles.notification} ${styles.notifSuccess}`}
          style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e3a8a' }}
        >
          <div>
            <strong>{n.title}</strong>
            <div style={{ fontSize: '0.9rem', marginTop: 4 }}>{n.body}</div>
          </div>
          <button
            type="button"
            className={styles.notifClose}
            onClick={async () => {
              await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: n.id }),
              });
              setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fff0f2', color: '#e01e37' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          </div>
          <div><div className={styles.statValue}>{classes.length}</div><div className={styles.statLabel}>My Classes</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div><div className={styles.statValue}>{totalStudents}</div><div className={styles.statLabel}>Total Attendees</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fdf4ff', color: '#a855f7' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div><div className={styles.statValue}>{totalSessions}</div><div className={styles.statLabel}>Sessions Held</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f0fdf4', color: '#22c55e' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <div><div className={styles.statValue}>{totalAttendance}</div><div className={styles.statLabel}>Total Check-ins</div></div>
        </div>
      </div>

      {/* Scheduled (auto) sessions */}
      {!activeSession && scheduledSessions.length > 0 && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            borderRadius: 14,
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
          }}
        >
          <strong style={{ color: '#1d4ed8' }}>Upcoming auto sessions today</strong>
          <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: '#1e3a8a', lineHeight: 1.6 }}>
            {scheduledSessions.slice(0, 5).map((s) => (
              <li key={s.id}>
                {s.class?.name || 'Class'}
                {s.scheduled_start
                  ? ` · opens ${new Date(s.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
                {s.scheduled_end
                  ? ` – ${new Date(s.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </li>
            ))}
          </ul>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            No need to start these manually — they go live at the scheduled time. Start Session remains available as an override.
          </p>
        </div>
      )}

      {/* Active session panel */}
      {activeSession && (
        <div className={styles.activeSessionBanner}>
          <div className={styles.activeSessionLeft}>
            <span className={styles.liveDot} />
            <div>
              <strong>Session in Progress</strong>
              <p>{activeSession.class.name} ({activeSession.class.level}) · Started {new Date(activeSession.created_at).toLocaleTimeString()}</p>
            </div>

            {(locationGate.needed || locationGate.verifying || locationGate.warning) && (
              <div
                style={{
                  width: '100%',
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: locationGate.needed ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${locationGate.needed ? '#fecaca' : '#fde68a'}`,
                  color: locationGate.needed ? '#991b1b' : '#92400e',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  {locationGate.verifying
                    ? 'Checking your location (one-time request — not background tracking)…'
                    : locationGate.needed
                      ? locationGate.message
                      : locationGate.warning}
                </span>
                {locationGate.needed && !locationGate.verifying && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setLocationVerifyKey((k) => k + 1)}
                  >
                    Retry location
                  </button>
                )}
              </div>
            )}
            
            {!locationGate.needed && (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                {liveQrPayload ? (
                  <QRCode value={liveQrPayload} size={160} level="H" />
                ) : (
                  <div style={{ width: 160, height: 160, display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Loading secure QR…
                  </div>
                )}
              </div>
              <div style={{ background: '#fdf2f2', border: '2px solid #e01e37', borderRadius: '16px', padding: '24px', textAlign: 'center', flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e01e37', letterSpacing: '1px', marginBottom: '8px' }}>
                  DYNAMIC QR (SECURE TOKEN)
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', lineHeight: '1.4' }}>
                  Students scan this QR with the SmartAttend app. Token refreshes about every 15 seconds.
                </div>
                <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '12px' }}>
                  Old QR tokens expire. GPS + enrollment + device checks still apply.
                </p>
              </div>
              {user?.permissions?.lecturer?.use_short_code !== false && (
              <div style={{ background: '#0f172a', color: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center', minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#94a3b8', marginBottom: 8 }}>SHORT CODE</div>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 6 }}>{liveShortCode || '······'}</div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                  For rooms without a projector. Students enter this in the app.
                  {liveCodeExpires
                    ? ` Expires ${new Date(liveCodeExpires).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                    : ''}
                </p>
                <button
                  type="button"
                  onClick={refreshShortCode}
                  style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Refresh code
                </button>
              </div>
              )}
            </div>
            )}
          </div>
          
          <div className={styles.attendeeListWrapper}>
            <div className={styles.attendeeListHeader}>Live Attendance Log</div>
            <div className={styles.attendeeList}>
              {!activeSession.records || activeSession.records.length === 0 ? (
                <div className={styles.noAttendees}>No students have checked in yet.</div>
              ) : (
                activeSession.records.map((record: any) => (
                  <div key={record.id} className={styles.attendeeItem}>
                    <span className={styles.attendeeName}>{record.student?.name || record.student_name || 'Unknown Student'}</span>
                    <span className={styles.attendeeTime}>
                      {new Date(record.timestamp).toLocaleTimeString()}
                      {record.method ? ` · ${record.method.replace('_', ' ')}` : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.activeSessionRight}>
            <div className={styles.attendeeCount}>
              <strong>{activeSession.records?.length || 0}</strong>
              <span>attended</span>
            </div>
            <button
              className={styles.endBtn}
              onClick={() => handleEndSession(activeSession.id)}
              disabled={ending === activeSession.id}
              id="end-session-btn"
            >
              {ending === activeSession.id ? <span className={styles.btnSpinner} /> : null}
              End Session
            </button>
          </div>
        </div>
      )}



      {/* My Classes Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#111827' }}>My Classes</h2>
        <button onClick={() => setShowCreateModal(true)} className={styles.createBtn} style={{ background: '#e01e37', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>
          + New Class
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {classes.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', background: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#374151', marginBottom: '8px' }}>No Classes Yet</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>Create your first class to start tracking attendance.</p>
            <button onClick={() => setShowCreateModal(true)} style={{ background: '#e01e37', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Create Class</button>
          </div>
        ) : (
          classes.map(cls => (
            <div key={cls.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>{cls.name}</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Level {cls.level}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>Invite Code</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '2px', color: '#111827' }}>{cls.invite_code || '---'}</div>
                </div>

              </div>

              <button 
                onClick={() => handleStartSession(cls.id)} 
                disabled={starting === cls.id || !!activeSession}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: activeSession ? '#e5e7eb' : '#e01e37', 
                  color: activeSession ? '#9ca3af' : 'white', 
                  fontWeight: 'bold', 
                  cursor: activeSession ? 'not-allowed' : 'pointer' 
                }}
              >
                {starting === cls.id ? 'Getting location…' : 'Start with location'}
              </button>
            </div>
          ))
        )}
      </div>



      {locationPromptClassId && (
        <div className={styles.modalOverlay} onClick={() => !starting && setLocationPromptClassId(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className={styles.modalHeader}>
              <h2>Classroom location required</h2>
              <button
                className={styles.closeModalBtn}
                type="button"
                disabled={!!starting}
                onClick={() => setLocationPromptClassId(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#4b5563', lineHeight: 1.5, marginBottom: 20 }}>
              Every attendance session must use your <strong>current</strong> classroom location.
              Students can only check in if they are near you. Your browser will ask for location permission next.
            </p>
            <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
              <button
                type="button"
                onClick={confirmLocationAndStart}
                disabled={!!starting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#e01e37',
                  color: 'white',
                  fontWeight: 700,
                  cursor: starting ? 'wait' : 'pointer',
                }}
              >
                {starting ? 'Getting location…' : 'Share location & start session'}
              </button>
              <button
                type="button"
                disabled={!!starting}
                onClick={() => setLocationPromptClassId(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Create New Class</h2>
              <button className={styles.closeModalBtn} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form className={styles.modalForm} onSubmit={handleCreateClass}>
              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f9fafb', padding: '12px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                <div className={styles.formGroup} style={{ gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Filter by College</label>
                  <select 
                    className={styles.inputField} 
                    value={filterCollege} 
                    onChange={e => { setFilterCollege(e.target.value); setSelectedModule(''); }}
                    style={{ padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    <option value="">All Colleges</option>
                    {uniqueColleges.map(c => (
                      <option key={c as string} value={c as string}>{c as string}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup} style={{ gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Filter by Level</label>
                  <select 
                    className={styles.inputField} 
                    value={filterLevel} 
                    onChange={e => { setFilterLevel(e.target.value); setSelectedModule(''); }}
                    style={{ padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    <option value="">All Levels</option>
                    {uniqueLevels.map(l => (
                      <option key={l} value={l}>Level {l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Select Module from Catalogue</label>
                <select 
                  className={styles.inputField} 
                  value={selectedModule} 
                  onChange={e => setSelectedModule(e.target.value)} 
                  required
                  style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.95rem', width: '100%' }}
                >
                  <option value="" disabled>-- Select a Module --</option>
                  {filteredCatalogue.map(mod => (
                    <option key={mod.id} value={mod.id}>
                      {mod.course_code} - {mod.name} (Level {mod.level})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Semester Taught</label>
                <select 
                  className={styles.inputField} 
                  value={newClassSemester} 
                  onChange={e => setNewClassSemester(e.target.value)} 
                  required
                  style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.95rem', width: '100%' }}
                >
                  <option value="" disabled>Select Semester</option>
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Day of the Week</label>
                <select 
                  className={styles.inputField} 
                  value={scheduleDay} 
                  onChange={e => setScheduleDay(e.target.value)} 
                  required
                  style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.95rem', width: '100%', background: '#f9fafb' }}
                >
                  <option value="" disabled>Select Day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label>Start Time</label>
                  <input 
                    type="time" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    required 
                    style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.95rem', width: '100%', background: '#f9fafb' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>End Time</label>
                  <input 
                    type="time" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)} 
                    required 
                    style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.95rem', width: '100%', background: '#f9fafb' }}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={creating}>
                  {creating ? 'Scheduling...' : 'Schedule Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
