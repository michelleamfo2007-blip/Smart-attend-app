'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { Users, GraduationCap, Presentation, BookOpen, Activity, Key, ShieldAlert, AlertTriangle } from 'lucide-react';
import styles from './admin.module.css';

interface User { id: string; name: string; email: string; role: string; }
interface Class { id: string; name: string; level: string; semester: string; schedule_time: string; records: { id: string }[]; sessions: { id: string; status: string }[]; lecturer: { name: string }; }
interface FailureRow {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  user?: { name: string | null; student_id: string | null } | null;
}

import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedCheckins24h, setFailedCheckins24h] = useState(0);
  const [deviceAlerts24h, setDeviceAlerts24h] = useState(0);
  const [recentFailures, setRecentFailures] = useState<FailureRow[]>([]);



  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invite code
  const [inviteCode, setInviteCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);

  const fetchData = useCallback(async () => {
    const [usersRes, classesRes, settingsRes, dashRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/courses'),
      fetch('/api/admin/settings'),
      fetch('/api/admin/dashboard'),
    ]);
    const usersData = await usersRes.json();
    const classesData = await classesRes.json();
    const settingsData = await settingsRes.json();
    const dashData = await dashRes.json();
    setUsers(usersData.users || []);
    setClasses(classesData.courses || []);
    setInviteCode(settingsData.code || '');
    setFailedCheckins24h(dashData.stats?.failedCheckins24h || 0);
    setDeviceAlerts24h(dashData.stats?.deviceAlerts24h || 0);
    setRecentFailures(dashData.recentFailures || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const students = users.filter(u => u.role === 'STUDENT');
  const lecturers = users.filter(u => u.role === 'LECTURER');
  const admins = users.filter(u => u.role === 'ADMIN');
  const activeSessions = classes.reduce((acc, c) => acc + c.sessions.filter(s => s.status === 'active').length, 0);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {(() => {
              const hour = new Date().getHours();
              const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
              return `${greeting}, ${user?.name?.split(' ')[0] || 'Admin'}`;
            })()}
          </h1>
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
          { label: 'Total Users', value: users.length, icon: <Users size={20} />, color: '#fff0f2', textColor: '#e01e37', link: '/dashboard/admin/users?tab=ALL' },
          { label: 'Students', value: students.length, icon: <GraduationCap size={20} />, color: '#eff6ff', textColor: '#3b82f6', link: '/dashboard/admin/users?tab=STUDENT' },
          { label: 'Lecturers', value: lecturers.length, icon: <Presentation size={20} />, color: '#fdf4ff', textColor: '#a855f7', link: '/dashboard/admin/users?tab=LECTURER' },
          { label: 'Classes', value: classes.length, icon: <BookOpen size={20} />, color: '#fff7ed', textColor: '#f97316', link: '/dashboard/admin/classes' },
          { label: 'Active Sessions', value: activeSessions, icon: <Activity size={20} />, color: '#f0fdf4', textColor: '#22c55e', link: '/dashboard/admin/classes' },
          { label: 'Failed check-ins (24h)', value: failedCheckins24h, icon: <AlertTriangle size={20} />, color: '#fef2f2', textColor: '#dc2626', link: '/dashboard/admin/audit' },
          { label: 'Device alerts (24h)', value: deviceAlerts24h, icon: <ShieldAlert size={20} />, color: '#fff7ed', textColor: '#ea580c', link: '/dashboard/admin/audit' },
          { label: 'Admins', value: admins.length, icon: <Key size={20} />, color: '#f8fafc', textColor: '#64748b', link: '/dashboard/admin/users?tab=ALL' },
        ].map(({ label, value, icon, color, textColor, link }) => (
          <div 
            key={label} 
            className={`${styles.statCard} ${styles.clickableCard || ''}`} 
            style={{ borderLeft: `4px solid ${textColor}`, cursor: 'pointer', transition: 'transform 0.2s ease-in-out' }}
            onClick={() => router.push(link)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div className={styles.statIcon} style={{ background: color, fontSize: '1.4rem' }}>{icon}</div>
            <div><div className={styles.statValue} style={{ color: textColor }}>{value}</div><div className={styles.statLabel}>{label}</div></div>
          </div>
        ))}
      </div>

      {(failedCheckins24h > 0 || deviceAlerts24h > 0 || recentFailures.length > 0) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Monitoring alerts (last 24 hours)</h2>
          <p className={styles.pageSubtitle} style={{ marginBottom: 12 }}>
            Uptime probe: <code>/api/health</code> — point UptimeRobot or Better Stack at{' '}
            <code>https://www.smartattend.co/api/health</code>
          </p>
          <div className={styles.formPanel}>
            {recentFailures.length === 0 ? (
              <p className={styles.pageSubtitle}>No recent attendance/device failures.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                {recentFailures.map((row) => (
                  <li key={row.id} style={{ marginBottom: 8, color: '#374151', fontSize: '0.9rem' }}>
                    <strong>{row.action}</strong>
                    {row.user?.name ? ` · ${row.user.name}` : ''}
                    {row.user?.student_id ? ` (${row.user.student_id})` : ''}
                    {' — '}
                    {row.details || 'No details'}
                    <span style={{ color: '#9ca3af' }}>
                      {' · '}
                      {new Date(row.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* System Settings */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>System Settings</h2>
        <div className={styles.formPanel} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ minWidth: '250px' }}>
            <h3 className={styles.formTitle} style={{ margin: 0, marginBottom: '4px' }}>Institution Invite Code</h3>
            <p className={styles.pageSubtitle}>Permanent unique code required for students to register.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: '#f3f4f6', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>
              {inviteCode || 'Loading...'}
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
