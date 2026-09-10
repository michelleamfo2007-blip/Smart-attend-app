'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Calendar, Clock, User, BookOpen } from 'lucide-react';
import styles from '../lecturer.module.css';

interface ClassItem {
  id: string;
  name: string;
  level: string | null;
  semester: string | null;
  course_code: string | null;
  schedule_time: string | null;
  start_time: string | null;
  end_time: string | null;
  invite_code?: string | null;
  _count?: { enrollments: number };
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function formatTime(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{1,2}:\d{2}/.test(trimmed)) return trimmed.substring(0, 5);
  return trimmed;
}

function resolveDay(cls: ClassItem): string | null {
  const raw = (cls.schedule_time || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  for (const day of WEEK_DAYS) {
    if (lower === day.toLowerCase() || lower.startsWith(day.toLowerCase())) return day;
  }
  return null;
}

function dayAbbr(day: string | null, scheduleTime?: string | null) {
  if (day) return day.substring(0, 3).toUpperCase();
  if (scheduleTime) return scheduleTime.substring(0, 3).toUpperCase();
  return 'TBD';
}

const CourseCard = ({ cls }: { cls: ClassItem }) => {
  const [expanded, setExpanded] = useState(false);
  const day = resolveDay(cls);
  const start = formatTime(cls.start_time);
  const end = formatTime(cls.end_time);
  const timeLabel = start && end ? `${start} – ${end}` : start || cls.schedule_time || 'Time not set';

  return (
    <div
      style={{
        border: '1px solid #fecaca',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        background: 'white',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: 16,
          cursor: 'pointer',
          border: 'none',
          background: 'transparent',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: '#fef2f2',
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 800, color: '#e01e37', fontSize: 13 }}>{dayAbbr(day, cls.schedule_time)}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#111827' }}>
              {cls.course_code || 'Class'}
            </h3>
            <span
              style={{
                background: '#e01e37',
                color: 'white',
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              {cls._count?.enrollments ?? 0} students
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: '#6b7280',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {cls.name}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#e01e37', fontWeight: 600 }}>{timeLabel}</p>
        </div>

        <div style={{ color: '#9ca3af' }}>{expanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}</div>
      </button>

      {expanded && (
        <div style={{ background: '#f9fafb', padding: 18, borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14, gap: 14 }}>
            <div style={{ background: 'white', padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}>
              <Calendar size={18} color="#6b7280" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Day</div>
              <div style={{ fontWeight: 600, color: '#111827' }}>{day || cls.schedule_time || 'Not set'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14, gap: 14 }}>
            <div style={{ background: 'white', padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}>
              <Clock size={18} color="#6b7280" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Time</div>
              <div style={{ fontWeight: 600, color: '#e01e37' }}>{timeLabel}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14, gap: 14 }}>
            <div style={{ background: 'white', padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}>
              <User size={18} color="#6b7280" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Level</div>
              <div style={{ fontWeight: 600, color: '#111827' }}>
                {cls.level ? `Level ${cls.level}` : 'Not set'}
                {cls.semester ? ` · Sem ${cls.semester}` : ''}
              </div>
            </div>
          </div>

          {cls.invite_code ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ background: 'white', padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                <BookOpen size={18} color="#6b7280" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Invite code</div>
                <div style={{ fontWeight: 700, color: '#111827', letterSpacing: 1 }}>{cls.invite_code}</div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default function LecturerSchedulePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/lecturer/courses');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load schedule');
      setClasses(Array.isArray(data.courses) ? data.courses : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load schedule');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { byDay, unscheduled } = useMemo(() => {
    const grouped: Record<string, ClassItem[]> = {};
    const none: ClassItem[] = [];

    for (const cls of classes) {
      const day = resolveDay(cls);
      if (!day) {
        none.push(cls);
        continue;
      }
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(cls);
    }

    for (const day of Object.keys(grouped)) {
      grouped[day].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    }

    return { byDay: grouped, unscheduled: none };
  }, [classes]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Weekly Schedule</h1>
          <p className={styles.pageSubtitle}>
            {classes.length === 0
              ? 'No classes yet — create or claim a class to build your timetable.'
              : `${classes.length} class${classes.length === 1 ? '' : 'es'} on your timetable`}
          </p>
        </div>
        <Link
          href="/dashboard/lecturer/classes"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#e01e37',
            color: 'white',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 16px',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          Manage classes
        </Link>
      </div>

      <div style={{ maxWidth: 640 }}>
        {error ? (
          <div style={{ padding: 20, background: '#fef2f2', borderRadius: 12, color: '#991b1b', marginBottom: 16 }}>
            {error}
          </div>
        ) : null}

        {classes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: 'white', borderRadius: 16, border: '1px solid #f3f4f6' }}>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>No classes scheduled yet.</p>
            <Link href="/dashboard/lecturer/classes" style={{ color: '#e01e37', fontWeight: 700 }}>
              Go to My Classes
            </Link>
          </div>
        ) : (
          <>
            {WEEK_DAYS.map((day) => {
              const dayClasses = byDay[day] || [];
              if (dayClasses.length === 0) return null;
              return (
                <section key={day} style={{ marginBottom: 28 }}>
                  <h2
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#6b7280',
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}
                  >
                    {day}
                  </h2>
                  {dayClasses.map((cls) => (
                    <CourseCard key={cls.id} cls={cls} />
                  ))}
                </section>
              );
            })}

            {unscheduled.length > 0 ? (
              <section style={{ marginBottom: 28 }}>
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#6b7280',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  Day not set
                </h2>
                {unscheduled.map((cls) => (
                  <CourseCard key={cls.id} cls={cls} />
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
