import Link from 'next/link';
import { MapPin, Users, Zap, Shield, ArrowRight, BarChart3, Smartphone, BellRing, Lock } from 'lucide-react';
import styles from './landing.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path d="M8 16L13 21L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className={styles.logoText}>SmartAttend</span>
        </div>
        <nav className={styles.nav}>
          <Link href="/pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/login" className={styles.loginBtn}>Log In</Link>
          <Link href="/pricing" className={styles.ctaBtn}>Register School</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.blob}></div>
        <div className={styles.heroContent}>
          <span className={styles.badge}>New: Cohort Auto-Enrollment</span>
          <h1 className={styles.title}>
            Frictionless GPS Attendance for<br/><span className={styles.highlight}>Modern Campuses</span>
          </h1>
          <p className={styles.subtitle}>
            Eliminate buddy-punching and manual roll calls. Students scan dynamic QR codes using the <strong>SmartAttend Mobile App</strong>, while lecturers and admins manage everything from a powerful web dashboard.
          </p>
          <div className={styles.heroActions}>
            <Link href="/pricing" className={styles.primaryBtn}>
              Register Your Institution
            </Link>
            <Link href="/login" className={styles.secondaryBtn}>
              Login to Web Dashboard
            </Link>
          </div>
        </div>
        
        <div className={styles.heroVisual}>
          <div className={styles.mockup}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold' }}>Scan to Mark Present</div>
                <div style={{ color: '#10b981', fontWeight: 'bold' }}>Active</div>
              </div>
              <div style={{ width: '200px', height: '200px', background: 'white', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                {/* Mock QR Code Pattern */}
                <div style={{ width: '150px', height: '150px', background: 'repeating-linear-gradient(45deg, #0f172a, #0f172a 10px, transparent 10px, transparent 20px)' }}></div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
                <MapPin size={16} /> GPS Verification Required
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Everything you need to track attendance reliably.</h2>
          <p className={styles.sectionSubtitle}>
            SmartAttend combines physical location data with frictionless workflows to ensure students are exactly where they need to be.
          </p>
        </div>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><MapPin size={28} /></div>
            <h3 className={styles.featureTitle}>Geofenced Classrooms</h3>
            <p className={styles.featureDesc}>
              Define physical classroom boundaries using GPS coordinates. Students can only mark themselves present if they are physically inside the classroom radius.
            </p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><Users size={28} /></div>
            <h3 className={styles.featureTitle}>Cohort Auto-Enrollment</h3>
            <p className={styles.featureDesc}>
              Group students into cohorts (e.g. "Computer Science L100"). When a student joins, they are instantly enrolled in all their semester courses. Zero manual entry.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><Zap size={28} /></div>
            <h3 className={styles.featureTitle}>Dynamic QR Codes</h3>
            <p className={styles.featureDesc}>
              Lecturers generate a unique QR code for every session that expires automatically. It guarantees attendance is recorded in real-time.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><Shield size={28} /></div>
            <h3 className={styles.featureTitle}>Device Binding</h3>
            <p className={styles.featureDesc}>
              Prevent buddy-punching with device binding. A student's account is permanently tied to their physical smartphone to prevent credential sharing.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><BarChart3 size={28} /></div>
            <h3 className={styles.featureTitle}>Real-time Analytics</h3>
            <p className={styles.featureDesc}>
              Instantly track attendance trends across departments, courses, and students. Export data to Excel/CSV with a single click for administrative reporting.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><Smartphone size={28} /></div>
            <h3 className={styles.featureTitle}>Offline Resilience</h3>
            <p className={styles.featureDesc}>
              Poor campus Wi-Fi? No problem. The mobile app can capture cryptographic proof of attendance offline and sync securely once the connection is restored.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><BellRing size={28} /></div>
            <h3 className={styles.featureTitle}>Smart Alerts</h3>
            <p className={styles.featureDesc}>
              Automatically notify students when their attendance drops below the required threshold (e.g. 70%), keeping them accountable throughout the semester.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><Lock size={28} /></div>
            <h3 className={styles.featureTitle}>Role-based Security</h3>
            <p className={styles.featureDesc}>
              Enterprise-grade Row Level Security separates Tenant Admins, Lecturers, and Students, ensuring schools can only access their own encrypted data.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to modernize your campus?</h2>
        <p className={styles.ctaSubtitle}>
          Join the institutions that are already saving hundreds of hours on attendance tracking every semester.
        </p>
        <Link href="/pricing" className={styles.primaryBtn} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          Get Started For Free <ArrowRight size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} SmartAttend SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
}
