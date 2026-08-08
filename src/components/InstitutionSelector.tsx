'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './InstitutionSelector.module.css';

interface Institution {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface InstitutionSelectorProps {
  onSelect: (institutionId: string) => void;
  selectedId?: string;
  error?: string;
}

export default function InstitutionSelector({ onSelect, selectedId, error }: InstitutionSelectorProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [recentId, setRecentId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load institutions
    const fetchInstitutions = async () => {
      try {
        const res = await fetch('/api/institutions'); // Public endpoint
        if (res.ok) {
          const data = await res.json();
          setInstitutions(data.institutions || data);
        }
      } catch (err) {
        console.error('Failed to load institutions', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInstitutions();

    // Check recent institution
    const saved = localStorage.getItem('recentInstitutionId');
    if (saved) {
      setRecentId(saved);
    }
  }, []);

  useEffect(() => {
    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (inst: Institution) => {
    onSelect(inst.id);
    localStorage.setItem('recentInstitutionId', inst.id);
    setRecentId(inst.id);
    setIsOpen(false);
    setSearch('');
  };

  const getInitials = (name: string) => {
    if (!name) return 'IN';
    return name.substring(0, 2).toUpperCase();
  };

  const filteredInstitutions = institutions.filter(inst => 
    inst.name?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedInst = institutions.find(i => i.id === selectedId);

  return (
    <div className={styles.container} ref={dropdownRef}>
      <label className="input-label">Institution</label>
      <div 
        className={`${styles.selector} ${error ? styles.error : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedInst ? (
          <div className={styles.selectedItem}>
            <div className={styles.avatar}>
              {selectedInst.logoUrl ? (
                <img src={selectedInst.logoUrl} alt={selectedInst.name} />
              ) : (
                <span>{getInitials(selectedInst.name)}</span>
              )}
            </div>
            <span>{selectedInst.name}</span>
          </div>
        ) : (
          <span className={styles.placeholder}>Select your institution...</span>
        )}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      
      {error && <span className={styles.errorText}>{error}</span>}

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder="Search institution..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className={styles.list}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : filteredInstitutions.length === 0 ? (
              <div className={styles.noResults}>No institutions found</div>
            ) : (
              <>
                {recentId && !search && (
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>Recently Used</div>
                    {institutions.filter(i => i.id === recentId).map(inst => (
                      <div key={`recent-${inst.id}`} className={styles.listItem} onClick={() => handleSelect(inst)}>
                        <div className={styles.avatar}>
                          {inst.logoUrl ? <img src={inst.logoUrl} alt={inst.name} /> : <span>{getInitials(inst.name)}</span>}
                        </div>
                        <span>{inst.name}</span>
                      </div>
                    ))}
                    <div className={styles.divider} />
                  </div>
                )}
                
                <div className={styles.sectionTitle}>All Institutions</div>
                {filteredInstitutions.map(inst => (
                  <div key={inst.id} className={styles.listItem} onClick={() => handleSelect(inst)}>
                    <div className={styles.avatar}>
                      {inst.logoUrl ? <img src={inst.logoUrl} alt={inst.name} /> : <span>{getInitials(inst.name)}</span>}
                    </div>
                    <span>{inst.name}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
