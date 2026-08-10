'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import styles from './BulkImport.module.css';

interface BulkImportProps {
  onImportComplete: () => void;
  institutionId: string;
}

interface ParsedUser {
  name: string;
  email: string;
  role: string;
  level?: string;
  semester?: string;
  index_number?: string;
  program_id?: string;
}

export default function BulkImport({ onImportComplete, institutionId }: BulkImportProps) {
  const [data, setData] = useState<ParsedUser[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data as any[];
        const validData: ParsedUser[] = [];
        const validationErrors: string[] = [];

        parsed.forEach((row, index) => {
          if (!row.email || !row.name || !row.role) {
            validationErrors.push(`Row ${index + 1}: Missing required fields (email, name, role)`);
            return;
          }
          if (!['student', 'lecturer'].includes(row.role.toLowerCase())) {
            validationErrors.push(`Row ${index + 1}: Role must be 'student' or 'lecturer'`);
            return;
          }
          validData.push({
            name: row.name,
            email: row.email,
            role: row.role.toUpperCase(),
            level: row.level || null,
            semester: row.semester || null,
            index_number: row.index_number || null,
            program_id: row.program_id || null
          });
        });

        setData(validData);
        setErrors(validationErrors);
      },
      error: (error) => {
        setErrors([`File parsing failed: ${error.message}`]);
      }
    });
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setLoading(true);
    setErrors([]);

    try {
      const res = await fetch('/api/admin/users/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: data, institutionId }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        setErrors([responseData.error || 'Failed to import users']);
      } else {
        alert(`Successfully imported ${responseData.count} users!`);
        setData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onImportComplete();
      }
    } catch (err) {
      setErrors(['An unexpected error occurred during import.']);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = "name,email,role,level,semester,index_number,program_id\nJohn Doe,john@example.edu,student,100,1,10293847,PROGRAM-UUID-HERE\nJane Smith,jane@example.edu,lecturer,,,,";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Bulk Import Users</h3>
        <button className="btn btn-outline" onClick={downloadTemplate}>
          Download Template
        </button>
      </div>

      <div className={styles.uploadZone}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload} 
          ref={fileInputRef}
          className={styles.fileInput}
        />
        <p>Drag and drop a CSV file here, or click to browse.</p>
      </div>

      {errors.length > 0 && (
        <div className={styles.errorBox}>
          <h4>Validation Errors:</h4>
          <ul>
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {data.length > 0 && errors.length === 0 && (
        <div className={styles.preview}>
          <h4>Preview ({data.length} records ready)</h4>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Index</th>
                  <th>Program ID</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.role}</td>
                    <td>{row.index_number || '-'}</td>
                    <td>{row.program_id ? '✓' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length > 5 && <p className={styles.moreText}>...and {data.length - 5} more</p>}
          
          <button 
            className="btn btn-primary" 
            onClick={handleImport} 
            disabled={loading}
            style={{ marginTop: '1rem', width: '100%' }}
          >
            {loading ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      )}
    </div>
  );
}
