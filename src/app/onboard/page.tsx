'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './onboard.module.css';
import Link from 'next/link';
import { TRIAL_MONTHS } from '@/lib/plans';

type PlanDisplay = {
  name: string;
  priceMonthly: string;
  seats: string;
};

const PLAN_DISPLAY: Record<string, PlanDisplay> = {
  starter: {
    name: 'Starter',
    priceMonthly: 'GH₵ 400/mo',
    seats: 'Up to 50 users · 1 admin',
  },
  pro: {
    name: 'Pro',
    priceMonthly: 'GH₵ 2,500/mo',
    seats: 'Up to 500 users · 5 admins',
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: 'GH₵ 4,000/mo',
    seats: 'Unlimited users & admins',
  },
};

function OnboardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planKey = (searchParams.get('plan') || 'starter').toLowerCase();
  const planInfo = PLAN_DISPLAY[planKey] || {
    name: planKey.replace(/-/g, ' '),
    priceMonthly: 'See pricing',
    seats: 'Plan limits apply',
  };
  const plan = PLAN_DISPLAY[planKey] ? planKey : 'starter';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    institutionName: '',
    domain: '',
    contactEmail: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
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

      router.push('/dashboard/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className={styles.header}>
          <div className={styles.logoMark}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className={styles.title}>Welcome to SmartAttend</h1>
          <p className={styles.subtitle}>Let&apos;s get your institution set up.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.selectedPlan}>
          <div className={styles.selectedPlanMain}>
            <span className={styles.selectedPlanLabel}>Selected Plan</span>
            <div className={styles.selectedPlanName}>{planInfo.name} Plan</div>
            <div className={styles.selectedPlanMeta}>
              <span>{planInfo.priceMonthly}</span>
              <span className={styles.metaDot}>·</span>
              <span>{planInfo.seats}</span>
            </div>
          </div>
          <Link href="/pricing" className={styles.changeLink}>
            Change
          </Link>
        </div>

        <div className={styles.trialBanner}>
          <strong>{TRIAL_MONTHS}-month free trial on every plan</strong>
          <span>
            Starter, Pro, and Enterprise all include {TRIAL_MONTHS} months free. You won&apos;t be charged until the trial ends.
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>1</span> Institution Details
            </h2>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Institution Name *</label>
              <input
                type="text"
                required
                className={styles.input}
                placeholder="e.g. Acme University"
                value={formData.institutionName}
                onChange={(e) => updateField('institutionName', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Website Domain (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. acme.edu"
                value={formData.domain}
                onChange={(e) => updateField('domain', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>General Contact Email *</label>
              <input
                type="email"
                required
                className={styles.input}
                placeholder="hello@acme.edu"
                value={formData.contactEmail}
                onChange={(e) => updateField('contactEmail', e.target.value)}
              />
              <p className={styles.hint}>Must be an inbox your school can access.</p>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>2</span> Your Administrator Account
            </h2>
            <p className={styles.sectionHint}>
              This will be the master account used to manage your institution&apos;s SmartAttend workspace.
            </p>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Your Full Name *</label>
              <input
                type="text"
                required
                className={styles.input}
                placeholder="John Doe"
                value={formData.adminName}
                onChange={(e) => updateField('adminName', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Your Work Email *</label>
              <input
                type="email"
                required
                className={styles.input}
                placeholder="john@acme.edu"
                value={formData.adminEmail}
                onChange={(e) => updateField('adminEmail', e.target.value)}
              />
              <p className={styles.hint}>We&apos;ll send a welcome email here after you finish setup.</p>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password *</label>
              <input
                type="password"
                required
                minLength={6}
                className={styles.input}
                placeholder="••••••••"
                value={formData.adminPassword}
                onChange={(e) => updateField('adminPassword', e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating Account...' : `Start ${TRIAL_MONTHS}-Month Free Trial`}
          </button>
          <p className={styles.footerNote}>
            After the trial, billing follows your plan ({planInfo.priceMonthly} after trial). Cancel anytime before it ends.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <OnboardForm />
    </Suspense>
  );
}
