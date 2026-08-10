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
  device_id: string | null;
  needs_device_reset: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'STUDENT' | 'LECTURER'>('ALL');

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
      if (activeTab !== 'ALL' && u.role !== activeTab) return false;
      const term = searchQuery.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(term);
      const matchEmail = (u.email || '').toLowerCase().includes(term);
      const matchRole = (u.role || '').toLowerCase().includes(term);
      const matchClass = ((u.level || '') + ' ' + (u.semester || '')).toLowerCase().includes(term);
      return matchName || matchEmail || matchRole || matchClass;
    });
  }, [users, searchQuery, activeTab]);

  const handleResetDevice = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to reset the device binding for ${name}? They will be able to log in with a new device.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}/reset-device`, { method: 'POST' });
      if (res.ok) {
        alert('Device reset successfully.');
        fetchData();
      } else {
        alert('Failed to reset device.');
      }
    } catch (err) {
      console.error(err);
      alert('Error resetting device.');
    }
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Users Management</h1>
          <p className={styles.pageSubtitle}>Manage student and lecturer accounts.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('ALL')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeTab === 'ALL' ? '#e01e37' : 'transparent', color: activeTab === 'ALL' ? 'white' : '#4b5563', fontWeight: 600, cursor: 'pointer' }}
        >
          All Users
        </button>
        <button 
          onClick={() => setActiveTab('LECTURER')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeTab === 'LECTURER' ? '#e01e37' : 'transparent', color: activeTab === 'LECTURER' ? 'white' : '#4b5563', fontWeight: 600, cursor: 'pointer' }}
        >
          Lecturers
        </button>
        <button 
          onClick={() => setActiveTab('STUDENT')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeTab === 'STUDENT' ? '#e01e37' : 'transparent', color: activeTab === 'STUDENT' ? 'white' : '#4b5563', fontWeight: 600, cursor: 'pointer' }}
        >
          Students
        </button>
      </div>

      <div className={styles.searchContainer} style={{ marginBottom: '16px' }}>
        <input 
          type="text" 
          placeholder="Search by name, email, or class..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <section className={styles.section}>
        <div className={styles.table}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr' }}>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {filteredUsers.length === 0 ? (
            <div className={styles.tableEmpty}>No users found.</div>
          ) : (
            filteredUsers.map(u => (
              <div 
                key={u.id} 
                className={`${styles.tableRow} ${styles.clickableRow || ''}`}
                style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', cursor: 'pointer' }}
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
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {u.role === 'STUDENT' && (
                    <button 
                      onClick={(e) => handleResetDevice(e, u.id, u.name)}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', color: '#374151', fontWeight: 600 }}
                      title={u.device_id ? "Reset Device" : "No device bound"}
                      disabled={!u.device_id && !u.needs_device_reset}
                    >
                      {u.needs_device_reset ? 'Reset Requested' : (u.device_id ? 'Reset Device' : 'No Device')}
                    </button>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
