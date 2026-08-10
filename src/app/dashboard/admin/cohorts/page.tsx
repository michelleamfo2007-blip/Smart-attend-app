'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { Users, BookOpen, Layers } from 'lucide-react';
import styles from './page.module.css';

export default function CohortsPage() {
  const { user } = useUser();
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.institution_id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [cohortsRes, classesRes] = await Promise.all([
        fetch('/api/admin/cohorts'),
        fetch('/api/admin/courses')
      ]);
      const cohortsData = await cohortsRes.json();
      const classesData = await classesRes.json();
      setCohorts(cohortsData.cohorts || cohortsData || []);
      setClasses(classesData.courses || classesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCohortName,
          classIds: selectedClasses
        })
      });

      if (res.ok) {
        setShowModal(false);
        setNewCohortName('');
        setSelectedClasses([]);
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to create cohort');
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  if (!user?.institution_id) {
    return <div className={styles.container}><p>Please select an institution context first.</p></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Programs & Student Groups</h1>
          <p className={styles.subtitle}>Group students into programs and automatically enroll them in modules.</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
          Create Program
        </button>
      </header>

      {loading ? (
        <p>Loading cohorts...</p>
      ) : (
        <div className={styles.grid}>
          {cohorts.map(cohort => (
            <div key={cohort.id} className={styles.card}>
              <div className={styles.cardIconWrapper}>
                <Layers size={24} />
              </div>
              <h3 className={styles.cardTitle}>{cohort.name}</h3>
              <div className={styles.cardStats}>
                <span>
                  <Users size={16} />
                  {cohort._count?.users || 0} Students
                </span>
                <span>
                  <BookOpen size={16} />
                  {cohort._count?.cohort_classes || 0} Modules
                </span>
              </div>
            </div>
          ))}
          {cohorts.length === 0 && (
            <p className={styles.empty}>No programs found. Create one to get started.</p>
          )}
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Create New Program</h2>
            <form onSubmit={handleCreateCohort}>
              <div className={styles.formGroup}>
                <label>Program Name (e.g. BSc Computer Science - Level 100)</label>
                <input 
                  type="text" 
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  className={styles.input}
                  placeholder="Enter name..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Assign Modules (Auto-Enrollment)</label>
                <p className={styles.helpText}>Students who join this program will automatically be enrolled in these modules.</p>
                <div className={styles.classList}>
                  {classes.map(c => (
                    <label key={c.id} className={styles.checkboxLabel}>
                      <input 
                        type="checkbox"
                        checked={selectedClasses.includes(c.id)}
                        onChange={() => toggleClassSelection(c.id)}
                      />
                      {c.name} ({c.level || 'No level'})
                    </label>
                  ))}
                  {classes.length === 0 && <p className={styles.helpText}>No modules available.</p>}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting || !newCohortName.trim()}>
                  {isSubmitting ? 'Creating...' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
