'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../admin.module.css';

interface Class {
  id: string;
  name: string;
  level: string;
  semester: string;
  schedule_time: string;
  records: { id: string }[];
  sessions: { id: string; status: string }[];
  _count: { sessions: number };
  lecturer: { name: string };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('');
  const [newClassSemester, setNewClassSemester] = useState('');
  const [newClassLecturer, setNewClassLecturer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [classesRes, usersRes] = await Promise.all([
      fetch('/api/admin/courses'),
      fetch('/api/admin/users')
    ]);
    const classesData = await classesRes.json();
    const usersData = await usersRes.json();
    
    setClasses(classesData.courses || []);
    const allUsers: User[] = usersData.users || [];
    setLecturers(allUsers.filter(u => u.role === 'LECTURER'));
    
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) {
      setMsg({ type: 'error', text: 'Class name is required' });
      return;
    }

    setIsSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName,
          level: newClassLevel,
          semester: newClassSemester,
          lecturer_id: newClassLecturer
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setNewClassName('');
        setNewClassLevel('');
        setNewClassSemester('');
        setNewClassLecturer('');
        fetchData();
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to create class' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>All Modules</h1>
          <p className={styles.pageSubtitle}>Select a module to view enrolled students and attendance analytics.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Module</button>
      </div>

      {msg && (
        <div className={`${styles.notification} ${msg.type === 'success' ? styles.notifSuccess : styles.notifError}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className={styles.notifClose}>✕</button>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.table}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
            <span>Module Name</span>
            <span>Lecturer</span>
            <span>Info</span>
            <span>Analytics</span>
            <span>Current Status</span>
          </div>
          {classes.length === 0 ? (
            <div className={styles.tableEmpty}>No modules found.</div>
          ) : (
            classes.map(c => (
              <div 
                key={c.id} 
                className={styles.tableRow} 
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', cursor: 'pointer' }}
                onClick={() => router.push(`/dashboard/admin/classes/${c.id}`)}
              >
                <span><strong>{c.name}</strong></span>
                <span>{c.lecturer?.name || 'Unknown'}</span>
                <span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{c.level}</span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.semester}</span>
                  </div>
                </span>
                <span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{c._count.sessions} Total Sessions</span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.records?.length || 0} Total Check-ins</span>
                  </div>
                </span>
                <span>
                  {c.sessions.some(s => s.status === 'active')
                    ? <span className={styles.statusActive}>● Live</span>
                    : <span className={styles.statusEnded}>No session</span>}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Add Module Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Add New Module</h2>
            <form onSubmit={handleCreateClass}>
              <div className={styles.formGroup}>
                <label>Module Name</label>
                <input type="text" className={styles.input} placeholder="e.g. Applied Calculus" value={newClassName} onChange={e => setNewClassName(e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label>Lecturer (Optional)</label>
                <select className={styles.input} value={newClassLecturer} onChange={e => setNewClassLecturer(e.target.value)}>
                  <option value="">Leave unassigned for now...</option>
                  {lecturers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Level / Year (Optional)</label>
                  <input type="text" className={styles.input} placeholder="e.g. Level 100" value={newClassLevel} onChange={e => setNewClassLevel(e.target.value)} />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Semester (Optional)</label>
                  <input type="text" className={styles.input} placeholder="e.g. Semester 1" value={newClassSemester} onChange={e => setNewClassSemester(e.target.value)} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
