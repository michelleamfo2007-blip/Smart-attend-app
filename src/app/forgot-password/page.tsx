'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessage(data.message || 'If an account exists for that email, a reset link has been sent.');
    } catch (err: any) {
      setError(err.message || 'Request failed');
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
          Forgot password
        </h1>
        <p style={{ margin: '0 0 24px', color: '#64748b', lineHeight: 1.5 }}>
          Enter the work email for your admin or lecturer account. We&apos;ll send a reset link if it exists.
        </p>

        {error && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ background: '#ecfdf5', color: '#047857', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email" style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#374151' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu"
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
            disabled={loading}
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
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: '0.85rem', color: '#64748b' }}>
          Students use the mobile app with their index number. Ask your school admin if you need device or account help.
        </p>
      </div>
    </div>
  );
}
