'use client';

import { useState, useEffect } from 'react';

interface Dependencies {
  'yt-dlp': string | null;
  'gallery-dl': string | null;
  ffmpeg: string | null;
}

const INSTALL_CMDS: Record<string, string> = {
  'yt-dlp': 'brew install yt-dlp',
  'gallery-dl': 'pip install gallery-dl',
  ffmpeg: 'brew install ffmpeg',
};

// yt-dlp and gallery-dl are required. ffmpeg is optional (thumbnails only).
const REQUIRED = ['yt-dlp', 'gallery-dl'];

export default function DependencyCheck() {
  const [deps, setDeps] = useState<Dependencies | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.dependencies) setDeps(data.data.dependencies);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || dismissed || !deps) return null;

  const missing = Object.entries(deps).filter(([name, v]) => !v && REQUIRED.includes(name));
  const optional = Object.entries(deps).filter(([name, v]) => !v && !REQUIRED.includes(name));

  // Don't show anything if only optional deps are missing
  if (missing.length === 0) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '0 24px' }}>
      <div
        className="mx-auto max-w-3xl"
        style={{
          marginTop: 12,
          padding: 20,
          borderRadius: 14,
          border: '1px solid rgba(245, 158, 11, 0.25)',
          backgroundColor: 'rgba(245, 158, 11, 0.06)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span style={{ color: '#fbbf24', fontSize: 16, fontWeight: 700 }}>!</span>
              <span className="text-sm font-semibold" style={{ color: '#fbbf24' }}>
                Missing: {missing.map(([n]) => n).join(', ')}
                {optional.length > 0 && (
                  <span style={{ color: '#a1a1aa', fontWeight: 400 }}>
                    {' '}(optional: {optional.map(([n]) => n).join(', ')})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {missing.map(([name]) => (
                <code key={name} className="text-sm" style={{ color: '#a78bfa', fontFamily: 'ui-monospace, monospace' }}>
                  {INSTALL_CMDS[name]}
                </code>
              ))}
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 text-sm"
            style={{ color: '#71717a', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
