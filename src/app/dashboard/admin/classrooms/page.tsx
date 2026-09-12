'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from '../admin.module.css';

type Classroom = {
  id: string;
  name: string;
  building?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number;
  kiosks: {
    id: string;
    name: string;
    device_label?: string | null;
    access_token: string;
    enabled: boolean;
    last_seen_at?: string | null;
  }[];
  classes: { id: string; name: string; course_code: string | null; level: string | null }[];
};

type ModuleOption = { id: string; name: string; course_code: string | null; level: string | null };

export default function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [unassigned, setUnassigned] = useState<ModuleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [building, setBuilding] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('75');
  const [desktopName, setDesktopName] = useState<Record<string, string>>({});
  const [deviceLabel, setDeviceLabel] = useState<Record<string, string>>({});
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
      body: JSON.stringify({
        name: roomName,
        building: building || null,
        latitude: latitude || null,
        longitude: longitude || null,
        radius_meters: radius ? Number(radius) : 75,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ type: 'error', text: data.error || 'Could not create classroom' });
      return;
    }
    setRoomName('');
    setBuilding('');
    setLatitude('');
    setLongitude('');
    setRadius('75');
    setMsg({ type: 'success', text: 'Classroom added' });
    load();
  };

  const addDesktop = async (classroomId: string) => {
    const name = (desktopName[classroomId] || '').trim();
    if (!name) return;
    const res = await fetch(`/api/admin/classrooms/${classroomId}/kiosks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        device_label: (deviceLabel[classroomId] || '').trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ type: 'error', text: data.error || 'Could not add desktop' });
      return;
    }
    setDesktopName((prev) => ({ ...prev, [classroomId]: '' }));
    setDeviceLabel((prev) => ({ ...prev, [classroomId]: '' }));
    setMsg({ type: 'success', text: 'Classroom Mode device authorized' });
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
    if (!confirm('Remove this Classroom Mode device?')) return;
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
          <h1 className={styles.pageTitle}>Classroom Mode</h1>
          <p className={styles.pageSubtitle}>
            Register rooms and authorize classroom computers/displays. When a timetable session goes active,
            Classroom Mode shows the course and a secure rotating QR automatically — no student admin access.
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
        <h2 className={styles.formTitle}>Register classroom / attendance location</h2>
        <div className={styles.inlineForm} style={{ flexWrap: 'wrap' }}>
          <input
            className={styles.input}
            placeholder="Building, e.g. Main Block"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Room name/number, e.g. Lab 2"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
          <input
            className={styles.input}
            placeholder="Latitude (optional)"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Longitude (optional)"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Radius metres"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            style={{ maxWidth: 140 }}
          />
          <button className={styles.actionBtn} type="submit">Create classroom</button>
        </div>
        <p className={styles.pageSubtitle} style={{ marginTop: 10 }}>
          GPS + radius are used for student geofence when a session is auto-opened for this room.
        </p>
      </form>

      {classrooms.length === 0 ? (
        <div className={styles.tableEmpty}>
          No classrooms yet. Create a room, assign modules, then authorize each display/PC for Classroom Mode.
        </div>
      ) : classrooms.map((room) => (
        <section key={room.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {room.building ? `${room.building} · ${room.name}` : room.name}
            {room.latitude != null && room.longitude != null ? (
              <span style={{ marginLeft: 10, fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
                GPS set · {room.radius_meters || 50}m
              </span>
            ) : (
              <span style={{ marginLeft: 10, fontSize: '0.8rem', color: '#b45309', fontWeight: 500 }}>
                No GPS yet
              </span>
            )}
          </h2>

          <div className={styles.formPanel}>
            <h3 className={styles.formTitle}>Classroom Mode devices</h3>
            {room.kiosks.length === 0 ? (
              <p className={styles.pageSubtitle}>No devices authorized for this room yet.</p>
            ) : room.kiosks.map((kiosk) => (
              <div key={kiosk.id} className={styles.tableRow} style={{ gridTemplateColumns: '1.2fr 2fr auto auto', gap: 12, alignItems: 'center' }}>
                <div>
                  <strong>{kiosk.name}</strong>
                  {kiosk.device_label ? (
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>ID: {kiosk.device_label}</div>
                  ) : null}
                  {kiosk.last_seen_at ? (
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                      Last seen {new Date(kiosk.last_seen_at).toLocaleString()}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Not opened yet</div>
                  )}
                </div>
                <code style={{ fontSize: '0.78rem', color: '#6b7280', wordBreak: 'break-all' }}>
                  {kioskUrl(kiosk.access_token)}
                </code>
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                    onClick={() => navigator.clipboard.writeText(kioskUrl(kiosk.access_token))}
                  >
                    Copy link
                  </button>
                  <a
                    className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                    href={kioskUrl(kiosk.access_token)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                  >
                    Open Classroom Mode
                  </a>
                </span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className={`${styles.actionBtn} ${styles.actionBtnOutline}`} onClick={() => toggleDesktop(kiosk.id, !kiosk.enabled)}>
                    {kiosk.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button type="button" className={styles.actionBtnDel} onClick={() => removeDesktop(kiosk.id)}>Remove</button>
                </span>
              </div>
            ))}
            <div className={styles.inlineForm} style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <input
                className={styles.input}
                placeholder="Display name, e.g. Lab 2 Projector PC"
                value={desktopName[room.id] || ''}
                onChange={(e) => setDesktopName((prev) => ({ ...prev, [room.id]: e.target.value }))}
              />
              <input
                className={styles.input}
                placeholder="Device ID / asset tag (optional)"
                value={deviceLabel[room.id] || ''}
                onChange={(e) => setDeviceLabel((prev) => ({ ...prev, [room.id]: e.target.value }))}
              />
              <button type="button" className={styles.actionBtn} onClick={() => addDesktop(room.id)}>
                Authorize device
              </button>
            </div>
          </div>

          <div className={styles.formPanel}>
            <h3 className={styles.formTitle}>Modules assigned to this room</h3>
            {room.classes.length === 0 ? (
              <p className={styles.pageSubtitle}>Assign modules so timetable sessions bind to this room&apos;s displays.</p>
            ) : room.classes.map((cls) => (
              <div key={cls.id} className={styles.tableRow} style={{ gridTemplateColumns: '2fr auto' }}>
                <span>
                  {cls.course_code ? `${cls.course_code} · ${cls.name}` : cls.name}
                  {cls.level ? ` · ${cls.level}` : ''}
                </span>
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
