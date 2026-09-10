'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from '../admin.module.css';

type Classroom = {
  id: string;
  name: string;
  kiosks: { id: string; name: string; access_token: string; enabled: boolean }[];
  classes: { id: string; name: string; course_code: string | null; level: string | null }[];
};

type ModuleOption = { id: string; name: string; course_code: string | null; level: string | null };

export default function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [unassigned, setUnassigned] = useState<ModuleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [desktopName, setDesktopName] = useState<Record<string, string>>({});
  const [assignClass, setAssignClass] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/classrooms');
    const data = await res.json();
    setClassrooms(data.classrooms || []);
    setUnassigned(data.unassignedClasses || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const kioskUrl = (token: string) => `${window.location.origin}/kiosk/${token}`;

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: roomName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ type: 'error', text: data.error || 'Could not create classroom' });
      return;
    }
    setRoomName('');
    setMsg({ type: 'success', text: 'Classroom added' });
    load();
  };

  const addDesktop = async (classroomId: string) => {
    const name = (desktopName[classroomId] || '').trim();
    if (!name) return;
    const res = await fetch(`/api/admin/classrooms/${classroomId}/kiosks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ type: 'error', text: data.error || 'Could not add desktop' });
      return;
    }
    setDesktopName((prev) => ({ ...prev, [classroomId]: '' }));
    setMsg({ type: 'success', text: 'Classroom desktop authorized' });
    load();
  };

  const toggleDesktop = async (id: string, enabled: boolean) => {
    await fetch(`/api/admin/kiosks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    load();
  };

  const removeDesktop = async (id: string) => {
    if (!confirm('Remove this classroom desktop shortcut?')) return;
    await fetch(`/api/admin/kiosks/${id}`, { method: 'DELETE' });
    load();
  };

  const assignModule = async (classroomId: string) => {
    const classId = assignClass[classroomId];
    if (!classId) return;
    const res = await fetch(`/api/admin/courses/${classId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classroom_id: classroomId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMsg({ type: 'error', text: data.error || 'Could not assign module' });
      return;
    }
    setAssignClass((prev) => ({ ...prev, [classroomId]: '' }));
    load();
  };

  const unassignModule = async (classId: string) => {
    await fetch(`/api/admin/courses/${classId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classroom_id: null }),
    });
    load();
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Classroom Desktops</h1>
          <p className={styles.pageSubtitle}>
            Authorize computers inside a classroom to show a Smart Attend QR shortcut for the active session.
          </p>
        </div>
      </div>

      {msg && (
        <div className={`${styles.notification} ${msg.type === 'success' ? styles.notifSuccess : styles.notifError}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className={styles.notifClose}>✕</button>
        </div>
      )}

      <form className={styles.formPanel} onSubmit={createRoom}>
        <h2 className={styles.formTitle}>Add classroom</h2>
        <div className={styles.inlineForm}>
          <input
            className={styles.input}
            placeholder="e.g. Lab 2"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button className={styles.actionBtn} type="submit">Create classroom</button>
        </div>
      </form>

      {classrooms.length === 0 ? (
        <div className={styles.tableEmpty}>No classrooms yet. Create one, then authorize each desktop inside that room.</div>
      ) : classrooms.map((room) => (
        <section key={room.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>{room.name}</h2>
          <div className={styles.formPanel}>
            <h3 className={styles.formTitle}>Authorized desktops</h3>
            {room.kiosks.length === 0 ? (
              <p className={styles.pageSubtitle}>No desktops authorized for this room yet.</p>
            ) : room.kiosks.map((kiosk) => (
              <div key={kiosk.id} className={styles.tableRow} style={{ gridTemplateColumns: '1.4fr 2fr auto auto', gap: 12 }}>
                <strong>{kiosk.name}</strong>
                <code style={{ fontSize: '0.78rem', color: '#6b7280' }}>{kioskUrl(kiosk.access_token)}</code>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                  onClick={() => navigator.clipboard.writeText(kioskUrl(kiosk.access_token))}
                >
                  Copy link
                </button>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className={`${styles.actionBtn} ${styles.actionBtnOutline}`} onClick={() => toggleDesktop(kiosk.id, !kiosk.enabled)}>
                    {kiosk.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button type="button" className={styles.actionBtnDel} onClick={() => removeDesktop(kiosk.id)}>Remove</button>
                </span>
              </div>
            ))}
            <div className={styles.inlineForm} style={{ marginTop: 12 }}>
              <input
                className={styles.input}
                placeholder="Desktop name, e.g. Lab 2 PC 1"
                value={desktopName[room.id] || ''}
                onChange={(e) => setDesktopName((prev) => ({ ...prev, [room.id]: e.target.value }))}
              />
              <button type="button" className={styles.actionBtn} onClick={() => addDesktop(room.id)}>Authorize desktop</button>
            </div>
          </div>

          <div className={styles.formPanel}>
            <h3 className={styles.formTitle}>Modules in this room</h3>
            {room.classes.map((cls) => (
              <div key={cls.id} className={styles.tableRow} style={{ gridTemplateColumns: '2fr auto' }}>
                <span>{cls.course_code ? `${cls.course_code} · ${cls.name}` : cls.name}</span>
                <button type="button" className={`${styles.actionBtn} ${styles.actionBtnOutline}`} onClick={() => unassignModule(cls.id)}>Unassign</button>
              </div>
            ))}
            <div className={styles.inlineForm} style={{ marginTop: 12 }}>
              <select
                className={styles.filterSelect}
                value={assignClass[room.id] || ''}
                onChange={(e) => setAssignClass((prev) => ({ ...prev, [room.id]: e.target.value }))}
              >
                <option value="">Assign a module…</option>
                {unassigned.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.course_code ? `${cls.course_code} · ${cls.name}` : cls.name}</option>
                ))}
              </select>
              <button type="button" className={styles.actionBtn} onClick={() => assignModule(room.id)}>Assign module</button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
