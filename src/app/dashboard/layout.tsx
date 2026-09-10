'use client';

import { useUser } from '@/hooks/useUser';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './layout.module.css';

const NAV_LINKS = {
  STUDENT: [
    { href: '/dashboard/student', label: 'Overview', icon: HomeIcon },
  ],
  LECTURER: [
    { href: '/dashboard/lecturer', label: 'Overview', icon: HomeIcon },
    { href: '/dashboard/lecturer/classes', label: 'Modules', icon: BookIcon },
    { href: '/dashboard/lecturer/schedule', label: 'Schedule', icon: CalendarIcon },
    { href: '/dashboard/lecturer/sessions', label: 'Sessions', icon: CalendarIcon },
  ],
  STAFF: [
    { href: '/dashboard/staff', label: 'Scan Attendance', icon: ScanIcon },
  ],
  ADMIN: [
    { href: '/dashboard/admin', label: 'Overview', icon: HomeIcon },
    { href: '/dashboard/admin/institutions', label: 'Institutions', icon: BuildingIcon },
    { href: '/dashboard/admin/users', label: 'Users', icon: UsersIcon },
    { href: '/dashboard/admin/catalogue', label: 'Catalogue', icon: BookIcon },
    { href: '/dashboard/admin/classes', label: 'Modules', icon: BookIcon },
    { href: '/dashboard/admin/classrooms', label: 'Classrooms', icon: MonitorIcon },
    { href: '/dashboard/admin/cohorts', label: 'Programs', icon: UsersIcon },
    { href: '/dashboard/admin/audit', label: 'Audit Logs', icon: ShieldIcon },
    { href: '/dashboard/admin/settings', label: 'Settings', icon: GearIcon },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user?.role === 'STUDENT') {
      router.replace('/login?app=1');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading || !user || user.role === 'STUDENT') {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingLogo}>
          <LogoIcon />
          <span>SmartAttend</span>
        </div>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  let links = [...(NAV_LINKS[user.role as keyof typeof NAV_LINKS] || [])];
  if (user.role === 'ADMIN') {
    if (user.institution_id) {
      links = links.filter(l => l.label !== 'Institutions');
      links.splice(1, 0, { href: '/dashboard/staff', label: 'Staff Scanner', icon: ScanIcon });
    }
  }
  if (user.role === 'LECTURER' && user.can_mark_attendance) {
    links.push({ href: '/dashboard/staff', label: 'Staff Scanner', icon: ScanIcon });
  }

  const roleColor = { STUDENT: '#3b82f6', LECTURER: '#8b5cf6', ADMIN: '#e01e37', STAFF: '#0f766e' }[user.role] || '#e01e37';
  let roleLabel = { STUDENT: 'Student', LECTURER: 'Lecturer', ADMIN: 'Admin', STAFF: 'Attendance Officer' }[user.role] || 'Staff';
  
  if (user.role === 'ADMIN') {
    roleLabel = user.institution_id ? 'School Admin' : 'Super Admin';
  }

  return (
    <div className={styles.shell}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar spacer for fixed sidebar */}
      <div className={styles.sidebarSpacer} />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon}><LogoIcon /></div>
          <span className={styles.logoText}>SmartAttend</span>
        </div>

        {/* Role badge */}
        <div className={styles.roleBadge} style={{ background: `${roleColor}18`, borderColor: `${roleColor}30` }}>
          <span className={styles.roleDot} style={{ background: roleColor }} />
          <span style={{ color: roleColor, fontWeight: 600, fontSize: '0.78rem' }}>{roleLabel} Portal</span>
        </div>

        {/* Nav links */}
        <nav className={styles.nav}>
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard/admin' || href === '/dashboard/lecturer' || href === '/dashboard/student' || href === '/dashboard/staff'
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon active={active} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + logout */}
        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar} style={{ background: `linear-gradient(135deg, #e01e37, #85101f)` }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            disabled={loggingOut}
            id="logout-btn"
            title="Sign out"
          >
            {loggingOut ? <span className={styles.btnSpinner} /> : <LogoutIcon />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            id="sidebar-toggle-btn"
            aria-label="Toggle menu"
          >
            <MenuIcon />
          </button>
          <div className={styles.topbarRight}>
            {/* User info removed from topbar as requested */}
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}

/* ─── SVG Icons ─── */
function LogoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="10" fill="#e01e37"/>
      <path d="M8 16L13 21L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function BookIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function BuildingIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="2"/><line x1="15" y1="22" x2="15" y2="2"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="7" x2="9" y2="7"/><line x1="4" y1="17" x2="9" y2="17"/><line x1="15" y1="7" x2="20" y2="7"/><line x1="15" y1="17" x2="20" y2="17"/>
    </svg>
  );
}
function ShieldIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function ScanIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2">
      <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3"/>
      <rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
  );
}
function MonitorIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function GearIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}
