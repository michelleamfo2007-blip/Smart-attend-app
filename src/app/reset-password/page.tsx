'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../login/login.module.css';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!token) {
      setError('Missing reset token. Open the link from your email again.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page} style={{ justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: 24 }}>
        <Link href="/login" style={{ color: '#64748b', fontSize: '0.9rem', textDecoration: 'none' }}>
          ← Back to login
        </Link>
        <h1 style={{ margin: '20px 0 8px', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
          Set a new password
        </h1>
        <p style={{ margin: '0 0 24px', color: '#64748b', lineHeight: 1.5 }}>
          Choose a new password for your SmartAttend account.
        </p>

        {error && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        {done && (
          <div style={{ background: '#ecfdf5', color: '#047857', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
            Password updated. Redirecting to login…
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="password" style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#374151' }}>
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1.5px solid #e5e7eb',
              marginBottom: 16,
              boxSizing: 'border-box',
            }}
          />
          <label htmlFor="confirm" style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#374151' }}>
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1.5px solid #e5e7eb',
              marginBottom: 16,
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={loading || done}
            style={{
              width: '100%',
              padding: 14,
              background: '#e01e37',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
