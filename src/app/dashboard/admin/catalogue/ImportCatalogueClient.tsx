'use client';

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportCatalogueClient() {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setResult(null);
    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          
          if (!rows || rows.length === 0) {
            setError('The CSV file is empty.');
            setImporting(false);
            return;
          }

          const response = await fetch('/api/admin/catalogue/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows })
          });

          const data = await response.json();

          if (!response.ok) {
            setError(data.error || 'Import failed');
          } else {
            setResult({ success: data.successCount, failed: data.failedCount });
            router.refresh();
          }
        } catch (err: any) {
          setError(err.message || 'An error occurred during import');
        } finally {
          setImporting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (err) => {
        setError('Error parsing CSV file');
        setImporting(false);
      }
    });
  };

  const handleDownloadTemplate = () => {
    const template = 'College,Department,Programme,Course Code,Course Name,Credit Hours,Level,Semester,Is Compulsory\nCollege of Basic and Applied Sciences,Department of Computer Science,BSc Computer Science,CSCD 201,Information Systems,3,200,1,TRUE';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Catalogue_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={handleDownloadTemplate}
          className="btn btn-outline" 
          style={{ padding: '10px 16px', borderRadius: '10px', fontSize: '14px' }}
        >
          Download CSV Template
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-primary" 
          disabled={importing}
          style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Upload size={18} />
          {importing ? 'Importing...' : 'Bulk Import Curriculum'}
        </button>
      </div>

      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {error && <p style={{ color: '#e01e37', fontSize: '14px', margin: 0 }}>{error}</p>}
      {result && (
        <p style={{ color: '#16a34a', fontSize: '14px', margin: 0 }}>
          Import complete: {result.success} succeeded, {result.failed} failed/skipped.
        </p>
      )}
    </div>
  );
}
