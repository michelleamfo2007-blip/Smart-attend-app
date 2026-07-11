'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import styles from './student.module.css';

interface Enrollment {
  id: string;
  course: {
    id: string;
    code: string;
    name: string;
    sessions: { id: string; isActive: boolean; latitude: number; longitude: number }[];
  };
}

interface AttendanceRecord {
  id: string;
  timestamp: string;
  distance: number;
  session: {
    course: { code: string; name: string };
    startTime: string;
  };
}

export default function StudentDashboard() {
  const { user } = useUser();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [markMsg, setMarkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [coursesRes, attendanceRes] = await Promise.all([
      fetch('/api/student/courses'),
      fetch('/api/student/attendance'),
    ]);
    const coursesData = await coursesRes.json();
    const attendanceData = await attendanceRes.json();
    setEnrollments(coursesData.enrollments || []);
    setRecords(attendanceData.records || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkAttendance = async (sessionId: string, courseId: string) => {
    setMarking(courseId);
    setMarkMsg(null);

    if (!navigator.geolocation) {
      setMarkMsg({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      setMarking(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const res = await fetch('/api/student/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, latitude, longitude }),
        });
        const data = await res.json();
        if (res.ok) {
          setMarkMsg({ type: 'success', text: `✓ Attendance marked! You were ${data.distance}m from the class.` });
          fetchData();
        } else {
          setMarkMsg({ type: 'error', text: data.error || 'Failed to mark attendance.' });
        }
        setMarking(null);
      },
      (err) => {
        setMarkMsg({ type: 'error', text: 'Could not get your location. Please allow location access.' });
        setMarking(null);
      }
    );
  };

  const activeSessions = enrollments.filter(e => e.course.sessions.length > 0);
  const totalClasses = records.length;
  const attendanceRate = enrollments.length > 0
    ? Math.round((totalClasses / Math.max(enrollments.length * 5, 1)) * 100)
    : 0;

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Good day, {user?.name?.split(' ')[0]} 👋</h1>
          <p className={styles.pageSubtitle}>Here&apos;s your attendance overview</p>
        </div>
      </div>

      {/* Notification */}
      {markMsg && (
        <div className={`${styles.notification} ${markMsg.type === 'success' ? styles.notifSuccess : styles.notifError}`}>
          {markMsg.text}
          <button onClick={() => setMarkMsg(null)} className={styles.notifClose}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fff0f2', color: '#e01e37' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          </div>
          <div>
            <div className={styles.statValue}>{enrollments.length}</div>
            <div className={styles.statLabel}>Enrolled Courses</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f0fdf4', color: '#22c55e' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <div>
            <div className={styles.statValue}>{totalClasses}</div>
            <div className={styles.statLabel}>Classes Attended</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div className={styles.statValue}>{activeSessions.length}</div>
            <div className={styles.statLabel}>Active Sessions</div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.liveDot} /> Live Sessions
          </h2>
          <div className={styles.sessionGrid}>
            {activeSessions.map((e) => {
              const session = e.course.sessions[0];
              const alreadyMarked = records.some(r =>
                r.session.course.code === e.course.code && r.session.startTime === session.startTime
              );
              return (
                <div key={e.id} className={styles.sessionCard}>
                  <div className={styles.sessionCardHeader}>
                    <div className={styles.courseCodeBadge}>{e.course.code}</div>
                    <span className={styles.liveTag}>● LIVE</span>
                  </div>
                  <h3 className={styles.courseName}>{e.course.name}</h3>
                  <p className={styles.sessionInfo}>Session is currently active — mark your attendance now!</p>
                  <button
                    id={`mark-attendance-${e.course.id}`}
                    className={`${styles.markBtn} ${alreadyMarked ? styles.markBtnDone : ''}`}
                    onClick={() => handleMarkAttendance(session.id, e.course.id)}
                    disabled={!!marking || alreadyMarked}
                  >
                    {marking === e.course.id ? (
                      <><span className={styles.btnSpinner} /> Getting location...</>
                    ) : alreadyMarked ? (
                      <>✓ Attendance Marked</>
                    ) : (
                      <>📍 Mark My Attendance</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Courses */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>My Courses</h2>
        {enrollments.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📚</div>
            <p>You&apos;re not enrolled in any courses yet.</p>
            <span>Contact your administrator to get enrolled.</span>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {enrollments.map((e) => {
              const attended = records.filter(r => r.session.course.code === e.course.code).length;
              const hasActive = e.course.sessions.length > 0;
              return (
                <div key={e.id} className={styles.courseCard}>
                  <div className={styles.courseCardTop}>
                    <div className={styles.courseCodeBadge}>{e.course.code}</div>
                    {hasActive && <span className={styles.activeIndicator}>● Active</span>}
                  </div>
                  <h3 className={styles.courseName}>{e.course.name}</h3>
                  <div className={styles.courseStats}>
                    <span>{attended} classes attended</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Attendance */}
      <section id="history" className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Attendance</h2>
        {records.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p>No attendance records yet.</p>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Course</span>
              <span>Date & Time</span>
              <span>Distance</span>
              <span>Status</span>
            </div>
            {records.slice(0, 10).map((r) => (
              <div key={r.id} className={styles.tableRow}>
                <div>
                  <strong>{r.session.course.code}</strong>
                  <span>{r.session.course.name}</span>
                </div>
                <span>{new Date(r.timestamp).toLocaleString()}</span>
                <span>{Math.round(r.distance)}m away</span>
                <span className={styles.statusPresent}>Present</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
