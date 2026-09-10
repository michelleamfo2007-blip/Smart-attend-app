'use client';

import { Suspense, useEffect, useState } from 'react';
import styles from '../admin.module.css';
import { CreditCard, Zap, CheckCircle2, AlertCircle, Key, Copy } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className={styles.loading}><div className={styles.spinner} /></div>}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState('');
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => setInviteCode(data.code || ''))
      .catch(() => setInviteCode(''));
  }, []);

  const saveInviteCode = async (code: string) => {
    setSavingCode(true);
    setCodeMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save invite code');
      setInviteCode(data.code);
      setCodeMessage('Invite code updated.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingCode(false);
    }
  };

  const generateInviteCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    setInviteCode(code);
    saveInviteCode(code);
  };

  const handleUpgrade = async (plan: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Institution Settings</h1>
          <p className={styles.pageSubtitle}>Manage invite codes, subscription, and billing.</p>
        </div>
      </div>

      {checkoutStatus === 'success' && (
        <div className={`${styles.notification} ${styles.notifSuccess}`}>
          <CheckCircle2 size={20} />
          <span>Payment successful! Your subscription has been upgraded.</span>
        </div>
      )}

      {checkoutStatus === 'cancelled' && (
        <div className={`${styles.notification} ${styles.notifError}`}>
          <AlertCircle size={20} />
          <span>Checkout was cancelled. Your plan has not changed.</span>
        </div>
      )}

      {error && (
        <div className={`${styles.notification} ${styles.notifError}`}>{error}</div>
      )}
      {codeMessage && (
        <div className={`${styles.notification} ${styles.notifSuccess}`}>{codeMessage}</div>
      )}

      <section className={styles.section}>
        <div className={styles.formPanel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '10px' }}>
              <Key size={24} color="#4b5563" />
            </div>
            <div>
              <h3 className={styles.formTitle} style={{ marginBottom: 0 }}>Student / lecturer invite code</h3>
              <p className={styles.pageSubtitle}>People use this code when they register for your school.</p>
            </div>
          </div>
          {inviteCode === 'SUPER-ADMIN-N/A' ? (
            <p className={styles.pageSubtitle}>Super admins do not have a school invite code.</p>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="invite-code">Invite code</label>
                <input
                  id="invite-code"
                  className={styles.input}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  minLength={5}
                />
              </div>
              <div className={styles.modalActions} style={{ marginTop: 0, justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                  onClick={() => navigator.clipboard.writeText(inviteCode)}
                  disabled={!inviteCode}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Copy size={16} /> Copy
                </button>
                <button type="button" className={`${styles.actionBtn} ${styles.actionBtnOutline}`} onClick={generateInviteCode} disabled={savingCode}>
                  Generate new
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => saveInviteCode(inviteCode)}
                  disabled={savingCode || inviteCode.length < 5}
                >
                  {savingCode ? 'Saving...' : 'Save code'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '10px' }}>
              <CreditCard size={24} color="#4b5563" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>Current Plan</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>You are on the Starter Plan.</p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '24px', lineHeight: 1.5 }}>
            The Starter Plan supports up to 50 users and basic reporting. Upgrade to Pro to unlock unlimited users and advanced analytics.
          </p>
          <button
            disabled={true}
            style={{ width: '100%', padding: '10px', background: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'not-allowed' }}
          >
            Manage Billing (Stripe Portal)
          </button>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #111827, #1f2937)', border: '1px solid #374151', borderRadius: '16px', padding: '24px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '10px' }}>
              <Zap size={24} color="#fbbf24" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>Upgrade to Pro</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>$99 / month</p>
            </div>
          </div>
          <ul style={{ fontSize: '0.9rem', color: '#d1d5db', marginBottom: '24px', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li>Unlimited Users & Admins</li>
            <li>Priority Email Support</li>
            <li>Custom Branding</li>
            <li>50GB Storage</li>
          </ul>
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: '#e01e37', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', transition: 'background 0.2s' }}
          >
            {loading ? 'Redirecting to Stripe...' : 'Upgrade Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
