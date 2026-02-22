'use client';

interface ResultData {
  id: string;
  status: string;
  platform?: string;
  target: string;
  mode: string;
  created_at: string;
  completed_at?: string;
  error?: string;
  item_count?: number;
  download_path?: string;
  result?: {
    platform: string;
    username: string;
    items: Array<{
      id: string;
      type: string;
      filename: string;
      size_bytes: number;
      duration_seconds?: number;
      caption?: string;
      hashtags?: string[];
    }>;
    total_size_bytes: number;
    download_path: string;
  };
}

interface ResultViewProps {
  job: ResultData;
  onBack: () => void;
  onOpenFolder: (path: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ResultView({ job, onBack, onOpenFolder }: ResultViewProps) {
  const result = job.result;

  return (
    <div className="animate-fade-in space-y-6">
      <button onClick={onBack} className="sv-btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}>
        ← Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#e4e4e7' }}>
            {result?.username || 'Download'}
          </h2>
          <p className="mt-0.5 text-sm capitalize" style={{ color: '#71717a' }}>
            {job.platform} / {job.mode}
          </p>
        </div>
        {result?.download_path && (
          <button onClick={() => onOpenFolder(result.download_path)} className="sv-btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
            Open in Finder
          </button>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: String(result.items.length), label: 'Files' },
            { value: formatBytes(result.total_size_bytes), label: 'Total size' },
            { value: String(result.items.filter((i) => i.caption).length), label: 'With captions' },
          ].map((stat) => (
            <div key={stat.label} className="sv-stat-card">
              <p className="text-2xl font-bold" style={{ color: '#e4e4e7' }}>{stat.value}</p>
              <p className="mt-0.5 text-xs" style={{ color: '#71717a' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {result && result.items.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium" style={{ color: '#a1a1aa' }}>
            Files ({result.items.length})
          </h3>
          <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
            {result.items.map((item) => (
              <div key={item.id} className="sv-card flex items-center gap-3" style={{ padding: 12, borderRadius: 10 }}>
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                  style={{
                    backgroundColor: item.type === 'video' ? 'rgba(124, 58, 237, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                    color: item.type === 'video' ? '#a78bfa' : '#4ade80',
                  }}
                >
                  {item.type === 'video' ? '▶' : '■'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm" style={{ color: '#e4e4e7' }}>{item.filename}</p>
                  <div className="mt-0.5 flex items-center gap-3">
                    <span className="text-xs" style={{ color: '#71717a' }}>{formatBytes(item.size_bytes)}</span>
                    {item.duration_seconds && (
                      <span className="text-xs" style={{ color: '#71717a' }}>{formatDuration(item.duration_seconds)}</span>
                    )}
                    <span className="text-xs capitalize" style={{ color: '#555560' }}>{item.type}</span>
                  </div>
                </div>
                {item.hashtags && item.hashtags.length > 0 && (
                  <div className="hidden shrink-0 gap-1 sm:flex">
                    {item.hashtags.slice(0, 2).map((tag) => (
                      <span key={tag} className="sv-tag">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {job.status === 'failed' && job.error && (
        <div style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.06)' }}>
          <p className="text-sm font-medium" style={{ color: '#f87171' }}>Download failed</p>
          <p className="mt-1 text-xs" style={{ color: '#f87171', opacity: 0.7 }}>{job.error}</p>
        </div>
      )}
    </div>
  );
}

export type { ResultData };
