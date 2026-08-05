'use client';

import { useUser } from '@/hooks/useUser';
import styles from './student.module.css';

export default function StudentDashboard() {
  const { user } = useUser();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Good day, {user?.name?.split(' ')[0]} 👋</h1>
          <p className={styles.pageSubtitle}>Web Access Disabled</p>
        </div>
      </div>
      
      <div className={styles.emptyState} style={{ padding: '80px 20px', marginTop: '40px' }}>
        <div className={styles.emptyIcon} style={{ fontSize: '4rem', marginBottom: '16px' }}>📱</div>
        <h2 style={{ fontSize: '1.4rem', color: '#e01e37', marginBottom: '12px', fontWeight: 700 }}>Mobile App Required</h2>
        <p style={{ fontSize: '1rem', color: '#374151', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
          This web portal is restricted to Lecturers and Administrators. 
          <br /><br />
          Please download and use the <strong>Smart Attend Mobile App</strong> to scan QR codes, mark your attendance, and view your classes.
        </p>
      </div>
    </div>
  );
}
