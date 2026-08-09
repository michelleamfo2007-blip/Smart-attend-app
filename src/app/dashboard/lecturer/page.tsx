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
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  const [classes, setClasses] = useState<Class[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueModule[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
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

  const fetchData = useCallback(async () => {
    const [classesRes, sessionsRes, catalogueRes] = await Promise.all([
      fetch('/api/lecturer/courses'), // The API is still /courses, but returns classes
      fetch('/api/lecturer/sessions'),
      fetch('/api/lecturer/catalogue'),
    ]);
    const classesData = await classesRes.json();
    const sessionsData = await sessionsRes.json();
    const catalogueData = await catalogueRes.json();
    setClasses(classesData.courses || []);
    setSessions(sessionsData.sessions || []);
    setCatalogue(catalogueData.catalogue || []);
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
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{cls.level} · {cls.semester}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>Invite Code</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '2px', color: '#111827' }}>{cls.invite_code || '---'}</div>
                </div>
                <button onClick={() => handleRegenerateCode(cls.id)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  Regenerate
                </button>
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
                {starting === cls.id ? 'Starting...' : 'Start Session'}
              </button>
            </div>
          ))
        )}
      </div>



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
