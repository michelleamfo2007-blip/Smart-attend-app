'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './register.module.css';

const ROLES = [
  {
    id: 'STUDENT',
    label: 'Student',
    description: 'Mark attendance for enrolled courses',
    icon: '🎓',
  },
  {
    id: 'LECTURER',
    label: 'Lecturer',
    description: 'Start sessions and track attendance',
    icon: '📋',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength];
  const strengthColor = ['', '#e01e37', '#f59e0b', '#3b82f6', '#22c55e'][passwordStrength];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      // Success → go to login
      router.push('/login?registered=true');
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
            <h1>Join SmartAttend Today</h1>
            <p>Create your account and start managing attendance the smart way — GPS-verified, real-time, and effortless.</p>
          </div>

          {/* Steps indicator */}
          <div className={styles.stepsGuide}>
            <p className={styles.stepsTitle}>Getting started is easy</p>
            <div className={styles.stepsList}>
              <div className={`${styles.stepGuideItem} ${step >= 1 ? styles.stepGuideActive : ''}`}>
                <div className={styles.stepGuideNum}>1</div>
                <div>
                  <strong>Your details</strong>
                  <span>Name, email & role</span>
                </div>
              </div>
              <div className={styles.stepConnector} />
              <div className={`${styles.stepGuideItem} ${step >= 2 ? styles.stepGuideActive : ''}`}>
                <div className={styles.stepGuideNum}>2</div>
                <div>
                  <strong>Set password</strong>
                  <span>Secure your account</span>
                </div>
              </div>
              <div className={styles.stepConnector} />
              <div className={styles.stepGuideItem}>
                <div className={styles.stepGuideNum}>3</div>
                <div>
                  <strong>You&apos;re in!</strong>
                  <span>Start using SmartAttend</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.circle1} />
        <div className={styles.circle2} />
      </div>

      {/* Right Panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          {/* Progress bar */}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>

          <div className={styles.formHeader}>
            <p className={styles.stepLabel}>Step {step} of 2</p>
            <h2>{step === 1 ? 'Create your account' : 'Set your password'}</h2>
            <p className={styles.stepSubtitle}>
              {step === 1
                ? 'Tell us a bit about yourself to get started'
                : 'Choose a strong password to protect your account'}
            </p>
          </div>

          {/* ─── Step 1 ─── */}
          {step === 1 && (
            <form onSubmit={handleNext} className={styles.form} id="register-step1-form">
              {error && (
                <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }} role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 4.5zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="reg-name" className="input-label">Full name</label>
                <div className={styles.inputWrapper}>
                  <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    id="reg-name"
                    type="text"
                    className={`input-field ${styles.inputWithIcon}`}
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="reg-email" className="input-label">Email address</label>
                <div className={styles.inputWrapper}>
                  <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
                  </svg>
                  <input
                    id="reg-email"
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

              {/* Role selector */}
              <div className="input-group">
                <label className="input-label">I am a...</label>
                <div className={styles.roleGrid}>
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      id={`role-${r.id.toLowerCase()}`}
                      className={`${styles.roleCard} ${role === r.id ? styles.roleCardActive : ''}`}
                      onClick={() => setRole(r.id)}
                    >
                      <span className={styles.roleEmoji}>{r.icon}</span>
                      <strong className={styles.roleLabel}>{r.label}</strong>
                      <span className={styles.roleDesc}>{r.description}</span>
                      {role === r.id && (
                        <div className={styles.roleCheck}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" id="reg-next-btn" className={`btn btn-primary ${styles.submitBtn}`}>
                Continue
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </form>
          )}

          {/* ─── Step 2 ─── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className={styles.form} id="register-step2-form">
              {error && (
                <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }} role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 4.5zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Account summary */}
              <div className={styles.accountSummary}>
                <div className={styles.accountAvatar}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{name}</strong>
                  <span>{email} · {role.charAt(0) + role.slice(1).toLowerCase()}</span>
                </div>
                <button type="button" className={styles.editBtn} onClick={() => setStep(1)} id="edit-details-btn">
                  Edit
                </button>
              </div>

              <div className="input-group">
                <label htmlFor="reg-password" className="input-label">Password</label>
                <div className={styles.inputWrapper}>
                  <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`input-field ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password"
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

                {/* Strength meter */}
                {password && (
                  <div className={styles.strengthMeter}>
                    <div className={styles.strengthBars}>
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={styles.strengthBar}
                          style={{ background: i <= passwordStrength ? strengthColor : '#e5e7eb' }}
                        />
                      ))}
                    </div>
                    <span style={{ color: strengthColor, fontSize: '0.78rem', fontWeight: 600 }}>
                      {strengthLabel}
                    </span>
                  </div>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="reg-confirm-password" className="input-label">Confirm password</label>
                <div className={styles.inputWrapper}>
                  <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <input
                    id="reg-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className={`input-field ${styles.inputWithIcon} ${styles.inputWithToggle} ${
                      confirmPassword && confirmPassword !== password ? 'error' : ''
                    }`}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label="Toggle confirm password"
                    id="toggle-confirm-btn"
                  >
                    {showConfirm ? (
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
                {confirmPassword && confirmPassword !== password && (
                  <p className={styles.matchError}>Passwords do not match</p>
                )}
                {confirmPassword && confirmPassword === password && (
                  <p className={styles.matchSuccess}>✓ Passwords match</p>
                )}
              </div>

              <div className={styles.btnRow}>
                <button
                  type="button"
                  id="reg-back-btn"
                  className={`btn btn-outline ${styles.backBtn}`}
                  onClick={() => { setStep(1); setError(''); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Back
                </button>
                <button
                  type="submit"
                  id="reg-submit-btn"
                  className={`btn btn-primary ${styles.submitBtn} ${styles.submitBtnFlex}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner} />
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className={styles.loginPrompt}>
            Already have an account?{' '}
            <Link href="/login" id="go-to-login-link" className={styles.loginLink}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
