'use client';

import { Suspense, useEffect, useState } from 'react';
import styles from '../admin.module.css';
import { CreditCard, Zap, CheckCircle2, AlertCircle, Key, Copy, Clock, MapPin, Shield } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type { SessionPeriod } from '@/lib/institutionTime';
import type { LecturerGeoPolicy } from '@/lib/lecturerLocation';
import {
  CONFIGURABLE_LECTURER_KEYS,
  CONFIGURABLE_LIBRARIAN_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_LABELS,
  type RolePermissions,
} from '@/lib/rolePermissions';

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
  const [timezone, setTimezone] = useState('Africa/Accra');
  const [sessionPeriods, setSessionPeriods] = useState<SessionPeriod[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [lecturerGeoPolicy, setLecturerGeoPolicy] = useState<LecturerGeoPolicy>('warn');
  const [campusLatitude, setCampusLatitude] = useState('');
  const [campusLongitude, setCampusLongitude] = useState('');
  const [campusRadiusMeters, setCampusRadiusMeters] = useState('200');
  const [lateGraceMinutes, setLateGraceMinutes] = useState('15');
  const [savingGeo, setSavingGeo] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permsMessage, setPermsMessage] = useState('');
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
        if (data.timezone) setTimezone(data.timezone);
        if (Array.isArray(data.sessionPeriods)) setSessionPeriods(data.sessionPeriods);
        if (data.lecturerGeoPolicy) setLecturerGeoPolicy(data.lecturerGeoPolicy);
        setCampusLatitude(
          data.campusLatitude != null && data.campusLatitude !== '' ? String(data.campusLatitude) : ''
        );
        setCampusLongitude(
          data.campusLongitude != null && data.campusLongitude !== '' ? String(data.campusLongitude) : ''
        );
        setCampusRadiusMeters(
          data.campusRadiusMeters != null ? String(data.campusRadiusMeters) : '200'
        );
        if (data.lateGraceMinutes != null) setLateGraceMinutes(String(data.lateGraceMinutes));
        if (data.rolePermissions) setRolePermissions(data.rolePermissions);
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

  const saveScheduleSettings = async () => {
    setSavingSchedule(true);
    setScheduleMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone, sessionPeriods }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save schedule settings');
      setTimezone(data.timezone);
      setSessionPeriods(data.sessionPeriods || []);
      setScheduleMessage('Timezone and class periods saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const updatePeriod = (index: number, field: keyof SessionPeriod, value: string | boolean) => {
    setSessionPeriods((prev) =>
      prev.map((period, i) => (i === index ? { ...period, [field]: value } : period))
    );
  };

  const saveGeoSettings = async () => {
    setSavingGeo(true);
    setGeoMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecturerGeoPolicy,
          campusLatitude: campusLatitude.trim() === '' ? null : Number(campusLatitude),
          campusLongitude: campusLongitude.trim() === '' ? null : Number(campusLongitude),
          campusRadiusMeters:
            campusRadiusMeters.trim() === '' ? null : Number(campusRadiusMeters),
          lateGraceMinutes: Number(lateGraceMinutes),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save location policy');
      setLecturerGeoPolicy(data.lecturerGeoPolicy || 'warn');
      setCampusLatitude(data.campusLatitude != null ? String(data.campusLatitude) : '');
      setCampusLongitude(data.campusLongitude != null ? String(data.campusLongitude) : '');
      setCampusRadiusMeters(
        data.campusRadiusMeters != null ? String(data.campusRadiusMeters) : '200'
      );
      if (data.lateGraceMinutes != null) setLateGraceMinutes(String(data.lateGraceMinutes));
      setGeoMessage('Location policy and late grace saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingGeo(false);
    }
  };

  const saveRolePermissions = async () => {
    setSavingPerms(true);
    setPermsMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolePermissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save role permissions');
      setRolePermissions(data.rolePermissions || DEFAULT_ROLE_PERMISSIONS);
      setPermsMessage('Role permissions saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPerms(false);
    }
  };

  const toggleLecturerPerm = (key: (typeof CONFIGURABLE_LECTURER_KEYS)[number], value: boolean) => {
    setRolePermissions((prev) => ({
      ...prev,
      lecturer: { ...prev.lecturer, [key]: value },
    }));
  };

  const toggleLibrarianPerm = (key: (typeof CONFIGURABLE_LIBRARIAN_KEYS)[number], value: boolean) => {
    setRolePermissions((prev) => ({
      ...prev,
      librarian: { ...prev.librarian, [key]: value },
    }));
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
          <p className={styles.pageSubtitle}>Manage invite codes, timetable, location policy, role permissions, subscription, and billing.</p>
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
      {scheduleMessage && (
        <div className={`${styles.notification} ${styles.notifSuccess}`}>{scheduleMessage}</div>
      )}
      {geoMessage && (
        <div className={`${styles.notification} ${styles.notifSuccess}`}>{geoMessage}</div>
      )}
      {permsMessage && (
        <div className={`${styles.notification} ${styles.notifSuccess}`}>{permsMessage}</div>
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

      {inviteCode !== 'SUPER-ADMIN-N/A' && (
        <section className={styles.section}>
          <div className={styles.formPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
                <Clock size={24} color="#2563eb" />
              </div>
              <div>
                <h3 className={styles.formTitle} style={{ marginBottom: 0 }}>Timezone &amp; class periods</h3>
                <p className={styles.pageSubtitle}>
                  Sessions open/close automatically in your school timezone. Period defaults are editable (not hard-coded forever).
                </p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="timezone">IANA timezone</label>
              <input
                id="timezone"
                className={styles.input}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Africa/Accra"
              />
              <p className={styles.pageSubtitle} style={{ marginTop: 6 }}>
                Auto-filled when the school registered. Examples: Africa/Accra, Africa/Lagos, Europe/London.
              </p>
            </div>

            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {sessionPeriods.map((period, index) => (
                <div
                  key={period.key || index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr auto',
                    gap: 10,
                    alignItems: 'end',
                    padding: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    background: '#f9fafb',
                  }}
                >
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label>Period name</label>
                    <input
                      className={styles.input}
                      value={period.name}
                      onChange={(e) => updatePeriod(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label>Start</label>
                    <input
                      type="time"
                      className={styles.input}
                      value={period.start_time}
                      onChange={(e) => updatePeriod(index, 'start_time', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label>End</label>
                    <input
                      type="time"
                      className={styles.input}
                      value={period.end_time}
                      onChange={(e) => updatePeriod(index, 'end_time', e.target.value)}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={period.enabled}
                      onChange={(e) => updatePeriod(index, 'enabled', e.target.checked)}
                    />
                    On
                  </label>
                </div>
              ))}
            </div>

            <div className={styles.modalActions} style={{ marginTop: 16, justifyContent: 'flex-start' }}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={saveScheduleSettings}
                disabled={savingSchedule || !timezone.trim()}
              >
                {savingSchedule ? 'Saving...' : 'Save timezone & periods'}
              </button>
            </div>
          </div>
        </section>
      )}

      {inviteCode !== 'SUPER-ADMIN-N/A' && (
        <section className={styles.section}>
          <div className={styles.formPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '10px' }}>
                <MapPin size={24} color="#059669" />
              </div>
              <div>
                <h3 className={styles.formTitle} style={{ marginBottom: 0 }}>Lecturer location policy</h3>
                <p className={styles.pageSubtitle}>
                  On-demand GPS only when a lecturer opens session controls — never background tracking.
                  Classroom coordinates are preferred; campus coords are a fallback.
                </p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lecturer-geo-policy">When lecturer is outside the room/campus</label>
              <select
                id="lecturer-geo-policy"
                className={styles.input}
                value={lecturerGeoPolicy}
                onChange={(e) => setLecturerGeoPolicy(e.target.value as LecturerGeoPolicy)}
              >
                <option value="off">Off — do not check lecturer location</option>
                <option value="warn">Warn — allow controls, show a warning</option>
                <option value="block">Block — hide QR / short code until verified nearby</option>
              </select>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                marginTop: 8,
              }}
            >
              <div className={styles.formGroup}>
                <label htmlFor="campus-lat">Campus latitude (optional)</label>
                <input
                  id="campus-lat"
                  className={styles.input}
                  value={campusLatitude}
                  onChange={(e) => setCampusLatitude(e.target.value)}
                  placeholder="e.g. 5.6037"
                  inputMode="decimal"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="campus-lng">Campus longitude (optional)</label>
                <input
                  id="campus-lng"
                  className={styles.input}
                  value={campusLongitude}
                  onChange={(e) => setCampusLongitude(e.target.value)}
                  placeholder="e.g. -0.1870"
                  inputMode="decimal"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="campus-radius">Campus radius (meters)</label>
                <input
                  id="campus-radius"
                  className={styles.input}
                  value={campusRadiusMeters}
                  onChange={(e) => setCampusRadiusMeters(e.target.value)}
                  placeholder="200"
                  inputMode="numeric"
                />
              </div>
            </div>
            <p className={styles.pageSubtitle} style={{ marginTop: 4 }}>
              Used only when a class has no classroom GPS. Prefer setting each room under Classrooms.
            </p>

            <div className={styles.formGroup} style={{ marginTop: 16 }}>
              <label htmlFor="late-grace">Late grace period (minutes)</label>
              <input
                id="late-grace"
                className={styles.input}
                value={lateGraceMinutes}
                onChange={(e) => setLateGraceMinutes(e.target.value)}
                inputMode="numeric"
                placeholder="15"
              />
              <p className={styles.pageSubtitle} style={{ marginTop: 6 }}>
                Check-ins within this many minutes after session start are Present; later check-ins are Late.
                Students with no check-in after the session closes count as Absent.
              </p>
            </div>

            <div className={styles.modalActions} style={{ marginTop: 16, justifyContent: 'flex-start' }}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={saveGeoSettings}
                disabled={savingGeo}
              >
                {savingGeo ? 'Saving...' : 'Save location & late policy'}
              </button>
            </div>
          </div>
        </section>
      )}

      {inviteCode !== 'SUPER-ADMIN-N/A' && (
        <section className={styles.section}>
          <div className={styles.formPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#f5f3ff', padding: '10px', borderRadius: '10px' }}>
                <Shield size={24} color="#6d28d9" />
              </div>
              <div>
                <h3 className={styles.formTitle} style={{ marginBottom: 0 }}>Role permissions</h3>
                <p className={styles.pageSubtitle}>
                  Lecturers never get Tenant Admin powers. Manage institution stays locked off for lecturer and librarian.
                </p>
              </div>
            </div>

            <h4 style={{ margin: '8px 0', color: '#111827' }}>Lecturer</h4>
            <p className={styles.pageSubtitle} style={{ marginBottom: 10 }}>
              Always on: view assigned classes, view attendance, verify location. Always off: manage students / lecturers / institution.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {CONFIGURABLE_LECTURER_KEYS.map((key) => {
                const meta = PERMISSION_LABELS[`lecturer.${key}`];
                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: 12,
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      background: '#fafafa',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(rolePermissions.lecturer[key])}
                      onChange={(e) => toggleLecturerPerm(key, e.target.checked)}
                      style={{ marginTop: 4 }}
                    />
                    <span>
                      <strong style={{ display: 'block', color: '#111827' }}>{meta?.title || key}</strong>
                      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{meta?.help}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <h4 style={{ margin: '20px 0 8px', color: '#111827' }}>Librarian</h4>
            <p className={styles.pageSubtitle} style={{ marginBottom: 10 }}>
              Always off: manage institution. Delete / edit stay off unless you explicitly enable them.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {CONFIGURABLE_LIBRARIAN_KEYS.map((key) => {
                const meta = PERMISSION_LABELS[`librarian.${key}`];
                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: 12,
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      background: '#fafafa',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(rolePermissions.librarian[key])}
                      onChange={(e) => toggleLibrarianPerm(key, e.target.checked)}
                      style={{ marginTop: 4 }}
                    />
                    <span>
                      <strong style={{ display: 'block', color: '#111827' }}>{meta?.title || key}</strong>
                      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{meta?.help}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className={styles.modalActions} style={{ marginTop: 16, justifyContent: 'flex-start' }}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={saveRolePermissions}
                disabled={savingPerms}
              >
                {savingPerms ? 'Saving...' : 'Save role permissions'}
              </button>
            </div>
          </div>
        </section>
      )}

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
