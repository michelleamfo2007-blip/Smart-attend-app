'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import styles from '../../lecturer/lecturer.module.css';

interface Class {
  id: string;
  name: string;
  level: string;
  semester: string;
  invite_code: string;
  records: any[];
  sessions: any[];
}

export default function LecturerClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  const fetchData = useCallback(async () => {
    const [classesRes, sessionsRes] = await Promise.all([
      fetch('/api/lecturer/courses'),
      fetch('/api/lecturer/sessions'),
    ]);
    const classesData = await classesRes.json();
    const sessionsData = await sessionsRes.json();
    
    setClasses(classesData.courses || []);
    
    const active = (sessionsData.sessions || []).find((s: any) => s.status === 'active');
    setActiveSession(active);
    
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

  const handleRegenerateCode = async (courseId: string) => {
    const res = await fetch(`/api/lecturer/courses/${courseId}`, { method: 'PATCH' });
    if (res.ok) {
      setMsg({ type: 'success', text: '✓ New Invite Code generated for the class!' });
      fetchData();
    } else {
      setMsg({ type: 'error', text: 'Failed to generate new code.' });
    }
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Classes</h1>
          <p className={styles.pageSubtitle}>Manage your classes and start sessions.</p>
        </div>
      </div>

      {msg && (
        <div className={`${styles.notification} ${msg.type === 'success' ? styles.notifSuccess : styles.notifError}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className={styles.notifClose}>✕</button>
        </div>
      )}

      <section className={styles.section}>
        {classes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><BookOpen size={48} color="#94a3b8" /></div>
            <p>No classes created yet.</p>
            <span>Go to the Overview page to create your first class.</span>
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
    </div>
  );
}
