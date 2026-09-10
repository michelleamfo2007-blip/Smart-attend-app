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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
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
            {planName === 'Enterprise' && 'Unlimited users, SSO, and custom branding.'}
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
            Manage Billing (Stripe Portal)
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
                {subscription?.plan === 'pro' ? 'Custom pricing' : '$99 / month'}
              </p>
            </div>
          </div>
          <ul style={{ fontSize: '0.9rem', color: '#d1d5db', marginBottom: '24px', lineHeight: 1.6, paddingLeft: '20px' }}>
            {subscription?.plan === 'pro' ? (
              <>
                <li>Unlimited users &amp; admins</li>
                <li>SSO Integration</li>
                <li>Custom branding</li>
                <li>Dedicated support</li>
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
              if (subscription?.plan === 'pro') {
                window.location.href = 'mailto:support@smartattend.app?subject=Enterprise%20upgrade';
                return;
              }
              handleUpgrade('pro');
            }}
            disabled={loading || subscription?.plan === 'enterprise'}
            style={{ width: '100%', padding: '10px', background: '#e01e37', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', transition: 'background 0.2s', opacity: subscription?.plan === 'enterprise' ? 0.5 : 1 }}
          >
            {subscription?.plan === 'enterprise'
              ? 'On Enterprise'
              : loading
                ? 'Redirecting to Stripe...'
                : subscription?.plan === 'pro'
                  ? 'Contact Sales'
                  : isExpired
                    ? 'Renew / Upgrade Now'
                    : 'Upgrade Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
