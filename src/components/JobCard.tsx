'use client';

interface JobData {
  id: string;
  status: string;
  platform?: string;
  target: string;
  mode: string;
  progress?: {
    total: number;
    completed: number;
    current_item?: string;
    percent: number;
  };
  created_at: string;
  completed_at?: string;
  error?: string;
  item_count?: number;
  download_path?: string;
}

interface JobCardProps {
  job: JobData;
  onSelect: (job: JobData) => void;
  onOpenFolder: (path: string) => void;
}

function formatTarget(target: string): string {
  try {
    const url = new URL(target);
    return url.pathname.split('/').filter(Boolean).join('/');
  } catch {
    return target;
  }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function JobCard({ job, onSelect, onOpenFolder }: JobCardProps) {
  const badgeClass = `sv-badge sv-badge-${job.status}`;
  const isTk = job.platform === 'tiktok';

  return (
    <div
      onClick={() => onSelect(job)}
      style={{
        background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8,
        padding: 16, cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#333'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className={badgeClass}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: job.status === 'processing' ? '#fbbf24' :
                    job.status === 'completed' ? '#4ade80' :
                    job.status === 'failed' ? '#f87171' : '#666',
                }}
              />
              {job.status}
            </span>
            {job.platform && (
              <span className="text-xs font-medium capitalize" style={{ color: '#888' }}>
                {job.platform}
              </span>
            )}
            <span className="text-xs" style={{ color: '#555' }}>{job.mode}</span>
          </div>
          <p className="truncate font-mono text-sm" style={{ color: '#fff' }}>
            {formatTarget(job.target)}
          </p>
          <p className="mt-1 text-xs" style={{ color: '#555' }}>{timeAgo(job.created_at)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {job.status === 'completed' && job.item_count !== undefined && (
            <span className="sv-badge sv-badge-completed">{job.item_count} files</span>
          )}
          {job.status === 'completed' && job.download_path && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenFolder(job.download_path!); }}
              className="sv-btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Open
            </button>
          )}
        </div>
      </div>

      {job.status === 'processing' && job.progress && (
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-xs" style={{ color: '#888' }}>
            <span>{job.progress.current_item || 'Downloading...'}</span>
            <span className="font-mono">{job.progress.percent}%</span>
          </div>
          <div className="sv-progress-track">
            <div
              className="sv-progress-bar"
              style={{
                width: `${Math.max(job.progress.percent, 3)}%`,
                background: isTk
                  ? 'linear-gradient(90deg, #ff0050, #ff4081)'
                  : 'linear-gradient(90deg, #f09433, #dc2743)',
              }}
            />
          </div>
        </div>
      )}

      {job.status === 'failed' && job.error && (
        <p className="mt-2 truncate text-xs" style={{ color: '#f87171', opacity: 0.8 }}>{job.error}</p>
      )}
    </div>
  );
}

export type { JobData };
