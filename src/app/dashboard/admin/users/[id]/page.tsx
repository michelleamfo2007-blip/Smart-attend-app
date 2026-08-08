'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './student-dashboard.module.css';
import { 
  ArrowLeft, BookOpen, CheckCircle, Clock, 
  AlertTriangle, XCircle, GraduationCap, Building,
  Calendar, Check, X
} from 'lucide-react';

interface TimelineEvent {
  sessionId: string;
  className: string;
  date: string;
  status: 'Present' | 'Absent';
}

interface StudentAnalytics {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    level: string | null;
    semester: string | null;
  };
  analytics?: {
    classes: Array<{
      classId: string;
      className: string;
      level: string;
      semester: string;
      totalSessions: number;
      attendedSessions: number;
      missedSessions: number;
      percentage: number;
    }>;
    timeline: TimelineEvent[];
    overall: {
      totalSessions: number;
      attendedSessions: number;
      missedSessions: number;
      percentage: number;
    };
  };
}

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!params?.id) return;
    try {
      const res = await fetch(`/api/admin/users/${params.id}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        console.error('Failed to fetch user:', json.error);
        setErrorMsg(`API Error: ${res.status} - ${json.error || 'Unknown'}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;
  if (errorMsg) return <div className={styles.page}><p style={{color: 'red', fontWeight: 'bold'}}>{errorMsg}</p></div>;
  if (!data) return <div className={styles.page}><p>User not found.</p></div>;

  const { user, analytics } = data;

  // Initials for avatar
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 75) return { color: '#10b981', label: 'Excellent', bg: styles.bgGreen, text: styles.textGreen };
    if (percentage >= 50) return { color: '#f59e0b', label: 'Warning', bg: styles.bgOrange, text: styles.textOrange };
    return { color: '#ef4444', label: 'At Risk', bg: styles.bgRed, text: styles.textRed };
  };

  const status = analytics ? getStatusColor(analytics.overall.percentage) : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.pageTitle}>Student Analytics</h1>
      </header>

      {user.role === 'STUDENT' && analytics ? (
        <div className={styles.dashboardGrid}>
          {/* LEFT COLUMN: Profile & Progress */}
          <div className={styles.leftColumn}>
            <div className={styles.profileCard}>
              <div className={styles.avatar}>{initials}</div>
              <h2 className={styles.profileName}>{user.name}</h2>
              <p className={styles.profileEmail}>{user.email}</p>
              
              <div className={styles.profileDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>ID Number</span>
                  <span className={styles.detailValue} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                    {user.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Level</span>
                  <span className={styles.detailValue}>{user.level || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Semester</span>
                  <span className={styles.detailValue}>{user.semester || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={`${styles.badge} ${analytics.overall.percentage >= 75 ? styles.badgeGreen : analytics.overall.percentage >= 50 ? styles.badgeYellow : styles.badgeRed}`}>
                    {status?.label}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.sectionCard} style={{ marginTop: '24px' }}>
              <h3 className={styles.sectionTitle} style={{ textAlign: 'center', marginBottom: '24px' }}>
                Overall Progress
              </h3>
              
              <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto' }}>
                {/* Circular Progress SVG */}
                <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle 
                    cx="80" cy="80" r="70" 
                    fill="none" 
                    stroke="#f1f5f9" 
                    strokeWidth="12" 
                  />
                  <circle 
                    cx="80" cy="80" r="70" 
                    fill="none" 
                    stroke={status?.color} 
                    strokeWidth="12" 
                    strokeDasharray="439.8" 
                    strokeDashoffset={439.8 - (439.8 * analytics.overall.percentage) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                </svg>
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a' }}>
                    {analytics.overall.percentage}%
                  </span>
                </div>
              </div>
              
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '16px' }}>
                {analytics.overall.attendedSessions} of {analytics.overall.totalSessions} sessions attended
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Stats & Tables */}
          <div className={styles.rightColumn}>
            
            {/* STAT CARDS */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <div className={`${styles.iconWrapper} ${styles.bgPurple}`}>
                    <BookOpen size={20} />
                  </div>
                  <h3 className={styles.statTitle}>Enrolled Classes</h3>
                </div>
                <p className={styles.statValue}>{analytics.classes.length}</p>
                <p className={styles.statSub}>Active this semester</p>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <div className={`${styles.iconWrapper} ${styles.bgGreen}`}>
                    <CheckCircle size={20} />
                  </div>
                  <h3 className={styles.statTitle}>Attended</h3>
                </div>
                <p className={styles.statValue}>{analytics.overall.attendedSessions}</p>
                <p className={styles.statSub}>Total sessions</p>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <div className={`${styles.iconWrapper} ${styles.bgRed}`}>
                    <XCircle size={20} />
                  </div>
                  <h3 className={styles.statTitle}>Missed</h3>
                </div>
                <p className={styles.statValue}>{analytics.overall.missedSessions}</p>
                <p className={styles.statSub}>Total sessions</p>
              </div>
            </div>

            {/* CLASS BREAKDOWN TABLE */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <GraduationCap size={20} color="#64748b" />
                <h2 className={styles.sectionTitle}>Class Breakdown</h2>
              </div>
              
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Attendance</th>
                      <th>Missed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.classes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyState}>
                          No classes enrolled.
                        </td>
                      </tr>
                    ) : (
                      analytics.classes.map(cls => (
                        <tr key={cls.classId}>
                          <td>
                            <div className={styles.className}>{cls.className}</div>
                            <div className={styles.classMeta}>{cls.level} • {cls.semester}</div>
                          </td>
                          <td>
                            <div className={styles.progressLabel}>
                              <span>{cls.attendedSessions} / {cls.totalSessions}</span>
                              <span>{cls.percentage}%</span>
                            </div>
                            <div className={styles.progressBarContainer}>
                              <div 
                                className={styles.progressBarFill} 
                                style={{ 
                                  width: `${cls.percentage}%`, 
                                  backgroundColor: getStatusColor(cls.percentage).color 
                                }}
                              />
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: cls.missedSessions > 0 ? '#ef4444' : '#64748b' }}>
                              {cls.missedSessions}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${cls.percentage >= 75 ? styles.badgeGreen : cls.percentage >= 50 ? styles.badgeYellow : styles.badgeRed}`}>
                              {getStatusColor(cls.percentage).label}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TIMELINE HISTORY */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <Clock size={20} color="#64748b" />
                <h2 className={styles.sectionTitle}>Attendance History</h2>
              </div>
              
              <div style={{ padding: '8px 0' }}>
                {analytics.timeline.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Calendar size={48} className={styles.emptyIcon} />
                    <p>No attendance records found.</p>
                  </div>
                ) : (
                  <div className={styles.timeline}>
                    {analytics.timeline.map((event, index) => (
                      <div key={index} className={styles.timelineItem}>
                        <div className={`${styles.timelineIcon} ${event.status === 'Present' ? styles.present : styles.absent}`}>
                          {event.status === 'Present' ? <Check size={20} /> : <X size={20} />}
                        </div>
                        <div className={styles.timelineContent}>
                          <h4 className={styles.timelineTitle}>
                            {event.className}
                          </h4>
                          <p className={styles.timelineDate}>
                            {new Date(event.date).toLocaleDateString('en-US', { 
                              weekday: 'short', month: 'short', day: 'numeric', 
                              hour: 'numeric', minute: '2-digit' 
                            })}
                            {' • '}
                            <strong style={{ color: event.status === 'Present' ? '#10b981' : '#ef4444' }}>
                              {event.status}
                            </strong>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Building size={20} color="#64748b" />
            <h2 className={styles.sectionTitle}>Staff Profile</h2>
          </div>
          <p style={{ color: '#64748b', padding: '12px 0' }}>
            Detailed analytics are only available for Student accounts. 
            This user is registered as <strong>{user.role}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
