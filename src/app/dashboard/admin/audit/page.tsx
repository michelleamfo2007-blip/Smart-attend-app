'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/audit');
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return '#10b981';
    if (action.includes('DUPLICATE')) return '#f59e0b';
    if (action.includes('FAILED') || action.includes('ERROR')) return '#ef4444';
    if (action.includes('ATTENDANCE')) return '#3b82f6';
    return '#6b7280';
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Audit Logs</h1>
          <p className={styles.pageSubtitle}>System-wide security and access monitoring</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search by action or details..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Details</th>
              <th>User ID</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} className={styles.clickableRow}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    backgroundColor: `${getActionColor(log.action)}15`, 
                    color: getActionColor(log.action) 
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>{log.details}</td>
                <td>{log.user_id || 'System'}</td>
                <td>{log.ip_address || 'Unknown'}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
