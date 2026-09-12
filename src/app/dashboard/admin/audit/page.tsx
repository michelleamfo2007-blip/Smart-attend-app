'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

interface AuditLog {
  id: string;
  user_id: string | null;
  institution_id?: string | null;
  session_id?: string | null;
  student_id?: string | null;
  role?: string | null;
  result?: string | null;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
  user?: { id: string; name: string | null; email: string | null; role: string | null } | null;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [category, setCategory] = useState<'all' | 'attendance'>('attendance');
  const [openFlags, setOpenFlags] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (actionFilter) params.set('action', actionFilter);
    if (resultFilter) params.set('result', resultFilter);
    if (category) params.set('category', category);
    const res = await fetch(`/api/admin/audit?${params.toString()}`);
    const data = await res.json();
    setLogs(data.logs || []);
    setOpenFlags(data.summary?.openFlags || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, resultFilter, category]);

  const getActionColor = (action: string, result?: string | null) => {
    if (result === 'failure' || action.includes('FAILED') || action.includes('REJECTED')) return '#ef4444';
    if (result === 'warning' || action.includes('DUPLICATE') || action.includes('SUSPICIOUS')) return '#f59e0b';
    if (action.includes('LOGIN') || result === 'success') return '#10b981';
    if (action.includes('ATTENDANCE') || action.includes('SESSION')) return '#3b82f6';
    return '#6b7280';
  };

  const actionOptions = Array.from(new Set(logs.map((l) => l.action))).sort();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Audit Logs</h1>
          <p className={styles.pageSubtitle}>
            Attendance security trail — sessions, check-ins, location checks, and suspicious activity.
            {openFlags > 0 ? ` ${openFlags} open librarian flag(s).` : ''}
          </p>
        </div>
        <button type="button" className={styles.actionBtn} onClick={fetchLogs}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search action, details, user…"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select
          className={styles.searchInput}
          value={category}
          onChange={(e) => setCategory(e.target.value as 'all' | 'attendance')}
          style={{ width: 160 }}
        >
          <option value="attendance">Attendance events</option>
          <option value="all">All events</option>
        </select>
        <select
          className={styles.searchInput}
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="">Any result</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select
          className={styles.searchInput}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ width: 220 }}
        >
          <option value="">Any action</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <button type="button" className={styles.actionBtnOutline || styles.actionBtn} onClick={fetchLogs}>
          Search
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Result</th>
                <th>Actor</th>
                <th>Details</th>
                <th>Session</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className={styles.clickableRow}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: `${getActionColor(log.action, log.result)}15`,
                        color: getActionColor(log.action, log.result),
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>{log.result || '—'}</td>
                  <td>
                    <div>{log.user?.name || log.user_id || 'System'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {log.role || log.user?.role || '—'}
                    </div>
                  </td>
                  <td style={{ maxWidth: '320px', whiteSpace: 'normal' }}>{log.details}</td>
                  <td style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {log.session_id ? `${log.session_id.slice(0, 8)}…` : '—'}
                  </td>
                  <td>{log.ip_address || 'Unknown'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
