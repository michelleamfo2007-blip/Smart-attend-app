'use client';

import React, { useState } from 'react';
import { BookOpen, School, Building2, GraduationCap } from 'lucide-react';
import styles from './page.module.css';

export default function CatalogueList({ colleges }: { colleges: any[] }) {
  const [modalState, setModalState] = useState<{ type: string, parentId: string } | null>(null);
  const [formData, setFormData] = useState({ name: '', courseCode: '', credits: '3', level: '100', semester: '1' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (type: string, parentId: string) => {
    setModalState({ type, parentId });
    setFormData({ name: '', courseCode: '', credits: '3', level: '100', semester: '1' });
  };

  const handleCloseModal = () => {
    setModalState(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalState) return;
    setIsSubmitting(true);

    try {
      let endpoint = '';
      let body: any = {};

      if (modalState.type === 'dept') {
        endpoint = '/api/admin/catalogue/departments';
        body = { name: formData.name, collegeId: modalState.parentId };
      } else if (modalState.type === 'prog') {
        endpoint = '/api/admin/catalogue/programmes';
        body = { name: formData.name, departmentId: modalState.parentId };
      } else if (modalState.type === 'course') {
        endpoint = '/api/admin/catalogue/classes';
        body = { 
          name: formData.name, 
          courseCode: formData.courseCode, 
          credits: formData.credits, 
          level: formData.level, 
          semester: formData.semester, 
          programmeId: modalState.parentId 
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        handleCloseModal();
        window.location.reload();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.collegesList}>
        {colleges.map(college => (
          <div key={college.id} className={styles.collegeCard}>
            <div className={styles.collegeHeader}>
              <h2 className={styles.collegeTitle}>
                <School className={styles.icon} size={24} /> {college.name}
              </h2>
              <button onClick={() => handleOpenModal('dept', college.id)} className="btn btn-outline" style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '14px' }}>Add Dept</button>
            </div>

            <div className={styles.departmentsList}>
              {college.departments.length === 0 ? (
                <p className={styles.emptyText}>No departments yet.</p>
              ) : (
                college.departments.map((dept: any) => (
                  <div key={dept.id} className={styles.departmentCard}>
                    <div className={styles.deptHeader}>
                      <h3 className={styles.deptTitle}>
                        <Building2 className={styles.icon} size={20} /> {dept.name}
                      </h3>
                      <button onClick={() => handleOpenModal('prog', dept.id)} className="btn btn-outline" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>Add Prog</button>
                    </div>

                    <div className={styles.programmesList}>
                      {dept.programmes.length === 0 ? (
                        <p className={styles.emptyText}>No programmes yet.</p>
                      ) : (
                        dept.programmes.map((prog: any) => (
                          <div key={prog.id} className={styles.programmeCard}>
                            <div className={styles.progHeader}>
                              <h4 className={styles.progTitle}>
                                <GraduationCap className={styles.icon} size={18} /> {prog.name}
                              </h4>
                              <button onClick={() => handleOpenModal('course', prog.id)} className="btn btn-primary" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>Add Course</button>
                            </div>

                            <div className={styles.coursesGrid}>
                              {prog.classes.length === 0 ? (
                                <p className={styles.emptyText}>No courses mapped yet.</p>
                              ) : (
                                prog.classes.map((course: any) => (
                                  <div key={course.id} className={styles.courseItem}>
                                    <div className={styles.courseMain}>
                                      <BookOpen size={16} className={styles.courseIcon} />
                                      <div>
                                        <strong>{course.course_code}</strong>
                                        <p>{course.name}</p>
                                      </div>
                                    </div>
                                    <div className={styles.courseMeta}>
                                      <span className={styles.badge}>Lvl {course.level}</span>
                                      <span className={styles.badge}>Sem {course.semester}</span>
                                      <span className={styles.badge}>{course.credit_hours} Cr</span>
                                      <span className={course.is_compulsory ? styles.badgeCompulsory : styles.badgeElective}>
                                        {course.is_compulsory ? 'Compulsory' : 'Elective'}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {modalState && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#0f172a' }}>
              {modalState.type === 'dept' ? 'Add Department' : modalState.type === 'prog' ? 'Add Programme' : 'Add Course'}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: '500', color: '#334155', fontSize: '0.9rem' }}>
                  {modalState.type === 'course' ? 'Course Name' : 'Name'}
                </label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder={modalState.type === 'course' ? 'e.g. Introduction to Programming' : 'e.g. Computer Science'}
                  required 
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              {modalState.type === 'course' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontWeight: '500', color: '#334155', fontSize: '0.9rem' }}>Course Code</label>
                    <input 
                      type="text" 
                      value={formData.courseCode} 
                      onChange={e => setFormData({...formData, courseCode: e.target.value})} 
                      placeholder="e.g. CS101"
                      required 
                      style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontWeight: '500', color: '#334155', fontSize: '0.9rem' }}>Credits</label>
                      <input 
                        type="number" 
                        value={formData.credits} 
                        onChange={e => setFormData({...formData, credits: e.target.value})} 
                        required 
                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontWeight: '500', color: '#334155', fontSize: '0.9rem' }}>Level</label>
                      <input 
                        type="text" 
                        value={formData.level} 
                        onChange={e => setFormData({...formData, level: e.target.value})} 
                        required 
                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontWeight: '500', color: '#334155', fontSize: '0.9rem' }}>Semester</label>
                      <input 
                        type="text" 
                        value={formData.semester} 
                        onChange={e => setFormData({...formData, semester: e.target.value})} 
                        required 
                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '0.75rem 1rem', border: '1px solid #cbd5e1', backgroundColor: 'transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.75rem 1.5rem', border: 'none', backgroundColor: '#e01e37', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
