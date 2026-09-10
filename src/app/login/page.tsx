'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Zap, BarChart3 } from 'lucide-react';
import InstitutionSelector from '@/components/InstitutionSelector';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [institutionId, setInstitutionId] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginAs, setLoginAs] = useState<'lecturer' | 'admin'>('lecturer');
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    const savedInst = localStorage.getItem('recentInstitutionId');
    if (savedInst) {
      setInstitutionId(savedInst);
    }
    if (new URLSearchParams(window.location.search).get('registered') === 'true') {
      setJustRegistered(true);
    }
    if (new URLSearchParams(window.location.search).get('app') === '1') {
      setError('Students use the SmartAttend mobile app. This website is for lecturers and admins.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          institutionId: loginAs === 'lecturer' ? institutionId : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      const role = data.user.role;
      if (role === 'STUDENT') {
        setError('Students sign in on the SmartAttend mobile app, not the website.');
        return;
      }
      if (role === 'ADMIN') router.push('/dashboard/admin');
      else if (role === 'STAFF') router.push('/dashboard/staff');
      else if (role === 'LECTURER') router.push('/dashboard/lecturer');
      else setError('This account cannot access the web dashboard.');

    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left Panel */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="white" fillOpacity="0.2"/>
                <path d="M8 16L13 21L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={styles.logoText}>SmartAttend</span>
          </div>

          <div className={styles.heroText}>
            <p className={styles.staffEyebrow}>Web dashboard</p>
            <h1>For lecturers<br />and admins.</h1>
            <p>Start sessions, watch the live roster, and run your school from the web. Students sign in on the mobile app.</p>
          </div>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}><MapPin size={20} /></div>
              <div>
                <strong>GPS Verified</strong>
                <span>Students must be physically present</span>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}><Zap size={20} /></div>
              <div>
                <strong>Real-time Tracking</strong>
                <span>Live attendance updates as they happen</span>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}><BarChart3 size={20} /></div>
              <div>
                <strong>Detailed Reports</strong>
                <span>Analytics and export for every session</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className={styles.circle1} />
        <div className={styles.circle2} />
      </div>

      {/* Right Panel – Login Form */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <Link href="/" className={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </Link>
          <div className={styles.formHeader}>
            <span className={styles.staffBadge}>Staff portal</span>
            <h2>Welcome back</h2>
            <p>{loginAs === 'admin' ? 'Sign in with your admin email' : 'Select your school, then sign in'}</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} id="login-form">
            {justRegistered && (
              <div className="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 10, padding: '12px 14px' }} role="status">
                Account created. Check your email for a welcome message from SmartAttend, then sign in.
              </div>
            )}
            {error && (
              <div className={`alert alert-error ${styles.errorAlert}`} role="alert">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 4.5zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                </svg>
                {error}
              </div>
            )}

            <div className={styles.roleSwitch} role="tablist" aria-label="Sign in as">
              <button
                type="button"
                role="tab"
                aria-selected={loginAs === 'lecturer'}
                className={`${styles.roleTab} ${loginAs === 'lecturer' ? styles.roleTabActive : ''}`}
                onClick={() => setLoginAs('lecturer')}
              >
                Lecturer / Staff
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginAs === 'admin'}
                className={`${styles.roleTab} ${loginAs === 'admin' ? styles.roleTabActive : ''}`}
                onClick={() => setLoginAs('admin')}
              >
                Admin
              </button>
            </div>

            {loginAs === 'lecturer' && (
              <InstitutionSelector
                onSelect={(id) => setInstitutionId(id)}
                selectedId={institutionId}
                label="Your school"
              />
            )}

            <div className={styles.fieldRow}>
            <div className="input-group">
              <label htmlFor="email" className="input-label">Email address</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  className={`input-field ${styles.inputWithIcon}`}
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">Password</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  id="toggle-password-btn"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            </div>

            <div className={styles.formMeta}>
              <label className={styles.rememberMe}>
                <input type="checkbox" id="remember-me" />
                <span>Remember me</span>
              </label>
              <a href="#" className={styles.forgotLink}>Forgot password?</a>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Signing in...
                </>
              ) : (
                'Sign in to SmartAttend'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
