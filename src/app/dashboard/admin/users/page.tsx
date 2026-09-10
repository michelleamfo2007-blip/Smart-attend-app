'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import BulkImport from '@/components/BulkImport';
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
  can_mark_attendance?: boolean;
  device_id: string | null;
  needs_device_reset: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const initialTab = searchParams.get('tab') as 'ALL' | 'STUDENT' | 'LECTURER' | 'STAFF' || 'ALL';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'STUDENT' | 'LECTURER' | 'STAFF'>(initialTab);
  const [showImport, setShowImport] = useState(false);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);
  const [showOfficerForm, setShowOfficerForm] = useState(false);
  const [officerName, setOfficerName] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerPassword, setOfficerPassword] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['ALL', 'STUDENT', 'LECTURER', 'STAFF'].includes(tab)) {
      setActiveTab(tab as 'ALL' | 'STUDENT' | 'LECTURER' | 'STAFF');
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (activeTab === 'STAFF') {
        if (u.role === 'STUDENT') return false;
        if (u.role !== 'STAFF' && !u.can_mark_attendance) return false;
      } else if (activeTab !== 'ALL' && u.role !== activeTab) {
        return false;
      }
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
    if (!confirm(`Reset the device binding for ${name}? They will be able to log in on a new phone.`)) return;

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

  const handleResetPassword = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Reset the password for ${name}? A temporary password will be shown once.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.temporaryPassword) {
        setResetResult({ name, password: data.temporaryPassword });
      } else {
        alert(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      console.error(err);
      alert('Error resetting password.');
    }
  };

  const handleToggleOfficer = async (e: React.MouseEvent, id: string, enabled: boolean) => {
    e.stopPropagation();
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ can_mark_attendance: enabled }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Could not update attendance officer access.');
      return;
    }
    fetchData();
  };

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: officerName,
        email: officerEmail,
        password: officerPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Could not create staff member.');
      return;
    }
    setShowOfficerForm(false);
    setOfficerName('');
    setOfficerEmail('');
    setOfficerPassword('');
    fetchData();
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Users Management</h1>
          <p className={styles.pageSubtitle}>Manage student, lecturer, and attendance officer accounts.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
            onClick={() => setShowOfficerForm((open) => !open)}
            type="button"
          >
            {showOfficerForm ? 'Close' : 'Add Attendance Officer'}
          </button>
          <button
            className={`${styles.actionBtn} ${showImport ? styles.actionBtnOutline : ''}`}
            onClick={() => setShowImport((open) => !open)}
            type="button"
          >
            {showImport ? 'Close Import' : 'Bulk Import'}
          </button>
        </div>
      </div>

      {showOfficerForm && (
        <form className={styles.formPanel} onSubmit={handleCreateOfficer}>
          <h2 className={styles.formTitle}>Add attendance officer</h2>
          <p className={styles.pageSubtitle} style={{ marginBottom: 16 }}>
            Grants staff scanner access. This is a permission, not a librarian-only role.
          </p>
          <div className={styles.inlineForm}>
            <input className={styles.input} placeholder="Full name" value={officerName} onChange={(e) => setOfficerName(e.target.value)} required />
            <input className={styles.input} type="email" placeholder="Email" value={officerEmail} onChange={(e) => setOfficerEmail(e.target.value)} required />
            <input className={styles.input} type="password" placeholder="Temporary password" value={officerPassword} onChange={(e) => setOfficerPassword(e.target.value)} required minLength={6} />
            <button className={styles.actionBtn} type="submit">Create officer</button>
          </div>
        </form>
      )}

      {showImport && (
        <BulkImport
          institutionId={user?.institution_id}
          onImportComplete={() => {
            setShowImport(false);
            fetchData();
          }}
        />
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
        <button
          onClick={() => router.push('/dashboard/admin/users?tab=ALL')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeTab === 'ALL' ? '#e01e37' : 'transparent', color: activeTab === 'ALL' ? 'white' : '#4b5563', fontWeight: 600, cursor: 'pointer' }}
        >
          All Users
        </button>
        <button
          onClick={() => router.push('/dashboard/admin/users?tab=LECTURER')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeTab === 'LECTURER' ? '#e01e37' : 'transparent', color: activeTab === 'LECTURER' ? 'white' : '#4b5563', fontWeight: 600, cursor: 'pointer' }}
        >
          Lecturers
        </button>
        <button
          onClick={() => router.push('/dashboard/admin/users?tab=STUDENT')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeTab === 'STUDENT' ? '#e01e37' : 'transparent', color: activeTab === 'STUDENT' ? 'white' : '#4b5563', fontWeight: 600, cursor: 'pointer' }}
        >
          Students
        </button>
        <button
          onClick={() => router.push('/dashboard/admin/users?tab=STAFF')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeTab === 'STAFF' ? '#e01e37' : 'transparent', color: activeTab === 'STAFF' ? 'white' : '#4b5563', fontWeight: 600, cursor: 'pointer' }}
        >
          Officers
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
          <div className={styles.tableHeader} style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1.4fr' }}>
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
                style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1.4fr', cursor: 'pointer' }}
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={(e) => handleResetPassword(e, u.id, u.name)}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', color: '#374151', fontWeight: 600 }}
                    >
                      Reset Password
                    </button>
                  )}
                  {u.role === 'STUDENT' && (
                    <button
                      onClick={(e) => handleResetDevice(e, u.id, u.name)}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', color: '#374151', fontWeight: 600 }}
                      title={u.device_id ? 'Reset Device' : 'No device bound'}
                      disabled={!u.device_id && !u.needs_device_reset}
                    >
                      {u.needs_device_reset ? 'Reset Requested' : (u.device_id ? 'Reset Device' : 'No Device')}
                    </button>
                  )}
                  {u.role !== 'STUDENT' && u.role !== 'ADMIN' && (
                    <button
                      onClick={(e) => handleToggleOfficer(e, u.id, !u.can_mark_attendance)}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: u.can_mark_attendance ? '#fff0f2' : 'white', cursor: 'pointer', color: '#374151', fontWeight: 600 }}
                    >
                      {u.can_mark_attendance ? 'Officer access on' : 'Grant officer access'}
                    </button>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {resetResult && (
        <div className={styles.modalOverlay} onClick={() => setResetResult(null)}>
          <div className={styles.modalContent} style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.formTitle}>Temporary password</h2>
            <p className={styles.pageSubtitle} style={{ marginBottom: '16px' }}>
              Share this with {resetResult.name} now. It will not be shown again.
            </p>
            <div className={styles.input} style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.04em' }}>
              {resetResult.password}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                onClick={() => navigator.clipboard.writeText(resetResult.password)}
              >
                Copy
              </button>
              <button type="button" className={styles.actionBtn} onClick={() => setResetResult(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
