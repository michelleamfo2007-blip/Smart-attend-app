'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Calendar, Clock, User } from 'lucide-react';
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

const CourseCard = ({ cls }: { cls: Class }) => {
  const [expanded, setExpanded] = useState(false);
  const dayAbbr = cls.schedule_time.substring(0, 3).toUpperCase();
  
  return (
    <div style={{ border: '2px solid #e01e37', borderRadius: '20px', marginBottom: '16px', overflow: 'hidden', background: 'white' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer' }}
      >
        <div style={{ width: '60px', height: '60px', background: '#fdf2f2', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: '16px', flexShrink: 0 }}>
           <span style={{ fontWeight: 'bold', color: '#e01e37', fontSize: '15px' }}>{dayAbbr}</span>
           <span style={{ color: '#e01e37', fontSize: '28px', lineHeight: '0.3' }}>.</span>
        </div>
        
        <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>{cls.course_code}</h3>
            <span style={{ background: '#e01e37', color: 'white', fontSize: '10px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>CLASS</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{cls.name}</p>
        </div>
        
        <div style={{ color: '#9ca3af', paddingLeft: '8px' }}>
          {expanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
      </div>
      
      {expanded && (
        <div style={{ background: '#f9fafb', padding: '20px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
             <div style={{ background: 'white', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
               <Calendar size={20} color="#6b7280" />
             </div>
             <div>
               <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Day</div>
               <div style={{ fontWeight: '600', color: '#111827' }}>{cls.schedule_time}</div>
             </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
             <div style={{ background: 'white', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
               <Clock size={20} color="#6b7280" />
             </div>
             <div>
               <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Time</div>
               <div style={{ fontWeight: '600', color: '#e01e37' }}>{cls.start_time} - {cls.end_time}</div>
             </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
             <div style={{ background: 'white', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
               <User size={20} color="#6b7280" />
             </div>
             <div>
               <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Level</div>
               <div style={{ fontWeight: '600', color: '#111827' }}>Level {cls.level}</div>
             </div>
          </div>
        </div>
      )}
    </div>
  )
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

      <div style={{ maxWidth: '600px' }}>
        <div style={{ background: 'white', padding: '12px 24px', borderRadius: '24px', border: '1px solid #f3f4f6', display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
           <ChevronDown size={20} color="#111827" style={{ transform: 'rotate(90deg)' }} />
           <span style={{ fontWeight: 'bold', color: '#111827', letterSpacing: '1px' }}>COURSE SCHEDULE</span>
        </div>

        {classes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
            <p style={{ color: '#6b7280' }}>No classes scheduled yet.</p>
          </div>
        ) : (
          <div>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
              const dayClasses = classes.filter(c => c.schedule_time === day).sort((a, b) => a.start_time?.localeCompare(b.start_time || '') || 0);
              return dayClasses.map(cls => (
                <CourseCard key={cls.id} cls={cls} />
              ));
            })}
          </div>
        )}
      </div>
    </div>
  );
}
