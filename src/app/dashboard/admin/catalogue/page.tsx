import React from 'react';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import styles from './page.module.css';
import { BookOpen, School, Building2, GraduationCap } from 'lucide-react';
import ImportCatalogueClient from './ImportCatalogueClient';
import CatalogueList from './CatalogueList';

export default async function CataloguePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return <div>Unauthorized</div>;
  
  const payload = await verifyToken(token);
  if (!payload || payload.userRole !== 'ADMIN') return <div>Unauthorized</div>;

  const colleges = await prisma.colleges.findMany({
    where: { institution_id: payload.institutionId as string },
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
        <CatalogueList colleges={colleges} />
      )}
    </div>
  );
}
