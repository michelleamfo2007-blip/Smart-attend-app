'use client';

import { Suspense, useEffect, useState } from 'react';
import styles from '../admin.module.css';
import { CreditCard, Zap, CheckCircle2, AlertCircle, Key, Copy } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type SubscriptionInfo = {
  plan: string;
  planName: string;
  status: string;
  billingCycle: string;
  maxUsers: number | null;
  userCount: number;
  userLimitLabel: string;
  endsAt: string | null;
  features: string[];
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className={styles.loading}><div className={styles.spinner} /></div>}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [envStatus, setEnvStatus] = useState<{
    productionReady: boolean;
    databaseOk: boolean;
    emailReady: boolean;
    stripeReady: boolean;
    missingRequired: string[];
    flags: { key: string; set: boolean; required: boolean; notes?: string }[];
  } | null>(null);
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        setInviteCode(data.code || '');
        if (data.subscription) setSubscription(data.subscription);
      })
      .catch(() => setInviteCode(''));

    fetch('/api/admin/system/env')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.flags) setEnvStatus(data);
      })
      .catch(() => {});
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

  const endsAtLabel = subscription?.endsAt
    ? new Date(subscription.endsAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const isExpired = subscription?.status === 'expired' || subscription?.status === 'suspended';
  const planName = subscription?.planName || 'Starter';
  const userLimitLabel = subscription?.userLimitLabel || 'Up to 50 users';

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

      {isExpired && (
        <div className={`${styles.notification} ${styles.notifError}`}>
          <AlertCircle size={20} />
          <span>Your subscription has ended. Renew below to restore access for your school.</span>
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

      {envStatus && (
        <section className={styles.section}>
          <div className={styles.formPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: envStatus.productionReady && envStatus.databaseOk ? '#ecfdf5' : '#fef2f2', padding: '10px', borderRadius: '10px' }}>
                {envStatus.productionReady && envStatus.databaseOk ? (
                  <CheckCircle2 size={24} color="#059669" />
                ) : (
                  <AlertCircle size={24} color="#dc2626" />
                )}
              </div>
              <div>
                <h3 className={styles.formTitle} style={{ marginBottom: 0 }}>Production secrets</h3>
                <p className={styles.pageSubtitle}>
                  Presence check only (values are never shown).{' '}
                  {envStatus.productionReady && envStatus.databaseOk
                    ? 'Required secrets look set and the database responds.'
                    : 'Something required is missing — fix these in Vercel → Settings → Environment Variables.'}
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {envStatus.flags.map((flag) => (
                <div
                  key={flag.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.9rem',
                  }}
                >
                  <div>
                    <strong style={{ color: '#111827' }}>{flag.key}</strong>
                    {flag.notes ? <span style={{ color: '#6b7280' }}> — {flag.notes}</span> : null}
                    {flag.required ? (
                      <span style={{ marginLeft: 8, color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700 }}>REQUIRED</span>
                    ) : (
                      <span style={{ marginLeft: 8, color: '#6b7280', fontSize: '0.75rem', fontWeight: 600 }}>OPTIONAL</span>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, color: flag.set ? '#059669' : '#dc2626' }}>
                    {flag.set ? 'Set' : 'Missing'}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Database connection</strong>
                <span style={{ fontWeight: 700, color: envStatus.databaseOk ? '#059669' : '#dc2626' }}>
                  {envStatus.databaseOk ? 'Connected' : 'Failed'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: 4, fontSize: '0.85rem', color: '#4b5563' }}>
                <span>Email (Resend): <strong style={{ color: envStatus.emailReady ? '#059669' : '#b45309' }}>{envStatus.emailReady ? 'Ready' : 'Not set'}</strong></span>
                <span>Stripe: <strong style={{ color: envStatus.stripeReady ? '#059669' : '#b45309' }}>{envStatus.stripeReady ? 'Ready' : 'Not set'}</strong></span>
              </div>
            </div>
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '10px' }}>
              <CreditCard size={24} color="#4b5563" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>Current Plan</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                You are on the {planName} plan
                {subscription ? ` · ${subscription.status}` : ''}.
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '12px', lineHeight: 1.5 }}>
            {planName === 'Starter' && `${userLimitLabel} and basic reporting. Upgrade to Pro for up to 500 users and advanced analytics.`}
            {planName === 'Pro' && `${userLimitLabel}, advanced analytics, and priority support. Upgrade to Enterprise for unlimited users.`}
            {planName === 'Enterprise' && 'Unlimited users and dedicated support.'}
            {planName === 'Free' && `${userLimitLabel}. Upgrade to unlock more seats and reporting.`}
            {!['Starter', 'Pro', 'Enterprise', 'Free'].includes(planName) && `${userLimitLabel}.`}
          </p>
          {subscription && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '24px' }}>
              Seats used: {subscription.userCount}
              {subscription.maxUsers != null ? ` / ${subscription.maxUsers}` : ' (unlimited)'}
              {endsAtLabel ? ` · Renews/ends ${endsAtLabel}` : ''}
            </p>
          )}
          <button
            disabled={true}
            style={{ width: '100%', padding: '10px', background: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'not-allowed' }}
          >
            Billing portal (Paystack — coming soon)
          </button>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #111827, #1f2937)', border: '1px solid #374151', borderRadius: '16px', padding: '24px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '10px' }}>
              <Zap size={24} color="#fbbf24" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>
                {subscription?.plan === 'pro' ? 'Upgrade to Enterprise' : 'Upgrade to Pro'}
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                {subscription?.plan === 'pro' ? 'Custom pricing' : 'GH₵ 2,500 / month'}
              </p>
            </div>
          </div>
          <ul style={{ fontSize: '0.9rem', color: '#d1d5db', marginBottom: '24px', lineHeight: 1.6, paddingLeft: '20px' }}>
            {subscription?.plan === 'pro' ? (
              <>
                <li>Unlimited users &amp; admins</li>
                <li>Priority onboarding help</li>
                <li>Dedicated support channel</li>
                <li>Custom student volume pricing</li>
              </>
            ) : (
              <>
                <li>Up to 500 users</li>
                <li>Up to 5 admins</li>
                <li>Advanced analytics</li>
                <li>Priority email support</li>
              </>
            )}
          </ul>
          <button
            onClick={() => {
              if (subscription?.plan === 'pro' || subscription?.plan === 'enterprise') {
                window.location.href = 'mailto:support@smartattend.app?subject=Plan%20upgrade';
                return;
              }
              window.location.href = 'mailto:support@smartattend.app?subject=Upgrade%20to%20Pro';
            }}
            disabled={subscription?.plan === 'enterprise'}
            style={{ width: '100%', padding: '10px', background: '#e01e37', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', opacity: subscription?.plan === 'enterprise' ? 0.5 : 1 }}
          >
            {subscription?.plan === 'enterprise'
              ? 'On Enterprise'
              : isExpired
                ? 'Contact us to renew'
                : 'Contact us to upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}
