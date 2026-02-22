'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

type Platform = 'tiktok' | 'instagram';

interface DownloadFormProps {
  onSubmit: (target: string, platform: Platform | undefined, mode: 'profile' | 'single') => void;
  loading: boolean;
  error: string | null;
}

function detectPlatform(url: string): Platform | null {
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com') || lower.includes('vm.tiktok.com')) return 'tiktok';
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
  return null;
}

const PLATFORMS: { key: Platform; label: string; icon: string }[] = [
  { key: 'tiktok', label: 'TikTok', icon: '♪' },
  { key: 'instagram', label: 'Instagram', icon: '◎' },
];

export default function DownloadForm({ onSubmit, loading, error }: DownloadFormProps) {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<Platform | undefined>();
  const [mode, setMode] = useState<'profile' | 'single'>('single');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const detected = detectPlatform(url);
    if (detected) setPlatform(detected);
  }, [url]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (document.activeElement === inputRef.current) return;
      const text = e.clipboardData?.getData('text');
      if (text && (text.includes('tiktok.com') || text.includes('instagram.com'))) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (text) setUrl(text.trim());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), platform, mode);
  };

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="sv-card animate-fade-in"
      style={{
        padding: 24,
        borderColor: isDragging ? '#7c3aed' : undefined,
        boxShadow: isDragging ? '0 0 0 3px rgba(124, 58, 237, 0.15)' : undefined,
      }}
    >
      {/* URL Input */}
      <div style={{ marginBottom: 20 }}>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: '#a1a1aa' }}>
          URL or username
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tiktok.com/@user or paste an Instagram link"
            className="sv-input"
            disabled={loading}
          />
          {platform && (
            <span className="sv-tag absolute right-3 top-1/2 -translate-y-1/2">
              {platform === 'tiktok' ? 'TikTok' : 'Instagram'}
            </span>
          )}
        </div>
        {isDragging && <p className="mt-1 text-sm" style={{ color: '#a78bfa' }}>Drop URL here</p>}
      </div>

      {/* Platform */}
      <div style={{ marginBottom: 20 }}>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: '#a1a1aa' }}>
          Platform
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPlatform(p.key)}
              className={`sv-selector-btn ${platform === p.key ? 'active' : ''}`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode */}
      <div style={{ marginBottom: 20 }}>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: '#a1a1aa' }}>
          Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['single', 'profile'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`sv-selector-btn ${mode === m ? 'active' : ''}`}
            >
              {m === 'single' ? 'Single Post' : 'Full Profile'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            color: '#f87171',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={loading || !url.trim()} className="sv-btn-primary">
        {loading ? 'Creating job...' : 'Download'}
      </button>

      <p className="mt-4 text-center text-xs" style={{ color: '#555560' }}>
        Files save to ~/Downloads/socialvault/
      </p>
    </form>
  );
}
