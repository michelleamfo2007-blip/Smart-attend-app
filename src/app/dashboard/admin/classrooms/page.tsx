'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { MapPin } from 'lucide-react';
import styles from './page.module.css';

export default function ClassroomsPage() {
  const { user } = useUser();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('50');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.institution_id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/classrooms');
      const data = await res.json();
      setClassrooms(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
      },
      (error) => {
        alert('Unable to retrieve your location. ' + error.message);
      }
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          latitude,
          longitude,
          radius_meters: radius
        })
      });

      if (res.ok) {
        setShowModal(false);
        setName('');
        setLatitude('');
        setLongitude('');
        setRadius('50');
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to create classroom');
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user?.institution_id) {
    return <div className={styles.container}><p>Please select an institution context first.</p></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Physical Classrooms</h1>
          <p className={styles.subtitle}>Define rooms and GPS coordinates for attendance verification.</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
          Add Classroom
        </button>
      </header>

      {loading ? (
        <p>Loading classrooms...</p>
      ) : (
        <div className={styles.grid}>
          {classrooms.map(room => (
            <div key={room.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{room.name}</h3>
                <span className={styles.badge}>{room.radius_meters}m radius</span>
              </div>
              <div className={styles.cardBody}>
                {room.latitude && room.longitude ? (
                  <p className={styles.meta} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> {room.latitude}, {room.longitude}
                  </p>
                ) : (
                  <p className={styles.noCoordinates}>No coordinates set</p>
                )}
              </div>
            </div>
          ))}
          {classrooms.length === 0 && (
            <p className={styles.empty}>No classrooms found. Add one to get started.</p>
          )}
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Add Physical Classroom</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label>Room Name (e.g. Computer Lab 1)</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  placeholder="Enter room name..."
                  required
                />
              </div>

              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label>Latitude</label>
                  <input 
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. 5.6037"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Longitude</label>
                  <input 
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. -0.1870"
                  />
                </div>
              </div>

              <div className={styles.locationBtnContainer}>
                <button type="button" className={styles.btnLocation} onClick={handleGetCurrentLocation}>
                  🎯 Use My Current Location
                </button>
              </div>

              <div className={styles.formGroup}>
                <label>Allowed Attendance Radius (Meters)</label>
                <p className={styles.helpText}>Students must be within this distance to mark attendance.</p>
                <input 
                  type="number" 
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className={styles.input}
                  min="10"
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting || !name.trim()}>
                  {isSubmitting ? 'Saving...' : 'Save Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
