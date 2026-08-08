'use client';

import { useState } from 'react';
import styles from '../admin.module.css'; // Reusing admin styles
import { CreditCard, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');

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
      
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Institution Settings</h1>
          <p className={styles.subtitle}>Manage your subscription and billing details.</p>
        </div>
      </header>

      {checkoutStatus === 'success' && (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <CheckCircle2 size={20} />
          <span>Payment successful! Your subscription has been upgraded.</span>
        </div>
      )}

      {checkoutStatus === 'cancelled' && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <AlertCircle size={20} />
          <span>Checkout was cancelled. Your plan has not changed.</span>
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Current Plan Card */}
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

        {/* Upgrade Card */}
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
