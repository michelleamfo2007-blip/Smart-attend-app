'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookOpen, PlusCircle, MinusCircle } from 'lucide-react';
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
  const [catalog, setCatalog] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  const fetchData = useCallback(async () => {
    const [classesRes, sessionsRes, catalogRes] = await Promise.all([
      fetch('/api/lecturer/courses'),
      fetch('/api/lecturer/sessions'),
      fetch('/api/lecturer/courses/unassigned'),
    ]);
    const classesData = await classesRes.json();
    const sessionsData = await sessionsRes.json();
    const catalogData = await catalogRes.json();
    
    setClasses(classesData.courses || []);
    setCatalog(catalogData.courses || []);
    
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

  const handleClaim = async (courseId: string) => {
    setClaiming(courseId);
    const res = await fetch('/api/lecturer/courses/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, action: 'claim' })
    });
    if (res.ok) {
      setMsg({ type: 'success', text: '✓ Course claimed successfully!' });
      fetchData();
    } else {
      const data = await res.json();
      setMsg({ type: 'error', text: data.error || 'Failed to claim course' });
    }
    setClaiming(null);
  };

  const handleUnclaim = async (courseId: string) => {
    if (!confirm('Are you sure you want to unclaim this course?')) return;
    setClaiming(courseId);
    const res = await fetch('/api/lecturer/courses/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, action: 'unclaim' })
    });
    if (res.ok) {
      setMsg({ type: 'success', text: '✓ Course unclaimed successfully!' });
      fetchData();
    } else {
      const data = await res.json();
      setMsg({ type: 'error', text: data.error || 'Failed to unclaim course' });
    }
    setClaiming(null);
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
            <p>No classes claimed yet.</p>
            <span>Claim a course from the catalog below.</span>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {classes.map((c) => {
              const hasActive = c.sessions && c.sessions.length > 0;
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
                  <button 
                    onClick={() => handleUnclaim(c.id)}
                    style={{ width: '100%', marginTop: '8px', padding: '8px', background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 500 }}
                  >
                    <MinusCircle size={16} /> Unclaim Course
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className={styles.pageHeader} style={{ marginTop: '40px' }}>
        <div>
          <h2 className={styles.pageTitle} style={{ fontSize: '1.25rem' }}>Course Catalog</h2>
          <p className={styles.pageSubtitle}>Unassigned courses offered by your institution.</p>
        </div>
      </div>
      <section className={styles.section}>
        {catalog.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No unassigned courses available.</p>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {catalog.map(c => (
              <div key={c.id} className={styles.courseCard} style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div className={styles.courseCardTop}>
                  <div className={styles.courseCodeBadge} style={{ background: '#e2e8f0', color: '#475569' }}>{c.level}</div>
                </div>
                <h3 className={styles.courseName}>{c.name}</h3>
                <p className={styles.courseDesc}>{c.semester}</p>
                <div className={styles.courseFooter} style={{ borderTop: 'none', paddingTop: 0, marginTop: '16px' }}>
                  <button
                    onClick={() => handleClaim(c.id)}
                    disabled={claiming === c.id}
                    style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 500 }}
                  >
                    {claiming === c.id ? <span className={styles.btnSpinner} /> : <PlusCircle size={18} />}
                    Claim Course
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
