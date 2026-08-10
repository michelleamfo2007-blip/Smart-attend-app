'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from '../../lecturer/lecturer.module.css';

interface Session {
  id: string;
  created_at: string;
  expires_at: string | null;
  status: string;
  class: { name: string };
  records: any[];
}

export default function LecturerSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/lecturer/sessions');
    const data = await res.json();
    setSessions(data.sessions || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Session History</h1>
          <p className={styles.pageSubtitle}>Review attendance logs for all your past classes.</p>
        </div>
      </div>

      <section className={styles.section}>
        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🗓️</div>
            <p>No sessions yet.</p>
            <span>Start your first session from the Classes page!</span>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Class</span>
              <span>Date</span>
              <span>Duration</span>
              <span>Attended</span>
              <span>Status</span>
            </div>
            {sessions.map((s) => {
              const duration = s.expires_at && s.status === 'closed'
                ? Math.round((new Date(s.expires_at).getTime() - new Date(s.created_at).getTime()) / 60000)
                : null;
              return (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #eee' }}>
                  <div className={styles.tableRow} onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)} style={{ cursor: 'pointer', borderBottom: 'none' }}>
                    <div><strong>{s.class.name}</strong></div>
                    <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    <span>{duration != null ? `${duration} min` : '—'}</span>
                    <span>{s.records?.length || 0} students (View)</span>
                    <span className={s.status === 'active' ? styles.statusActive : styles.statusEnded}>
                      {s.status === 'active' ? 'Live' : 'Ended'}
                    </span>
                  </div>
                  
                  {expandedSession === s.id && (
                    <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#374151' }}>Attendees</h4>
                      {s.records && s.records.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          {s.records.map((record: any) => (
                            <div key={record.id} style={{ padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.85rem' }}>
                              <div style={{ fontWeight: '600', color: '#111827' }}>{record.student?.name || 'Unknown Student'}</div>
                              <div style={{ color: '#6b7280' }}>ID: {record.student?.student_id || 'N/A'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>No students attended this session.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
