'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddCollegeButton({ variant = 'primary' }: { variant?: 'primary' | 'empty' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/catalogue/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to add college');
        return;
      }
      setOpen(false);
      setName('');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={variant === 'empty' ? 'btn btn-primary' : 'btn btn-outline'}
        onClick={() => setOpen(true)}
        style={{ padding: '10px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
      >
        Add College
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#0f172a' }}>Add College</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontWeight: 500, color: '#334155', fontSize: '0.9rem' }}>
                College / School name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. College of Engineering"
                  required
                  style={{ display: 'block', width: '100%', marginTop: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setOpen(false)} style={{ padding: '0.75rem 1rem', border: '1px solid #cbd5e1', background: 'transparent', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
