'use client';

import { useState } from 'react';
import styles from '@/app/dashboard/admin/admin.module.css';

export interface Institution {
  id?: string;
  name?: string;
  domain?: string;
  contact_email?: string;
  phone_number?: string;
  subscription_plan?: string;
  status?: string;
  billing_cycle?: string;
  trial_period?: boolean;
  max_users?: number | null;
  api_access?: boolean;
  sso?: boolean;
  custom_branding?: boolean;
  notes?: string;
}

export default function InstitutionForm({ 
  institution, 
  onCancel, 
  onSuccess 
}: { 
  institution?: Institution | null;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<Institution>({
    name: institution?.name || '',
    domain: institution?.domain || '',
    contact_email: institution?.contact_email || '',
    phone_number: institution?.phone_number || '',
    subscription_plan: institution?.subscription_plan || 'starter',
    status: institution?.status || 'active',
    billing_cycle: institution?.billing_cycle || 'monthly',
    trial_period: institution?.trial_period || false,
    max_users: institution?.max_users || null,
    api_access: institution?.api_access || false,
    sso: institution?.sso || false,
    custom_branding: institution?.custom_branding || false,
    notes: institution?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!institution?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = isEditing 
      ? `/api/admin/institutions/${institution.id}` 
      : `/api/admin/institutions`;
    
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof Institution, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const Switch = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
    <div className={styles.switchContainer} onClick={() => onChange(!checked)}>
      <div className={`${styles.switch} ${checked ? styles.switchOn : ''}`}>
        <div className={styles.switchHandle} />
      </div>
      <span className={styles.switchLabel}>{label}</span>
    </div>
  );

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>
            {isEditing ? 'Edit Institution' : 'Create New Institution'}
          </h2>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
        </div>
        
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '24px' }}>
              {error}
            </div>
          )}

          <form id="institutionForm" onSubmit={handleSubmit}>
            {/* Section 1: Basic Information */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>1. Basic Information</h3>
              <div className={styles.inlineForm}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>Institution Name *</label>
                  <input 
                    type="text" required value={formData.name} onChange={e => updateField('name', e.target.value)}
                    className={styles.searchInput} placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>Domain</label>
                  <input 
                    type="text" value={formData.domain} onChange={e => updateField('domain', e.target.value)}
                    className={styles.searchInput} placeholder="e.g. acme.com"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>Contact Email *</label>
                  <input 
                    type="email" required value={formData.contact_email} onChange={e => updateField('contact_email', e.target.value)}
                    className={styles.searchInput} placeholder="admin@acme.com"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>Phone Number</label>
                  <input 
                    type="tel" value={formData.phone_number} onChange={e => updateField('phone_number', e.target.value)}
                    className={styles.searchInput} placeholder="+1 (555) 000-0000"
                  />
                </div>
                {isEditing && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>Status</label>
                    <select 
                      value={formData.status} onChange={e => updateField('status', e.target.value)}
                      className={styles.filterSelect} style={{ width: '100%' }}
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Subscription & Billing */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>2. Subscription & Billing</h3>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Billing Cycle:</label>
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                  <button type="button" onClick={() => updateField('billing_cycle', 'monthly')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: formData.billing_cycle === 'monthly' ? 'white' : 'transparent', boxShadow: formData.billing_cycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 600 }}>Monthly</button>
                  <button type="button" onClick={() => updateField('billing_cycle', 'annual')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: formData.billing_cycle === 'annual' ? 'white' : 'transparent', boxShadow: formData.billing_cycle === 'annual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 600 }}>Annual <span style={{ color: '#10b981', fontSize: '0.75rem', marginLeft: '4px' }}>Save 20%</span></button>
                </div>
              </div>

              <div className={styles.planGrid}>
                {/* Starter Plan */}
                <div className={`${styles.planCard} ${formData.subscription_plan === 'starter' ? styles.planCardActive : ''}`} onClick={() => updateField('subscription_plan', 'starter')}>
                  <span className={styles.planTitle}>Starter</span>
                  <span className={styles.planPrice}>$29<span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>/mo</span></span>
                  <div className={styles.planFeature}>✓ 1 Admin</div>
                  <div className={styles.planFeature}>✓ 50 Users</div>
                  <div className={styles.planFeature}>✓ 5GB Storage</div>
                </div>
                {/* Pro Plan */}
                <div className={`${styles.planCard} ${formData.subscription_plan === 'pro' ? styles.planCardActive : ''}`} onClick={() => updateField('subscription_plan', 'pro')}>
                  <span className={styles.planTitle}>Pro</span>
                  <span className={styles.planPrice}>$99<span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>/mo</span></span>
                  <div className={styles.planFeature}>✓ 5 Admins</div>
                  <div className={styles.planFeature}>✓ 500 Users</div>
                  <div className={styles.planFeature}>✓ 50GB Storage</div>
                </div>
                {/* Enterprise Plan */}
                <div className={`${styles.planCard} ${formData.subscription_plan === 'enterprise' ? styles.planCardActive : ''}`} onClick={() => updateField('subscription_plan', 'enterprise')}>
                  <span className={styles.planTitle}>Enterprise</span>
                  <span className={styles.planPrice}>$299<span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>/mo</span></span>
                  <div className={styles.planFeature}>✓ Unlimited Admins</div>
                  <div className={styles.planFeature}>✓ Unlimited Users</div>
                  <div className={styles.planFeature}>✓ 500GB Storage</div>
                </div>
              </div>

              <Switch checked={formData.trial_period || false} onChange={v => updateField('trial_period', v)} label="Enable 14-day Free Trial" />
            </div>

            {/* Section 3: Additional Settings */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>3. Additional Settings</h3>
              <div style={{ marginBottom: '16px', maxWidth: '300px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>Max Users Limit (Optional)</label>
                <input 
                  type="number" value={formData.max_users || ''} onChange={e => updateField('max_users', e.target.value)}
                  className={styles.searchInput} placeholder="Leave empty for plan default"
                />
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <Switch checked={formData.api_access || false} onChange={v => updateField('api_access', v)} label="API Access" />
                <Switch checked={formData.sso || false} onChange={v => updateField('sso', v)} label="SSO Integration" />
                <Switch checked={formData.custom_branding || false} onChange={v => updateField('custom_branding', v)} label="Custom Branding" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>Notes / Special Requests</label>
                <textarea 
                  value={formData.notes || ''} onChange={e => updateField('notes', e.target.value)}
                  className={styles.textarea} placeholder="Internal notes about this institution..."
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
          <button type="button" onClick={onCancel} disabled={loading} style={{ padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" form="institutionForm" disabled={loading} style={{ padding: '10px 24px', background: '#e01e37', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Saving...' : (isEditing ? 'Update Institution' : 'Create Institution')}
          </button>
        </div>
      </div>
    </div>
  );
}
