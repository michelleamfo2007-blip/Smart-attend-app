'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from '../admin.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  _count: {
    classes_lectured: number;
    attendance_sessions: number;
  };
  attendance_count: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>All Users</h1>
          <p className={styles.pageSubtitle}>Detailed analytics for students and lecturers.</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.table}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
            <span>Name & Email</span>
            <span>Role</span>
            <span>Lecturer Stats</span>
            <span>Student Stats</span>
          </div>
          {users.length === 0 ? (
            <div className={styles.tableEmpty}>No users found.</div>
          ) : (
            users.map(u => (
              <div key={u.id} className={styles.tableRow} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                <div className={styles.userCell}>
                  <div className={styles.userAvatar}>{(u.name || '?').charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{u.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{u.email}</div>
                  </div>
                </div>
                <span>
                  <span className={`${styles.roleBadge} ${styles['role' + u.role]}`}>{u.role}</span>
                </span>
                <span>
                  {u.role === 'LECTURER' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{u._count.classes_lectured} Classes</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{u._count.attendance_sessions} Sessions Held</span>
                    </div>
                  ) : '-'}
                </span>
                <span>
                  {u.role === 'STUDENT' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{u.attendance_count} Check-ins</span>
                    </div>
                  ) : '-'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
