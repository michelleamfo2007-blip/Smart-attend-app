'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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



  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>All Users</h1>
          <p className={styles.pageSubtitle}>Manage all student and lecturer accounts.</p>
        </div>
      </div>

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
          <div className={styles.tableHeader} style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr' }}>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
          </div>
          {filteredUsers.length === 0 ? (
            <div className={styles.tableEmpty}>No users found.</div>
          ) : (
            filteredUsers.map(u => (
              <div 
                key={u.id} 
                className={`${styles.tableRow} ${styles.clickableRow || ''}`} 
                style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr', cursor: 'pointer' }}
                onClick={() => router.push(`/dashboard/admin/users/${u.id}`)}
              >
                <div className={styles.userCell}>
                  <div className={styles.userAvatar}>{(u.name || '?').charAt(0).toUpperCase()}</div>
                  <strong>{u.name}</strong>
                </div>
                <span>{u.email}</span>
                <span>
                  <span className={`${styles.roleBadge} ${styles['role' + u.role]}`}>{u.role}</span>
                </span>
                <span>
                  <span className={`${styles.statusBadge} ${styles.statusGreen}`}>Active</span>
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
