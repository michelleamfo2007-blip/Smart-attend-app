'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import styles from './admin.module.css';

interface User { id: string; name: string; email: string; role: string; }
interface Class { id: string; name: string; level: string; semester: string; schedule_time: string; records: { id: string }[]; sessions: { id: string; status: string }[]; lecturer: { name: string }; }

export default function AdminDashboard() {
  const { user } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  // Class form
  const [showClassForm, setShowClassForm] = useState(false);
  const [className, setClassName] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invite code
  const [inviteCode, setInviteCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);

  const fetchData = useCallback(async () => {
    const [usersRes, classesRes, settingsRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/courses'),
      fetch('/api/admin/settings'),
    ]);
    const usersData = await usersRes.json();
    const classesData = await classesRes.json();
    const settingsData = await settingsRes.json();
    setUsers(usersData.users || []);
    setClasses(classesData.courses || []);
    setInviteCode(settingsData.code || '');
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateNewCode = async () => {
    setGeneratingCode(true);
    const newCode = 'LECTURER-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCode }),
    });
    if (res.ok) {
      setInviteCode(newCode);
      setMsg({ type: 'success', text: '✓ New Invite Code generated successfully!' });
    } else {
      setMsg({ type: 'error', text: 'Failed to generate new code.' });
    }
    setGeneratingCode(false);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingClass(true);
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: className, lecturer_id: lecturerId, level, semester, schedule_time: scheduleTime }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: `✓ Class "${data.course.name}" created!` });
      setClassName(''); setLecturerId(''); setLevel(''); setSemester(''); setScheduleTime('');
      setShowClassForm(false);
      fetchData();
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to create class.' });
    }
    setCreatingClass(false);
  };

  const students = users.filter(u => u.role === 'STUDENT');
  const lecturers = users.filter(u => u.role === 'LECTURER');
  const admins = users.filter(u => u.role === 'ADMIN');
  const activeSessions = classes.reduce((acc, c) => acc + c.sessions.filter(s => s.status === 'active').length, 0);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Good Morning, {user?.name?.split(' ')[0]}</h1>
          <p className={styles.pageSubtitle}>Manage users and classes</p>
        </div>
        <div className={styles.headerActions}>
          <button id="create-course-btn" className={styles.actionBtn} onClick={() => { setShowClassForm(!showClassForm); }}>
            + New Class
          </button>
        </div>
      </div>

      {msg && (
        <div className={`${styles.notification} ${msg.type === 'success' ? styles.notifSuccess : styles.notifError}`}>
          {msg.text}<button onClick={() => setMsg(null)} className={styles.notifClose}>✕</button>
        </div>
      )}

      {/* Create Class Form */}
      {showClassForm && (
        <div className={styles.formPanel}>
          <h3 className={styles.formTitle}>Create New Class</h3>
          <form onSubmit={handleCreateClass} className={styles.inlineForm} id="create-course-form">
            <div className="input-group">
              <label htmlFor="class-name" className="input-label">Class Name</label>
              <input id="class-name" type="text" className="input-field" placeholder="e.g. Intro to Programming" value={className} onChange={e => setClassName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label htmlFor="lecturer-select" className="input-label">Assign Lecturer</label>
              <select id="lecturer-select" className="input-field" value={lecturerId} onChange={e => setLecturerId(e.target.value)} required>
                <option value="">Select a lecturer...</option>
                {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="class-level" className="input-label">Level</label>
              <select id="class-level" className="input-field" value={level} onChange={e => setLevel(e.target.value)} required>
                <option value="" disabled>Select Level</option>
                <option value="Level 3">Level 3</option>
                <option value="Level 4">Level 4</option>
                <option value="Level 5">Level 5</option>
                <option value="Level 6">Level 6</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="class-semester" className="input-label">Semester</label>
              <select id="class-semester" className="input-field" value={semester} onChange={e => setSemester(e.target.value)} required>
                <option value="" disabled>Select Semester</option>
                <option value="First Semester">First Semester</option>
                <option value="Second Semester">Second Semester</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="schedule-time" className="input-label">Schedule Time</label>
              <input id="schedule-time" type="text" className="input-field" placeholder="e.g. Mon/Wed 10:00 AM" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
            </div>
            
            <div className={styles.formActions}>
              <button type="button" className={`btn btn-outline ${styles.cancelBtn}`} onClick={() => setShowClassForm(false)}>Cancel</button>
              <button type="submit" id="submit-course-btn" className="btn btn-primary" disabled={creatingClass}>
                {creatingClass ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Total Users', value: users.length, icon: '👥', color: '#fff0f2', textColor: '#e01e37' },
          { label: 'Students', value: students.length, icon: '🎓', color: '#eff6ff', textColor: '#3b82f6' },
          { label: 'Lecturers', value: lecturers.length, icon: '📋', color: '#fdf4ff', textColor: '#a855f7' },
          { label: 'Classes', value: classes.length, icon: '📚', color: '#fff7ed', textColor: '#f97316' },
          { label: 'Active Sessions', value: activeSessions, icon: '🟢', color: '#f0fdf4', textColor: '#22c55e' },
          { label: 'Admins', value: admins.length, icon: '🔑', color: '#f8fafc', textColor: '#64748b' },
        ].map(({ label, value, icon, color, textColor }) => (
          <div key={label} className={styles.statCard} style={{ borderLeft: `4px solid ${textColor}` }}>
            <div className={styles.statIcon} style={{ background: color, fontSize: '1.4rem' }}>{icon}</div>
            <div><div className={styles.statValue} style={{ color: textColor }}>{value}</div><div className={styles.statLabel}>{label}</div></div>
          </div>
        ))}
      </div>

      {/* System Settings */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>System Settings</h2>
        <div className={styles.formPanel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className={styles.formTitle} style={{ margin: 0, marginBottom: '4px' }}>Lecturer Invite Code</h3>
            <p className={styles.pageSubtitle}>Current code required for new Lecturers to register.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: '#f3f4f6', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>
              {inviteCode || 'Loading...'}
            </div>
            <button className="btn btn-primary" onClick={generateNewCode} disabled={generatingCode}>
              {generatingCode ? 'Generating...' : 'Generate New Code'}
            </button>
          </div>
        </div>
      </section>

      {/* Users table */}
      <section id="users" className={styles.section}>
        <h2 className={styles.sectionTitle}>All Users</h2>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
          </div>
          {users.length === 0 ? (
            <div className={styles.tableEmpty}>No users found.</div>
          ) : (
            users.map(u => (
              <div key={u.id} className={styles.tableRow} style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
                <div className={styles.userCell}>
                  <div className={styles.userAvatar}>{(u.name || '?').charAt(0).toUpperCase()}</div>
                  <strong>{u.name}</strong>
                </div>
                <span>{u.email}</span>
                <span>
                  <span className={`${styles.roleBadge} ${styles['role' + u.role]}`}>{u.role}</span>
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Classes table */}
      <section id="classes" className={styles.section}>
        <h2 className={styles.sectionTitle}>All Classes</h2>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Class Name</span>
            <span>Lecturer</span>
            <span>Info</span>
            <span>Attended</span>
            <span>Status</span>
          </div>
          {classes.length === 0 ? (
            <div className={styles.tableEmpty}>No classes yet. Create one above!</div>
          ) : (
            classes.map(c => (
              <div key={c.id} className={styles.tableRow} style={{gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr'}}>
                <span><strong>{c.name}</strong></span>
                <span>{c.lecturer?.name || 'Unknown'}</span>
                <span>{c.level} - {c.semester}</span>
                <span>{c.records?.length || 0} attendees</span>
                <span>
                  {c.sessions.some(s => s.status === 'active')
                    ? <span className={styles.statusActive}>● Live</span>
                    : <span className={styles.statusInactive}>No session</span>}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
