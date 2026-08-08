'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';
import InstitutionForm, { Institution } from '@/components/InstitutionForm';

export default function AdminInstitutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');

  const fetchInstitutions = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/institutions');
    const data = await res.json();
    setInstitutions(data.institutions || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this institution? This action is irreversible.')) return;
    
    await fetch(`/api/admin/institutions/${id}`, { method: 'DELETE' });
    fetchInstitutions();
  };

  const handleStatusToggle = async (inst: Institution) => {
    const newStatus = inst.status === 'active' ? 'suspended' : 'active';
    await fetch(`/api/admin/institutions/${inst.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchInstitutions();
  };

  // Status Badge Helper
  const getStatusBadge = (status: string | undefined) => {
    const s = (status || 'active').toLowerCase();
    if (s === 'active') return <span className={`${styles.statusBadge} ${styles.statusGreen}`}>Active</span>;
    if (s === 'trial') return <span className={`${styles.statusBadge} ${styles.statusBlue}`}>Trial</span>;
    if (s === 'expired') return <span className={`${styles.statusBadge} ${styles.statusRed}`}>Expired</span>;
    if (s === 'suspended') return <span className={`${styles.statusBadge} ${styles.statusGray}`}>Suspended</span>;
    return <span className={`${styles.statusBadge} ${styles.statusGray}`}>{s}</span>;
  };

  const filteredInstitutions = institutions.filter(inst => {
    const matchesSearch = inst.name?.toLowerCase().includes(searchQuery.toLowerCase()) || inst.domain?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || inst.subscription_plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Institutions</h1>
          <p className={styles.pageSubtitle}>Manage tenant institutions on the SaaS platform</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingInst(null); setShowForm(true); }} style={{ padding: '10px 18px', background: '#e01e37', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Institution
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search by name or domain..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select 
          className={styles.filterSelect}
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="all">All Plans</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Institution</th>
              <th>Contact Email</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInstitutions.map(inst => (
              <tr key={inst.id} className={styles.clickableRow}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong>{inst.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{inst.domain || 'No domain'}</span>
                  </div>
                </td>
                <td>{inst.contact_email || 'N/A'}</td>
                <td><span className={styles.badge}>{inst.subscription_plan}</span></td>
                <td>{getStatusBadge(inst.status)}</td>
                <td>{new Date(inst.created_at).toLocaleDateString()}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className={styles.dropdownContainer} style={{ display: 'inline-block' }}>
                    <button className={styles.actionBtnOutline} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', background: 'white', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => {
                      setOpenDropdownId(openDropdownId === inst.id ? null : inst.id!);
                    }}>
                      •••
                    </button>
                    {openDropdownId === inst.id && (
                      <div className={styles.dropdownMenu} style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10 }}>
                        <button className={styles.dropdownItem} onClick={() => { setOpenDropdownId(null); setEditingInst(inst); setShowForm(true); }}>Edit Details</button>
                        <button className={styles.dropdownItem} onClick={() => { setOpenDropdownId(null); handleStatusToggle(inst); }}>
                          {inst.status === 'active' ? 'Suspend Institution' : 'Activate Institution'}
                        </button>
                        <div style={{ height: '1px', background: '#e5e7eb', margin: '4px 0' }} />
                        <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={() => { setOpenDropdownId(null); handleDelete(inst.id!); }}>Delete Institution</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredInstitutions.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                  No institutions found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginTop: '8px', color: '#6b7280', fontSize: '0.875rem' }}>
        <span>Showing {filteredInstitutions.length > 0 ? 1 : 0} to {filteredInstitutions.length} of {institutions.length} entries</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'not-allowed', color: '#9ca3af' }}>Previous</button>
          <button style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'not-allowed', color: '#9ca3af' }}>Next</button>
        </div>
      </div>

      {showForm && (
        <InstitutionForm 
          institution={editingInst} 
          onCancel={() => setShowForm(false)} 
          onSuccess={() => { setShowForm(false); fetchInstitutions(); }}
        />
      )}
    </div>
  );
}
