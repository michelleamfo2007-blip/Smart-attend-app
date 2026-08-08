import React from 'react';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import styles from './page.module.css';
import { BookOpen, School, Building2, GraduationCap } from 'lucide-react';
import ImportCatalogueClient from './ImportCatalogueClient';

export default async function CataloguePage() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return <div>Unauthorized</div>;
  
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'ADMIN') return <div>Unauthorized</div>;

  const colleges = await prisma.colleges.findMany({
    where: { institution_id: payload.institution_id },
    include: {
      departments: {
        include: {
          programmes: {
            include: {
              classes: true
            }
          }
        }
      }
    }
  });

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>University Course Catalogue</h1>
          <p className={styles.subtitle}>Manage your institution&apos;s curriculum hierarchy and courses.</p>
        </div>
        <ImportCatalogueClient />
      </div>

      {colleges.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><School size={48} /></div>
          <h3>No Catalogue Data Found</h3>
          <p>Start by adding your first College or School to build your curriculum hierarchy.</p>
        </div>
      ) : (
        <div className={styles.collegesList}>
          {colleges.map(college => (
            <div key={college.id} className={styles.collegeCard}>
              <div className={styles.collegeHeader}>
                <h2 className={styles.collegeTitle}>
                  <School className={styles.icon} size={24} /> {college.name}
                </h2>
                <button className="btn btn-outline" style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '14px' }}>Add Dept</button>
              </div>

              <div className={styles.departmentsList}>
                {college.departments.length === 0 ? (
                  <p className={styles.emptyText}>No departments yet.</p>
                ) : (
                  college.departments.map(dept => (
                    <div key={dept.id} className={styles.departmentCard}>
                      <div className={styles.deptHeader}>
                        <h3 className={styles.deptTitle}>
                          <Building2 className={styles.icon} size={20} /> {dept.name}
                        </h3>
                        <button className="btn btn-outline" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>Add Prog</button>
                      </div>

                      <div className={styles.programmesList}>
                        {dept.programmes.length === 0 ? (
                          <p className={styles.emptyText}>No programmes yet.</p>
                        ) : (
                          dept.programmes.map(prog => (
                            <div key={prog.id} className={styles.programmeCard}>
                              <div className={styles.progHeader}>
                                <h4 className={styles.progTitle}>
                                  <GraduationCap className={styles.icon} size={18} /> {prog.name}
                                </h4>
                                <button className="btn btn-primary" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>Add Course</button>
                              </div>

                              <div className={styles.coursesGrid}>
                                {prog.classes.length === 0 ? (
                                  <p className={styles.emptyText}>No courses mapped yet.</p>
                                ) : (
                                  prog.classes.map(course => (
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
      )}
    </div>
  );
}
