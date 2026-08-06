'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import styles from '../admin.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  level: string | null;
  semester: string | null;
  _count: {
    classes_lectured: number;
    attendance_sessions: number;
  };
  analytics?: {
    weekly: { attended: number; required: number; percentage: number };
    overall: { attended: number; required: number; percentage: number };
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived state for filtering
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const term = searchQuery.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(term);
      const matchEmail = (u.email || '').toLowerCase().includes(term);
      const matchRole = (u.role || '').toLowerCase().includes(term);
      const matchClass = ((u.level || '') + ' ' + (u.semester || '')).toLowerCase().includes(term);
      return matchName || matchEmail || matchRole || matchClass;
    });
  }, [users, searchQuery]);

  // Derived state for summary cards
  const stats = useMemo(() => {
    const students = users.filter(u => u.role === 'STUDENT');
    if (students.length === 0) return null;

    let perfectWeekly = 0;
    let perfectOverall = 0;
    let below50 = 0;
    let sumWeekly = 0;
    let sumOverall = 0;

    students.forEach(s => {
      const w = s.analytics?.weekly.percentage || 0;
      const o = s.analytics?.overall.percentage || 0;

      if (w >= 100) perfectWeekly++;
      if (o >= 100) perfectOverall++;
      if (o < 50) below50++;
      sumWeekly += w;
      sumOverall += o;
    });

    return {
      total: students.length,
      perfectWeekly,
      perfectOverall,
      below50,
      avgWeekly: Math.round(sumWeekly / students.length),
      avgOverall: Math.round(sumOverall / students.length)
    };
  }, [users]);

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90) return { label: 'Good', className: styles.statusGreen };
    if (percentage >= 75) return { label: 'Fair', className: styles.statusBlue };
    if (percentage >= 50) return { label: 'Warning', className: styles.statusOrange };
    return { label: 'At Risk', className: styles.statusRed };
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>User Management</h1>
          <p className={styles.pageSubtitle}>Monitor student attendance and staff activity.</p>
        </div>
      </div>

      {stats && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryTitle}>Total Students</span>
            <span className={styles.summaryValue}>{stats.total}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryTitle}>Avg Overall Att.</span>
            <span className={styles.summaryValue}>{stats.avgOverall}%</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryTitle}>Perfect Weekly</span>
            <span className={styles.summaryValue} style={{ color: '#166534' }}>{stats.perfectWeekly}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryTitle}>At Risk (&lt;50%)</span>
            <span className={styles.summaryValue} style={{ color: '#991b1b' }}>{stats.below50}</span>
          </div>
        </div>
      )}

      <div className={styles.searchContainer}>
        <input 
          type="text" 
          placeholder="Search by name, email, role, or class..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <section className={styles.section}>
        <div className={styles.table}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: '2fr 2fr 1fr 2fr 2fr 1fr' }}>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Weekly Attendance</span>
            <span>Overall Attendance</span>
            <span>Status</span>
          </div>
          {filteredUsers.length === 0 ? (
            <div className={styles.tableEmpty}>No users found.</div>
          ) : (
            filteredUsers.map(u => {
              const isStudent = u.role === 'STUDENT';
              const weekly = u.analytics?.weekly;
              const overall = u.analytics?.overall;
              const status = isStudent && overall ? getStatusBadge(overall.percentage) : { label: 'N/A', className: styles.statusGray };

              return (
                <div key={u.id} className={styles.tableRow} style={{ gridTemplateColumns: '2fr 2fr 1fr 2fr 2fr 1fr' }}>
                  <div className={styles.userCell}>
                    <div className={styles.userAvatar}>{(u.name || '?').charAt(0).toUpperCase()}</div>
                    <strong>{u.name}</strong>
                  </div>
                  <span>{u.email}</span>
                  <span>
                    <span className={`${styles.roleBadge} ${styles['role' + u.role]}`}>{u.role}</span>
                  </span>

                  {isStudent && weekly && overall ? (
                    <>
                      <span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                            {weekly.attended} / {weekly.required} classes
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            Weekly: {weekly.percentage}%
                          </span>
                        </div>
                      </span>
                      <span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                            {overall.attended} / {overall.required} classes
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            Overall: {overall.percentage}%
                          </span>
                        </div>
                      </span>
                      <span>
                        <span className={`${styles.statusBadge} ${status.className}`}>
                          {status.label}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {u.role === 'LECTURER' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{u._count.classes_lectured} Classes</span>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Teaching</span>
                          </div>
                        )}
                      </span>
                      <span>
                        {u.role === 'LECTURER' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{u._count.attendance_sessions} Sessions</span>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Conducted</span>
                          </div>
                        )}
                      </span>
                      <span><span className={`${styles.statusBadge} ${styles.statusGray}`}>Active</span></span>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
