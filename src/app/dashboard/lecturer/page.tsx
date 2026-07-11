'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import styles from './lecturer.module.css';

interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  enrollments: { id: string }[];
  sessions: { id: string; isActive: boolean }[];
}

interface Session {
  id: string;
  isActive: boolean;
  startTime: string;
  endTime?: string;
  course: { code: string; name: string };
  attendanceRecords: { id: string; student: { id: string; name: string; email: string } }[];
}

export default function LecturerDashboard() {
  const { user } = useUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [coursesRes, sessionsRes] = await Promise.all([
      fetch('/api/lecturer/courses'),
      fetch('/api/lecturer/sessions'),
    ]);
    const coursesData = await coursesRes.json();
    const sessionsData = await sessionsRes.json();
    setCourses(coursesData.courses || []);
    setSessions(sessionsData.sessions || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStartSession = async (courseId: string) => {
    setStarting(courseId);
    setMsg(null);

    if (!navigator.geolocation) {
      setMsg({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      setStarting(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const res = await fetch('/api/lecturer/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, latitude, longitude }),
        });
        const data = await res.json();
        if (res.ok) {
          setMsg({ type: 'success', text: `✓ Session started for ${data.session.course.name}. Students can now mark attendance.` });
          fetchData();
        } else {
          setMsg({ type: 'error', text: data.error || 'Failed to start session.' });
        }
        setStarting(null);
      },
      () => {
        setMsg({ type: 'error', text: 'Could not get your location. Please allow location access.' });
        setStarting(null);
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

  const activeSession = sessions.find(s => s.isActive);
  const totalStudents = courses.reduce((acc, c) => acc + c.enrollments.length, 0);
  const totalSessions = sessions.length;
  const totalAttendance = sessions.reduce((acc, s) => acc + s.attendanceRecords.length, 0);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p className={styles.pageSubtitle}>Manage your sessions and track attendance</p>
        </div>
      </div>

      {msg && (
        <div className={`${styles.notification} ${msg.type === 'success' ? styles.notifSuccess : styles.notifError}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className={styles.notifClose}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fff0f2', color: '#e01e37' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          </div>
          <div><div className={styles.statValue}>{courses.length}</div><div className={styles.statLabel}>My Courses</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div><div className={styles.statValue}>{totalStudents}</div><div className={styles.statLabel}>Enrolled Students</div></div>
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

      {/* Active session panel */}
      {activeSession && (
        <div className={styles.activeSessionBanner}>
          <div className={styles.activeSessionLeft}>
            <span className={styles.liveDot} />
            <div>
              <strong>Session in Progress</strong>
              <p>{activeSession.course.name} ({activeSession.course.code}) · Started {new Date(activeSession.startTime).toLocaleTimeString()}</p>
            </div>
          </div>
          <div className={styles.activeSessionRight}>
            <div className={styles.attendeeCount}>
              <strong>{activeSession.attendanceRecords.length}</strong>
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

      {/* Courses with start session */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>My Courses</h2>
        {courses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p>No courses assigned to you yet.</p>
            <span>Contact an admin to assign courses to your account.</span>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map((c) => {
              const hasActive = c.sessions.length > 0;
              return (
                <div key={c.id} className={styles.courseCard}>
                  <div className={styles.courseCardTop}>
                    <div className={styles.courseCodeBadge}>{c.code}</div>
                    {hasActive && <span className={styles.activeTag}>● LIVE</span>}
                  </div>
                  <h3 className={styles.courseName}>{c.name}</h3>
                  {c.description && <p className={styles.courseDesc}>{c.description}</p>}
                  <div className={styles.courseFooter}>
                    <span className={styles.enrollCount}>👥 {c.enrollments.length} students</span>
                    {!hasActive ? (
                      <button
                        id={`start-session-${c.id}`}
                        className={styles.startBtn}
                        onClick={() => handleStartSession(c.id)}
                        disabled={!!starting || !!activeSession}
                      >
                        {starting === c.id ? <><span className={styles.btnSpinner} /> Starting...</> : '▶ Start Session'}
                      </button>
                    ) : (
                      <span className={styles.sessionActiveNote}>Session running</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent sessions */}
      <section id="sessions" className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Sessions</h2>
        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🗓️</div>
            <p>No sessions yet. Start your first session above!</p>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Course</span>
              <span>Date</span>
              <span>Duration</span>
              <span>Attended</span>
              <span>Status</span>
            </div>
            {sessions.slice(0, 10).map((s) => {
              const duration = s.endTime
                ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000)
                : null;
              return (
                <div key={s.id} className={styles.tableRow}>
                  <div><strong>{s.course.code}</strong><span>{s.course.name}</span></div>
                  <span>{new Date(s.startTime).toLocaleDateString()}</span>
                  <span>{duration != null ? `${duration} min` : '—'}</span>
                  <span>{s.attendanceRecords.length} students</span>
                  <span className={s.isActive ? styles.statusActive : styles.statusEnded}>
                    {s.isActive ? 'Live' : 'Ended'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
