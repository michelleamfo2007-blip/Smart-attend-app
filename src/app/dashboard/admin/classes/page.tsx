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

export default function AdminClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/courses');
    const data = await res.json();
    setClasses(data.courses || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>All Classes</h1>
          <p className={styles.pageSubtitle}>Select a class to view enrolled students and attendance analytics.</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.table}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
            <span>Class Name</span>
            <span>Lecturer</span>
            <span>Info</span>
            <span>Analytics</span>
            <span>Current Status</span>
          </div>
          {classes.length === 0 ? (
            <div className={styles.tableEmpty}>No classes found.</div>
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
    </div>
  );
}
