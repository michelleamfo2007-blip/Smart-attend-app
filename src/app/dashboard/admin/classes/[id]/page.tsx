'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from '../../admin.module.css';

interface StudentAnalytics {
  id: string;
  name: string;
  email: string;
  role: string;
  analytics: {
    weekly: { attended: number; required: number; percentage: number };
    overall: { attended: number; required: number; percentage: number };
  };
}

interface ClassDetails {
  id: string;
  name: string;
  level: string;
  semester: string;
  schedule_time: string;
  lecturer: { name: string };
  sessions: { id: string; status: string }[];
}

export default function AdminClassDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [course, setCourse] = useState<ClassDetails | null>(null);
  const [students, setStudents] = useState<StudentAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/admin/courses/${id}`);
    const data = await res.json();
    if (res.ok) {
      setCourse(data.course);
      setStudents(data.students || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const term = searchQuery.toLowerCase();
      return (s.name || '').toLowerCase().includes(term) || (s.email || '').toLowerCase().includes(term);
    });
  }, [students, searchQuery]);

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90) return { label: 'Good', className: styles.statusGreen };
    if (percentage >= 75) return { label: 'Fair', className: styles.statusBlue };
    if (percentage >= 50) return { label: 'Warning', className: styles.statusOrange };
    return { label: 'At Risk', className: styles.statusRed };
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;
  if (!course) return <div className={styles.page}><h2>Class not found</h2></div>;

  const activeSession = course.sessions.find(s => s.status === 'active');

  return (
    <div className={styles.page}>
      <button 
        onClick={() => router.push('/dashboard/admin/classes')}
        style={{ background: 'none', border: 'none', color: '#e01e37', cursor: 'pointer', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        ← Back to Classes
      </button>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{course.name}</h1>
          <p className={styles.pageSubtitle}>{course.level} - {course.semester}</p>
        </div>
      </div>

      <div className={styles.summaryGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryTitle}>Lecturer</span>
          <span className={styles.summaryValue} style={{ fontSize: '1.2rem' }}>{course.lecturer?.name || 'Unknown'}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryTitle}>Enrolled Students</span>
          <span className={styles.summaryValue}>{students.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryTitle}>Schedule</span>
          <span className={styles.summaryValue} style={{ fontSize: '1.2rem' }}>{course.schedule_time || 'N/A'}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryTitle}>Active Session</span>
          <span className={styles.summaryValue}>
            {activeSession ? <span style={{ color: '#166534', fontSize: '1.2rem' }}>● LIVE</span> : <span style={{ color: '#6b7280', fontSize: '1.2rem' }}>None</span>}
          </span>
        </div>
      </div>

      <div className={styles.searchContainer}>
        <input 
          type="text" 
          placeholder="Search by student name or email..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <section className={styles.section}>
        <div className={styles.table}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: '2fr 2fr 2fr 2fr 1fr' }}>
            <span>Name</span>
            <span>Email</span>
            <span>Weekly Attendance</span>
            <span>Overall Attendance</span>
            <span>Status</span>
          </div>
          {filteredStudents.length === 0 ? (
            <div className={styles.tableEmpty}>No students enrolled.</div>
          ) : (
            filteredStudents.map(s => {
              const weekly = s.analytics.weekly;
              const overall = s.analytics.overall;
              const status = getStatusBadge(overall.percentage);

              return (
                <div key={s.id} className={styles.tableRow} style={{ gridTemplateColumns: '2fr 2fr 2fr 2fr 1fr' }}>
                  <div className={styles.userCell}>
                    <div className={styles.userAvatar}>{(s.name || '?').charAt(0).toUpperCase()}</div>
                    <strong>{s.name}</strong>
                  </div>
                  <span>{s.email}</span>
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
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
