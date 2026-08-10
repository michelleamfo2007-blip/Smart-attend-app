'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { Users, BookOpen, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

import { use } from 'react';

export default function CohortDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const [cohort, setCohort] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add student form
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  const fetchCohort = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cohorts/${id}`);
      const data = await res.json();
      if (res.ok) {
        setCohort(data.cohort);
      } else {
        alert(data.error || 'Failed to fetch program details');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user?.institution_id) {
      fetchCohort();
    }
  }, [user, fetchCohort]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingStudent(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStudentName, student_id: newStudentId })
      });
      const data = await res.json();
      if (res.ok) {
        setNewStudentName('');
        setNewStudentId('');
        fetchCohort();
      } else {
        alert(data.error || 'Failed to add student');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setAddingStudent(false);
    }
  };

  if (!user?.institution_id) return <div>Loading context...</div>;
  if (loading) return <div>Loading program details...</div>;
  if (!cohort) return <div>Program not found.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard/admin/cohorts" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={20} /> Back to Programs
        </Link>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{cohort.name}</h1>
        <p style={{ color: '#6b7280' }}>Manage students and modules for this program.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Students List */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} /> Enrolled Students ({cohort.users?.length || 0})
            </h2>
          </div>
          
          <form onSubmit={handleAddStudent} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
            <input 
              type="text" 
              placeholder="Name" 
              value={newStudentName} 
              onChange={e => setNewStudentName(e.target.value)} 
              required
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <input 
              type="text" 
              placeholder="Index Number" 
              value={newStudentId} 
              onChange={e => setNewStudentId(e.target.value)} 
              required
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <button disabled={addingStudent} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={16} /> Add
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cohort.users?.map((u: any) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#111827' }}>{u.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Index: {u.student_id} {u.email ? `• ${u.email}` : ''}</div>
                </div>
              </div>
            ))}
            {cohort.users?.length === 0 && <p style={{ color: '#6b7280' }}>No students pre-loaded yet.</p>}
          </div>
        </div>

        {/* Modules List */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <BookOpen size={20} /> Assigned Modules ({cohort.cohort_classes?.length || 0})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cohort.cohort_classes?.map((cc: any) => (
              <div key={cc.class.id} style={{ padding: '0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ fontWeight: '600', color: '#111827' }}>{cc.class.course_code} - {cc.class.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Level {cc.class.level} • Semester {cc.class.semester}</div>
              </div>
            ))}
            {cohort.cohort_classes?.length === 0 && <p style={{ color: '#6b7280' }}>No modules assigned to this program.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
