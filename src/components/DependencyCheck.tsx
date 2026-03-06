'use client';

import { useState, useEffect } from 'react';

interface Dependencies {
  'yt-dlp': string | null;
  'gallery-dl': string | null;
  ffmpeg: string | null;
}

interface HealthData {
  dependencies: Dependencies;
  cookies: 'found' | 'missing';
  cookie_path: string;
}

const INSTALL_CMDS: Record<string, string> = {
  'yt-dlp': 'brew install yt-dlp',
  'gallery-dl': 'pip install gallery-dl',
  ffmpeg: 'brew install ffmpeg',
};

// yt-dlp and gallery-dl are required. ffmpeg is optional (thumbnails only).
const REQUIRED = ['yt-dlp', 'gallery-dl'];

export default function DependencyCheck() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setHealth({
            dependencies: data.data.dependencies,
            cookies: data.data.cookies || 'missing',
            cookie_path: data.data.cookie_path || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || dismissed || !health) return null;

  const deps = health.dependencies;
  const missing = Object.entries(deps).filter(([name, v]) => !v && REQUIRED.includes(name));
  const noCookies = health.cookies === 'missing';

  // Show if deps missing OR cookies missing (Instagram needs cookies)
  if (missing.length === 0 && !noCookies) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '0 24px' }}>
      <div
        className="mx-auto max-w-3xl"
        style={{
          marginTop: 12,
          padding: 20,
          borderRadius: 14,
          border: `1px solid rgba(${missing.length > 0 ? '245, 158, 11' : '99, 102, 241'}, 0.25)`,
          backgroundColor: `rgba(${missing.length > 0 ? '245, 158, 11' : '99, 102, 241'}, 0.06)`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {missing.length > 0 && (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <span style={{ color: '#fbbf24', fontSize: 16, fontWeight: 700 }}>!</span>
                  <span className="text-sm font-semibold" style={{ color: '#fbbf24' }}>
                    Missing: {missing.map(([n]) => n).join(', ')}
                  </span>
                </div>
                <div className="mb-3 flex flex-wrap gap-3">
                  {missing.map(([name]) => (
                    <code key={name} className="text-sm" style={{ color: '#a78bfa', fontFamily: 'ui-monospace, monospace' }}>
                      {INSTALL_CMDS[name]}
                    </code>
                  ))}
                </div>
              </>
            )}
            {noCookies && (
              <div className="flex items-center gap-2">
                <span style={{ color: '#818cf8', fontSize: 14 }}>i</span>
                <span className="text-sm" style={{ color: '#a5b4fc' }}>
                  Instagram requires cookies for downloads. Export cookies.txt from your browser and save to:{' '}
                  <code style={{ color: '#c4b5fd', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                    ~/Downloads/socialvault/.cookies.txt
                  </code>
                </span>
              </div>
            )}
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
