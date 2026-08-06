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

      </div>

      {msg && (
        <div className={`${styles.notification} ${msg.type === 'success' ? styles.notifSuccess : styles.notifError}`}>
          {msg.text}<button onClick={() => setMsg(null)} className={styles.notifClose}>✕</button>
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


    </div>
  );
}
