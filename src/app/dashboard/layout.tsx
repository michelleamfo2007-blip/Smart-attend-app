'use client';

import { useUser } from '@/hooks/useUser';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './layout.module.css';

const NAV_LINKS = {
  STUDENT: [
    { href: '/dashboard/student', label: 'Overview', icon: HomeIcon },
    { href: '/dashboard/student#history', label: 'My Attendance', icon: CheckIcon },
  ],
  LECTURER: [
    { href: '/dashboard/lecturer', label: 'Overview', icon: HomeIcon },
    { href: '/dashboard/lecturer#sessions', label: 'Sessions', icon: CalendarIcon },
  ],
  ADMIN: [
    { href: '/dashboard/admin', label: 'Overview', icon: HomeIcon },
    { href: '/dashboard/admin#users', label: 'Users', icon: UsersIcon },
    { href: '/dashboard/admin#courses', label: 'Courses', icon: BookIcon },
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
  }, [user, loading, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading || !user) {
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

  const links = NAV_LINKS[user.role] || [];
  const roleColor = { STUDENT: '#3b82f6', LECTURER: '#8b5cf6', ADMIN: '#e01e37' }[user.role];
  const roleLabel = { STUDENT: 'Student', LECTURER: 'Lecturer', ADMIN: 'Admin' }[user.role];

  return (
    <div className={styles.shell}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

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
            const active = pathname === href;
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
            <div className={styles.topbarUser}>
              <div className={styles.topbarAvatar}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className={styles.topbarName}>{user.name}</span>
            </div>
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
function CheckIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#e01e37' : 'currentColor'} strokeWidth="2">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
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
