'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from '../lecturer.module.css';

interface Class {
  id: string;
  name: string;
  level: string;
  semester: string;
  course_code: string;
  schedule_time: string;
  start_time: string;
  end_time: string;
}

export default function LecturerSchedulePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/lecturer/courses');
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
          <h1 className={styles.pageTitle}>Weekly Schedule</h1>
          <p className={styles.pageSubtitle}>Your timetable for the semester</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
          const dayClasses = classes.filter(c => c.schedule_time === day).sort((a, b) => a.start_time?.localeCompare(b.start_time || '') || 0);
          return (
            <div key={day} style={{ borderBottom: day !== 'Friday' ? '1px solid #f3f4f6' : 'none', display: 'flex' }}>
              <div style={{ width: '120px', padding: '24px', background: '#f9fafb', fontWeight: 'bold', color: '#374151', borderRight: '1px solid #f3f4f6', display: 'flex', alignItems: 'center' }}>
                {day}
              </div>
              <div style={{ padding: '16px 24px', flex: 1, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {dayClasses.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>No classes scheduled</div>
                ) : (
                  dayClasses.map(cls => (
                    <div key={cls.id} style={{ background: '#e01e3710', border: '1px solid #e01e3730', borderRadius: '8px', padding: '12px 16px', minWidth: '200px' }}>
                      <div style={{ fontWeight: 'bold', color: '#e01e37', marginBottom: '4px' }}>
                        {cls.start_time} - {cls.end_time}
                      </div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>{cls.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {cls.course_code} · {cls.level}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
