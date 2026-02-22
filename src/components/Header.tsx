'use client';

interface HeaderProps {
  view: 'download' | 'history';
  onViewChange: (view: 'download' | 'history') => void;
  jobCount: number;
}

export default function Header({ view, onViewChange, jobCount }: HeaderProps) {
  return (
    <header className="sv-header sticky top-0 z-50">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold text-white"
            style={{ backgroundColor: '#dc2743' }}
          >
            SV
          </div>
          <span className="text-base font-semibold" style={{ color: '#fff' }}>
            SocialVault
          </span>
        </div>

        <nav className="flex gap-1 rounded-md p-1" style={{ backgroundColor: '#1a1a1a', border: '1px solid #222' }}>
          <button
            onClick={() => onViewChange('download')}
            className={`sv-nav-btn ${view === 'download' ? 'active' : ''}`}
          >
            Download
          </button>
          <button
            onClick={() => onViewChange('history')}
            className={`sv-nav-btn ${view === 'history' ? 'active' : ''}`}
          >
            History
            {jobCount > 0 && (
              <span
                className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: '#dc2743' }}
              >
                {jobCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
