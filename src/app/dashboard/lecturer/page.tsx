'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import styles from './lecturer.module.css';
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
  class: { name: string; level: string };
  records: { id: string; student_id: string }[];
}

export default function LecturerDashboard() {
  const { user } = useUser();
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Create Class State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('');
  const [newClassSemester, setNewClassSemester] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const [classesRes, sessionsRes] = await Promise.all([
      fetch('/api/lecturer/courses'), // The API is still /courses, but returns classes
      fetch('/api/lecturer/sessions'),
    ]);
    const classesData = await classesRes.json();
    const sessionsData = await sessionsRes.json();
    setClasses(classesData.courses || []);
    setSessions(sessionsData.sessions || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => setQrTimestamp(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    try {
      const res = await fetch('/api/lecturer/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName, level: newClassLevel, semester: newClassSemester }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: `✓ Class "${data.course.name}" created successfully!` });
        setShowCreateModal(false);
        setNewClassName('');
        setNewClassLevel('');
        setNewClassSemester('');
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
          setMsg({ type: 'success', text: `✓ Session started for ${data.session.class.name}. Students can now mark attendance.` });
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
  const totalStudents = classes.reduce((acc, c) => acc + (c.records?.length || 0), 0);
  const totalSessions = sessions.length;
  const totalAttendance = sessions.reduce((acc, s) => acc + (s.records?.length || 0), 0);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Welcome, {user?.name?.split(' ')[0]}</h1>
          <p className={styles.pageSubtitle}>Manage your sessions and track attendance</p>
        </div>
        <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Class
        </button>
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

      {/* Active session panel */}
      {activeSession && (
        <div className={styles.activeSessionBanner}>
          <div className={styles.activeSessionLeft}>
            <span className={styles.liveDot} />
            <div>
              <strong>Session in Progress</strong>
              <p>{activeSession.class.name} ({activeSession.class.level}) · Started {new Date(activeSession.created_at).toLocaleTimeString()}</p>
            </div>
            
            <div className={styles.qrCodeWrapper}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px' }}>
                <QRCode 
                  value={JSON.stringify({ sessionId: activeSession.id, t: qrTimestamp })}
                  size={200}
                />
              </div>
              <p className={styles.qrHelper}>Students can scan this code with the Mobile App</p>
            </div>
          </div>
          
          <div className={styles.attendeeListWrapper}>
            <div className={styles.attendeeListHeader}>Live Attendance Log</div>
            <div className={styles.attendeeList}>
              {!activeSession.records || activeSession.records.length === 0 ? (
                <div className={styles.noAttendees}>No students have checked in yet.</div>
              ) : (
                activeSession.records.map((record: any) => (
                  <div key={record.id} className={styles.attendeeItem}>
                    <span className={styles.attendeeName}>{record.student_name || 'Unknown Student'}</span>
                    <span className={styles.attendeeTime}>{new Date(record.timestamp).toLocaleTimeString()}</span>
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

      {/* Classes with start session */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>My Classes</h2>
        {classes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p>No classes created yet.</p>
            <span>Click the button in the top right to create your first class.</span>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {classes.map((c) => {
              const hasActive = c.sessions.length > 0;
              return (
                <div key={c.id} className={styles.courseCard}>
                  <div className={styles.courseCardTop}>
                    <div className={styles.courseCodeBadge}>{c.level}</div>
                    {hasActive && <span className={styles.activeTag}>● LIVE</span>}
                  </div>
                  <h3 className={styles.courseName}>{c.name}</h3>
                  <p className={styles.courseDesc}>{c.semester}</p>
                  
                  <div style={{ margin: '12px 0', padding: '8px 12px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      Invite Code: <strong style={{ color: '#111827', letterSpacing: '1px', marginLeft: '4px' }}>{c.invite_code || '---'}</strong>
                    </div>
                    <button 
                      onClick={() => handleRegenerateCode(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e01e37', padding: '4px' }}
                      title="Generate new invite code"
                    >
                      ↻
                    </button>
                  </div>

                  <div className={styles.courseFooter}>
                    <span className={styles.enrollCount}>👥 {c.records?.length || 0} students</span>
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
              <span>Class</span>
              <span>Date</span>
              <span>Duration</span>
              <span>Attended</span>
              <span>Status</span>
            </div>
            {sessions.slice(0, 10).map((s) => {
              const duration = s.expires_at && s.status === 'closed'
                ? Math.round((new Date(s.expires_at).getTime() - new Date(s.created_at).getTime()) / 60000)
                : null;
              return (
                <div key={s.id} className={styles.tableRow}>
                  <div><strong>{s.class.name}</strong></div>
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                  <span>{duration != null ? `${duration} min` : '—'}</span>
                  <span>{s.records?.length || 0} students</span>
                  <span className={s.status === 'active' ? styles.statusActive : styles.statusEnded}>
                    {s.status === 'active' ? 'Live' : 'Ended'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Create New Class</h2>
              <button className={styles.closeModalBtn} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form className={styles.modalForm} onSubmit={handleCreateClass}>
              <div className={styles.formGroup}>
                <label>Class Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Intro to Computer Science" 
                  value={newClassName} 
                  onChange={e => setNewClassName(e.target.value)} 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Level/Code</label>
                <select 
                  className={styles.inputField} 
                  value={newClassLevel} 
                  onChange={e => setNewClassLevel(e.target.value)} 
                  required
                  style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.95rem' }}
                >
                  <option value="" disabled>Select Level</option>
                  <option value="Level 3">Level 3</option>
                  <option value="Level 4">Level 4</option>
                  <option value="Level 5">Level 5</option>
                  <option value="Level 6">Level 6</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Semester</label>
                <select 
                  className={styles.inputField} 
                  value={newClassSemester} 
                  onChange={e => setNewClassSemester(e.target.value)} 
                  required
                  style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.95rem' }}
                >
                  <option value="" disabled>Select Semester</option>
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                </select>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
