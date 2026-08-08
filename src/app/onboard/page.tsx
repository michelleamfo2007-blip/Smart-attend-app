'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './onboard.module.css';
import Link from 'next/link';

function OnboardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'starter';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Institution
    institutionName: '',
    domain: '',
    contactEmail: '',
    // Admin
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, plan }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register institution');
      }

      // Successful registration & login, redirect to dashboard
      router.push('/dashboard/admin');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', marginBottom: '2rem', fontSize: '0.875rem', fontWeight: '500', alignSelf: 'flex-start' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </Link>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #e01e37, #85101f)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className={styles.title}>Welcome to SmartAttend</h1>
          <p className={styles.subtitle}>Let's get your institution set up.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.selectedPlan}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#e01e37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selected Plan</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{plan} Plan</div>
          </div>
          <Link href="/pricing" style={{ color: '#6b7280', fontSize: '0.9rem', textDecoration: 'underline' }}>Change</Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}><span>1</span> Institution Details</h2>
            
            <div className={styles.inputGroup}>
              <label className={styles.label}>Institution Name *</label>
              <input 
                type="text" required className={styles.input} placeholder="e.g. Acme University"
                value={formData.institutionName} onChange={e => updateField('institutionName', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Website Domain (Optional)</label>
              <input 
                type="text" className={styles.input} placeholder="e.g. acme.edu"
                value={formData.domain} onChange={e => updateField('domain', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>General Contact Email *</label>
              <input 
                type="email" required className={styles.input} placeholder="hello@acme.edu"
                value={formData.contactEmail} onChange={e => updateField('contactEmail', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}><span>2</span> Your Administrator Account</h2>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>This will be the master account used to manage your institution's SmartAttend workspace.</p>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Your Full Name *</label>
              <input 
                type="text" required className={styles.input} placeholder="John Doe"
                value={formData.adminName} onChange={e => updateField('adminName', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Your Work Email *</label>
              <input 
                type="email" required className={styles.input} placeholder="john@acme.edu"
                value={formData.adminEmail} onChange={e => updateField('adminEmail', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password *</label>
              <input 
                type="password" required className={styles.input} placeholder="••••••••"
                value={formData.adminPassword} onChange={e => updateField('adminPassword', e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
      <OnboardForm />
    </Suspense>
  );
}
