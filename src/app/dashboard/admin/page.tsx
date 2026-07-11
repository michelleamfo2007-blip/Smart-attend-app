'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './admin.module.css';

interface User { id: string; name: string; email: string; role: string; createdAt: string; }
interface Course { id: string; code: string; name: string; description?: string; enrollments: { id: string }[]; sessions: { id: string; isActive: boolean }[]; }

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Course form
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Enroll form
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollUserId, setEnrollUserId] = useState('');
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [usersRes, coursesRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/courses'),
    ]);
    const usersData = await usersRes.json();
    const coursesData = await coursesRes.json();
    setUsers(usersData.users || []);
    setCourses(coursesData.courses || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCourse(true);
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: courseCode, name: courseName, description: courseDesc }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: `✓ Course "${data.course.name}" created!` });
      setCourseCode(''); setCourseName(''); setCourseDesc('');
      setShowCourseForm(false);
      fetchData();
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to create course.' });
    }
    setCreatingCourse(false);
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrolling(true);
    const res = await fetch('/api/admin/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: enrollUserId, courseId: enrollCourseId }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: `✓ Student enrolled successfully!` });
      setEnrollUserId(''); setEnrollCourseId('');
      setShowEnrollForm(false);
      fetchData();
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to enroll student.' });
    }
    setEnrolling(false);
  };

  const students = users.filter(u => u.role === 'STUDENT');
  const lecturers = users.filter(u => u.role === 'LECTURER');
  const admins = users.filter(u => u.role === 'ADMIN');
  const activeSessions = courses.reduce((acc, c) => acc + c.sessions.filter(s => s.isActive).length, 0);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Admin Dashboard</h1>
          <p className={styles.pageSubtitle}>Manage users, courses and enrollments</p>
        </div>
        <div className={styles.headerActions}>
          <button id="create-course-btn" className={styles.actionBtn} onClick={() => { setShowCourseForm(!showCourseForm); setShowEnrollForm(false); }}>
            + New Course
          </button>
          <button id="enroll-student-btn" className={`${styles.actionBtn} ${styles.actionBtnOutline}`} onClick={() => { setShowEnrollForm(!showEnrollForm); setShowCourseForm(false); }}>
            + Enroll Student
          </button>
        </div>
      </div>

      {msg && (
        <div className={`${styles.notification} ${msg.type === 'success' ? styles.notifSuccess : styles.notifError}`}>
          {msg.text}<button onClick={() => setMsg(null)} className={styles.notifClose}>✕</button>
        </div>
      )}

      {/* Create Course Form */}
      {showCourseForm && (
        <div className={styles.formPanel}>
          <h3 className={styles.formTitle}>Create New Course</h3>
          <form onSubmit={handleCreateCourse} className={styles.inlineForm} id="create-course-form">
            <div className="input-group">
              <label htmlFor="course-code" className="input-label">Course Code</label>
              <input id="course-code" type="text" className="input-field" placeholder="e.g. CS101" value={courseCode} onChange={e => setCourseCode(e.target.value)} required />
            </div>
            <div className="input-group">
              <label htmlFor="course-name" className="input-label">Course Name</label>
              <input id="course-name" type="text" className="input-field" placeholder="e.g. Introduction to Programming" value={courseName} onChange={e => setCourseName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label htmlFor="course-desc" className="input-label">Description (optional)</label>
              <input id="course-desc" type="text" className="input-field" placeholder="Brief description..." value={courseDesc} onChange={e => setCourseDesc(e.target.value)} />
            </div>
            <div className={styles.formActions}>
              <button type="button" className={`btn btn-outline ${styles.cancelBtn}`} onClick={() => setShowCourseForm(false)}>Cancel</button>
              <button type="submit" id="submit-course-btn" className="btn btn-primary" disabled={creatingCourse}>
                {creatingCourse ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Enroll Student Form */}
      {showEnrollForm && (
        <div className={styles.formPanel}>
          <h3 className={styles.formTitle}>Enroll Student in Course</h3>
          <form onSubmit={handleEnroll} className={styles.inlineForm} id="enroll-form">
            <div className="input-group">
              <label htmlFor="enroll-student" className="input-label">Select Student</label>
              <select id="enroll-student" className="input-field" value={enrollUserId} onChange={e => setEnrollUserId(e.target.value)} required>
                <option value="">Choose a student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="enroll-course" className="input-label">Select Course</label>
              <select id="enroll-course" className="input-field" value={enrollCourseId} onChange={e => setEnrollCourseId(e.target.value)} required>
                <option value="">Choose a course...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className={styles.formActions}>
              <button type="button" className={`btn btn-outline ${styles.cancelBtn}`} onClick={() => setShowEnrollForm(false)}>Cancel</button>
              <button type="submit" id="submit-enroll-btn" className="btn btn-primary" disabled={enrolling}>
                {enrolling ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Total Users', value: users.length, icon: '👥', color: '#fff0f2', textColor: '#e01e37' },
          { label: 'Students', value: students.length, icon: '🎓', color: '#eff6ff', textColor: '#3b82f6' },
          { label: 'Lecturers', value: lecturers.length, icon: '📋', color: '#fdf4ff', textColor: '#a855f7' },
          { label: 'Courses', value: courses.length, icon: '📚', color: '#fff7ed', textColor: '#f97316' },
          { label: 'Active Sessions', value: activeSessions, icon: '🟢', color: '#f0fdf4', textColor: '#22c55e' },
          { label: 'Admins', value: admins.length, icon: '🔑', color: '#f8fafc', textColor: '#64748b' },
        ].map(({ label, value, icon, color, textColor }) => (
          <div key={label} className={styles.statCard} style={{ borderLeft: `4px solid ${textColor}` }}>
            <div className={styles.statIcon} style={{ background: color, fontSize: '1.4rem' }}>{icon}</div>
            <div><div className={styles.statValue} style={{ color: textColor }}>{value}</div><div className={styles.statLabel}>{label}</div></div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <section id="users" className={styles.section}>
        <h2 className={styles.sectionTitle}>All Users</h2>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Joined</span>
          </div>
          {users.length === 0 ? (
            <div className={styles.tableEmpty}>No users found.</div>
          ) : (
            users.map(u => (
              <div key={u.id} className={styles.tableRow}>
                <div className={styles.userCell}>
                  <div className={styles.userAvatar}>{u.name.charAt(0).toUpperCase()}</div>
                  <strong>{u.name}</strong>
                </div>
                <span>{u.email}</span>
                <span>
                  <span className={`${styles.roleBadge} ${styles['role' + u.role]}`}>{u.role}</span>
                </span>
                <span>{new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Courses table */}
      <section id="courses" className={styles.section}>
        <h2 className={styles.sectionTitle}>All Courses</h2>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Code</span>
            <span>Name</span>
            <span>Students</span>
            <span>Status</span>
          </div>
          {courses.length === 0 ? (
            <div className={styles.tableEmpty}>No courses yet. Create one above!</div>
          ) : (
            courses.map(c => (
              <div key={c.id} className={styles.tableRow}>
                <span><div className={styles.courseCode}>{c.code}</div></span>
                <span>{c.name}</span>
                <span>{c.enrollments.length} enrolled</span>
                <span>
                  {c.sessions.some(s => s.isActive)
                    ? <span className={styles.statusActive}>● Live</span>
                    : <span className={styles.statusInactive}>No session</span>}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
