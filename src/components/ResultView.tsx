'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

interface ResultItem {
  id: string;
  type: string;
  filename: string;
  size_bytes: number;
  duration_seconds?: number;
  caption?: string;
  hashtags?: string[];
  created_at?: string;
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

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
    items: ResultItem[];
    total_size_bytes: number;
    download_path: string;
  };
}

interface ResultViewProps {
  job: ResultData;
  onBack: () => void;
  onOpenFolder: (path: string) => void;
}

type ViewMode = 'grid' | 'timeline' | 'captions' | 'research' | 'stats';

function fmt(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fmtDur(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function mediaUrl(downloadPath: string, filename: string): string {
  const base = downloadPath.split('/socialvault/')[1] || '';
  return `/api/v1/media?path=${encodeURIComponent(base + '/' + filename)}`;
}

export default function ResultView({ job, onBack, onOpenFolder }: ResultViewProps) {
  const result = job.result;
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'image'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'likes'>('newest');
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [researchQuery, setResearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!result) return [];
    let items = [...result.items];
    const q = (view === 'research' ? researchQuery : search).toLowerCase();
    if (q) {
      items = items.filter(
        (i) =>
          i.filename.toLowerCase().includes(q) ||
          i.caption?.toLowerCase().includes(q) ||
          i.hashtags?.some((h) => h.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'all') items = items.filter((i) => i.type === typeFilter);
    items.sort((a, b) => {
      if (sortBy === 'likes') return (b.metrics?.likes || 0) - (a.metrics?.likes || 0);
      if (sortBy === 'oldest') return (a.created_at || '').localeCompare(b.created_at || '');
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    return items;
  }, [result, search, researchQuery, typeFilter, sortBy, view]);

  // Group by month for timeline
  const timeline = useMemo(() => {
    const groups: Record<string, ResultItem[]> = {};
    for (const item of filtered) {
      const month = item.created_at ? item.created_at.slice(0, 7) : 'Unknown';
      if (!groups[month]) groups[month] = [];
      groups[month].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  // Hashtag cloud for research
  const hashtagCloud = useMemo(() => {
    if (!result) return [];
    const counts: Record<string, number> = {};
    for (const item of result.items) {
      for (const tag of item.hashtags || []) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 60);
  }, [result]);

  // Keyboard nav
  useEffect(() => {
    if (modalIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalIndex(null);
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setModalIndex((i) => i !== null ? Math.min(i + 1, filtered.length - 1) : null); }
      if (e.key === 'ArrowLeft') setModalIndex((i) => i !== null ? Math.max(i - 1, 0) : null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [modalIndex, filtered.length]);

  if (!result) {
    return (
      <div className="animate-fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <button onClick={onBack} style={backBtnStyle}>&larr; Back</button>
        {job.status === 'failed' && job.error && (
          <div style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.06)', marginTop: 16 }}>
            <p style={{ color: '#f87171', fontSize: 14, fontWeight: 500 }}>Download failed</p>
            <p style={{ color: '#f87171', opacity: 0.7, fontSize: 12, marginTop: 4 }}>{job.error}</p>
          </div>
        )}
      </div>
    );
  }

  const dp = result.download_path;
  const videos = result.items.filter((i) => i.type === 'video');
  const images = result.items.filter((i) => i.type === 'image');
  const totalLikes = result.items.reduce((s, i) => s + (i.metrics?.likes || 0), 0);
  const totalViews = result.items.reduce((s, i) => s + (i.metrics?.views || 0), 0);
  const modalItem = modalIndex !== null ? filtered[modalIndex] : null;
  const platform = result.platform;

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div style={{
        padding: '24px 0 20px',
        marginBottom: 20,
        borderBottom: '1px solid #1e1e23',
        background: 'linear-gradient(135deg, #0a0a0c 0%, #1a1a2e 50%, #0a0a0c 100%)',
        borderRadius: '16px 16px 0 0',
        paddingLeft: 24,
        paddingRight: 24,
      }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <button onClick={onBack} style={backBtnStyle}>&larr;</button>
          <div className="flex-1">
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              <span style={{
                background: platform === 'tiktok'
                  ? 'linear-gradient(90deg, #ff0050, #ff6090)'
                  : 'linear-gradient(90deg, #f09433, #dc2743, #bc1888)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                @{result.username}
              </span>
            </h1>
            <span style={{ fontSize: 12, color: '#555' }}>
              {result.items.length} posts &middot; {fmt(result.total_size_bytes)} &middot; {platform}
            </span>
          </div>
          <button onClick={() => onOpenFolder(dp)} className="sv-btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}>
            Open Folder
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { v: String(result.items.length), l: 'Total', c: '#fff' },
            { v: String(videos.length), l: 'Videos', c: '#a78bfa' },
            { v: String(images.length), l: 'Photos', c: '#4ade80' },
            { v: fmt(result.total_size_bytes), l: 'Size', c: '#fff' },
            { v: totalLikes > 0 ? fmtNum(totalLikes) : '--', l: 'Likes', c: '#f87171' },
            { v: totalViews > 0 ? fmtNum(totalViews) : '--', l: 'Views', c: '#60a5fa' },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── View tabs (pills) ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          ['grid', 'Grid'],
          ['timeline', 'Timeline'],
          ['captions', 'Captions'],
          ['research', 'Research'],
          ['stats', 'Stats'],
        ] as [ViewMode, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              backgroundColor: view === key ? '#7c3aed' : '#151518',
              color: view === key ? '#fff' : '#888',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Controls (grid/timeline) ── */}
      {(view === 'grid' || view === 'timeline') && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search captions, hashtags..."
            style={searchStyle}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'video', 'image'] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)} style={pillStyle(typeFilter === t)}>
                {t === 'all' ? 'All' : t === 'video' ? 'Videos' : 'Photos'}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} style={selectStyle}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="likes">Most liked</option>
          </select>
          <span style={{ fontSize: 12, color: '#555' }}>{filtered.length} items</span>
        </div>
      )}

      {/* ── Grid View ── */}
      {view === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 6 }}>
          {filtered.map((item, idx) => (
            <GalleryCard key={item.id} item={item} downloadPath={dp} platform={platform} onClick={() => setModalIndex(idx)} />
          ))}
        </div>
      )}

      {/* ── Timeline View ── */}
      {view === 'timeline' && (
        <div>
          {timeline.map(([month, items]) => (
            <div key={month} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 8, padding: '4px 0', borderBottom: '1px solid #1e1e23' }}>
                {month === 'Unknown' ? 'Unknown date' : formatMonthLabel(month)}
                <span style={{ fontWeight: 400, color: '#555', marginLeft: 8 }}>
                  ({items.length} {items.length === 1 ? 'post' : 'posts'}
                  {' '}&middot; {items.filter(i => i.type === 'video').length} vid, {items.filter(i => i.type === 'image').length} img)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 4 }}>
                {items.map((item) => {
                  const globalIdx = filtered.indexOf(item);
                  return (
                    <TimelineThumb key={item.id} item={item} downloadPath={dp} platform={platform} onClick={() => setModalIndex(globalIdx)} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Captions View ── */}
      {view === 'captions' && (
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search captions..."
            style={{ ...searchStyle, marginBottom: 16 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.filter(i => i.caption).map((item) => {
              const globalIdx = filtered.indexOf(item);
              return (
                <div
                  key={item.id}
                  onClick={() => setModalIndex(globalIdx)}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: '#131313',
                    border: '1px solid #1e1e23',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a3a42'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e1e23'; }}
                >
                  {/* Mini thumb */}
                  <div style={{ width: 64, height: 64, borderRadius: 6, overflow: 'hidden', flexShrink: 0, backgroundColor: '#0a0a0c' }}>
                    {item.type === 'video' ? (
                      <video src={mediaUrl(dp, item.filename)} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={mediaUrl(dp, item.filename)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <span style={badgeStyle(platform)}>{platform === 'tiktok' ? 'TT' : 'IG'}</span>
                      {item.created_at && <span style={{ fontSize: 11, color: '#555' }}>{item.created_at}</span>}
                      {(item.metrics?.likes ?? 0) > 0 && <span style={{ fontSize: 11, color: '#f87171' }}>&#9829; {fmtNum(item.metrics!.likes!)}</span>}
                    </div>
                    <p style={{ fontSize: 13, color: '#bbb', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {highlightSearch(item.caption || '', search)}
                    </p>
                    {item.hashtags && item.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1" style={{ marginTop: 4 }}>
                        {item.hashtags.slice(0, 5).map(tag => (
                          <span key={tag} style={{ fontSize: 10, color: '#7c3aed', padding: '1px 5px', borderRadius: 4, backgroundColor: 'rgba(124,58,237,0.1)' }}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.filter(i => i.caption).length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: '#444' }}>No captions found</div>
            )}
          </div>
        </div>
      )}

      {/* ── Research View ── */}
      {view === 'research' && (
        <div>
          <input
            type="text"
            value={researchQuery}
            onChange={(e) => setResearchQuery(e.target.value)}
            placeholder="Deep search captions, hashtags, mentions..."
            style={{ ...searchStyle, marginBottom: 16, fontSize: 15, padding: '12px 16px' }}
          />

          {/* Hashtag cloud */}
          {!researchQuery && hashtagCloud.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Top Hashtags</div>
              <div className="flex flex-wrap gap-1.5">
                {hashtagCloud.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => setResearchQuery(tag)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid rgba(124,58,237,0.2)',
                      backgroundColor: 'rgba(124,58,237,0.08)',
                      color: '#a78bfa',
                      fontSize: Math.min(11 + Math.floor(count / 3), 16),
                      cursor: 'pointer',
                    }}
                  >
                    #{tag} <span style={{ color: '#555', fontSize: 10 }}>{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Research results */}
          {researchQuery && (
            <div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{researchQuery}&rdquo;
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map((item) => {
                  const globalIdx = filtered.indexOf(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setModalIndex(globalIdx)}
                      style={{
                        display: 'flex', gap: 12, padding: 12, borderRadius: 10,
                        backgroundColor: '#131313', border: '1px solid #1e1e23', cursor: 'pointer',
                      }}
                    >
                      <div style={{ width: 80, height: 80, borderRadius: 6, overflow: 'hidden', flexShrink: 0, backgroundColor: '#0a0a0c' }}>
                        {item.type === 'video' ? (
                          <video src={mediaUrl(dp, item.filename)} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={mediaUrl(dp, item.filename)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                          <span style={badgeStyle(platform)}>{platform === 'tiktok' ? 'TT' : 'IG'}</span>
                          {item.created_at && <span style={{ fontSize: 11, color: '#555' }}>{item.created_at}</span>}
                          {(item.metrics?.likes ?? 0) > 0 && <span style={{ fontSize: 11, color: '#f87171' }}>&#9829; {fmtNum(item.metrics!.likes!)}</span>}
                          {(item.metrics?.views ?? 0) > 0 && <span style={{ fontSize: 11, color: '#60a5fa' }}>{fmtNum(item.metrics!.views!)} views</span>}
                        </div>
                        <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.4 }}>
                          {highlightSearch(item.caption || item.filename, researchQuery)}
                        </p>
                        {item.hashtags && item.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1" style={{ marginTop: 4 }}>
                            {item.hashtags.map(tag => (
                              <span key={tag} style={{ fontSize: 10, color: '#7c3aed', padding: '1px 5px', borderRadius: 4, backgroundColor: 'rgba(124,58,237,0.1)' }}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!researchQuery && (
            <div style={{ padding: 40, textAlign: 'center', color: '#444' }}>Type a query to search through all captions and hashtags</div>
          )}
        </div>
      )}

      {/* ── Stats View ── */}
      {view === 'stats' && <StatsView items={result.items} platform={platform} totalSize={result.total_size_bytes} />}

      {/* Empty state */}
      {(view === 'grid' || view === 'timeline') && filtered.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: '#444' }}>
          {search ? 'No items match your search' : 'No media files found'}
        </div>
      )}

      {/* ── Lightbox ── */}
      {modalItem && modalIndex !== null && (
        <LightboxModal
          item={modalItem} downloadPath={dp} platform={platform}
          index={modalIndex} total={filtered.length}
          onClose={() => setModalIndex(null)}
          onPrev={() => setModalIndex(Math.max(0, modalIndex - 1))}
          onNext={() => setModalIndex(Math.min(filtered.length - 1, modalIndex + 1))}
        />
      )}
    </div>
  );
}

/* ─── Styles ─── */

const backBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  backgroundColor: '#1a1a1f', color: '#888', border: '1px solid #2a2a30', cursor: 'pointer',
};

const searchStyle: React.CSSProperties = {
  flex: '1 1 200px', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #2a2a30', backgroundColor: '#111114', color: '#fff', fontSize: 13, outline: 'none',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid #2a2a30',
  backgroundColor: '#111114', color: '#aaa', fontSize: 12,
};

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500,
    cursor: 'pointer', backgroundColor: active ? '#7c3aed' : '#1a1a1f', color: active ? '#fff' : '#888',
  };
}

function badgeStyle(platform: string): React.CSSProperties {
  return {
    padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: '#fff',
    background: platform === 'tiktok' ? '#ff0050' : 'linear-gradient(45deg, #f09433, #dc2743)',
  };
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function highlightSearch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ backgroundColor: 'rgba(96, 165, 250, 0.25)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ─── Gallery Card ─── */

function GalleryCard({ item, downloadPath, platform, onClick }: { item: ResultItem; downloadPath: string; platform: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const isVideo = item.type === 'video';
  const src = mediaUrl(downloadPath, item.filename);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', borderRadius: 8, overflow: 'hidden', backgroundColor: '#131313',
        cursor: 'pointer', aspectRatio: isVideo ? '9/16' : '1/1', transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(124, 58, 237, 0.25)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {isVideo ? (
        <video src={src} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }} onLoadedData={() => setLoaded(true)} />
      ) : (
        <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }} onLoad={() => setLoaded(true)} />
      )}
      {!loaded && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 20 }}>{isVideo ? '▶' : '◻'}</div>}

      <span style={{ ...badgeStyle(platform), position: 'absolute', top: 6, left: 6, zIndex: 2 }}>{platform === 'tiktok' ? 'TT' : 'IG'}</span>

      {isVideo && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', zIndex: 2 }}>▶</div>
      )}

      {(item.metrics?.likes ?? 0) > 0 && (
        <span style={{ position: 'absolute', top: 6, right: isVideo ? 32 : 6, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2 }}>
          &#9829; {fmtNum(item.metrics!.likes!)}
        </span>
      )}

      <div className="gallery-card-overlay" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 8px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', zIndex: 1 }}>
        {item.caption && <p style={{ fontSize: 11, color: '#ddd', lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.caption}</p>}
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#888' }}>
          {item.created_at && <span>{item.created_at}</span>}
          <span>{fmt(item.size_bytes)}</span>
          {item.duration_seconds && <span>{fmtDur(item.duration_seconds)}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Timeline Thumb ─── */

function TimelineThumb({ item, downloadPath, platform, onClick }: { item: ResultItem; downloadPath: string; platform: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const isVideo = item.type === 'video';
  const src = mediaUrl(downloadPath, item.filename);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', borderRadius: 6, overflow: 'hidden', backgroundColor: '#131313',
        cursor: 'pointer', aspectRatio: '1/1',
      }}
    >
      {isVideo ? (
        <video src={src} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }} onLoadedData={() => setLoaded(true)} />
      ) : (
        <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }} onLoad={() => setLoaded(true)} />
      )}
      {!loaded && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>{isVideo ? '▶' : '◻'}</div>}

      {/* Platform dot */}
      <div style={{
        position: 'absolute', bottom: 4, left: 4, width: 8, height: 8, borderRadius: '50%',
        backgroundColor: platform === 'tiktok' ? '#ff0050' : '#dc2743', zIndex: 2,
      }} />
    </div>
  );
}

/* ─── Stats View ─── */

function StatsView({ items, platform, totalSize }: { items: ResultItem[]; platform: string; totalSize: number }) {
  const videos = items.filter(i => i.type === 'video');
  const images = items.filter(i => i.type === 'image');
  const withCaptions = items.filter(i => i.caption);
  const totalLikes = items.reduce((s, i) => s + (i.metrics?.likes || 0), 0);
  const totalViews = items.reduce((s, i) => s + (i.metrics?.views || 0), 0);
  const avgLikes = items.length > 0 ? Math.round(totalLikes / items.length) : 0;

  // Posts per month
  const monthCounts: Record<string, { total: number }> = {};
  for (const item of items) {
    const month = item.created_at ? item.created_at.slice(0, 7) : 'Unknown';
    if (!monthCounts[month]) monthCounts[month] = { total: 0 };
    monthCounts[month].total++;
  }
  const months = Object.entries(monthCounts).sort(([a], [b]) => a.localeCompare(b));
  const maxMonth = Math.max(...months.map(([, v]) => v.total), 1);

  // Top posts
  const topByLikes = [...items].sort((a, b) => (b.metrics?.likes || 0) - (a.metrics?.likes || 0)).slice(0, 5);

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 24 }}>
        {[
          { v: String(items.length), l: 'Total Posts', c: '#fff' },
          { v: fmtNum(totalLikes), l: 'Total Likes', c: '#f87171' },
          { v: totalViews > 0 ? fmtNum(totalViews) : '--', l: 'Total Views', c: '#60a5fa' },
          { v: String(avgLikes), l: 'Avg Likes', c: '#fbbf24' },
          { v: `${videos.length} / ${images.length}`, l: 'Videos / Photos', c: '#a78bfa' },
          { v: fmt(totalSize), l: 'Archive Size', c: '#4ade80' },
        ].map((s) => (
          <div key={s.l} style={{ padding: 16, borderRadius: 10, backgroundColor: '#131313', border: '1px solid #1e1e23', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      {months.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 12 }}>Posts per Month</div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 120 }}>
            {months.map(([month, data]) => (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#555' }}>{data.total}</span>
                <div style={{
                  width: '100%',
                  height: `${(data.total / maxMonth) * 100}px`,
                  borderRadius: '4px 4px 0 0',
                  background: platform === 'tiktok'
                    ? 'linear-gradient(to top, #ff0050, #ff6090)'
                    : 'linear-gradient(to top, #dc2743, #f09433)',
                  minHeight: 4,
                }} />
                <span style={{ fontSize: 9, color: '#444', writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 50 }}>
                  {month.slice(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top posts */}
      {topByLikes.length > 0 && topByLikes[0].metrics?.likes && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 12 }}>Top Posts by Likes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topByLikes.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3" style={{ padding: 10, borderRadius: 8, backgroundColor: '#131313', border: '1px solid #1e1e23' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#333', width: 24, textAlign: 'center' }}>#{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>&#9829; {fmtNum(item.metrics?.likes || 0)}</span>
                <p style={{ flex: 1, fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.caption || item.filename}
                </p>
                {item.created_at && <span style={{ fontSize: 11, color: '#444', flexShrink: 0 }}>{item.created_at}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Caption coverage */}
      <div style={{ marginTop: 24, padding: 16, borderRadius: 10, backgroundColor: '#131313', border: '1px solid #1e1e23' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 8 }}>Content Analysis</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
          <div><span style={{ color: '#555' }}>With captions:</span> <span style={{ color: '#fff' }}>{withCaptions.length} ({items.length > 0 ? Math.round(withCaptions.length / items.length * 100) : 0}%)</span></div>
          <div><span style={{ color: '#555' }}>With hashtags:</span> <span style={{ color: '#fff' }}>{items.filter(i => i.hashtags?.length).length}</span></div>
          <div><span style={{ color: '#555' }}>With engagement:</span> <span style={{ color: '#fff' }}>{items.filter(i => (i.metrics?.likes || 0) > 0).length}</span></div>
          <div><span style={{ color: '#555' }}>With dates:</span> <span style={{ color: '#fff' }}>{items.filter(i => i.created_at).length}</span></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Lightbox Modal ─── */

function LightboxModal({ item, downloadPath, platform, index, total, onClose, onPrev, onNext }: {
  item: ResultItem; downloadPath: string; platform: string;
  index: number; total: number; onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const isVideo = item.type === 'video';
  const src = mediaUrl(downloadPath, item.filename);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', maxWidth: '95vw', maxHeight: '95vh', borderRadius: 12, overflow: 'hidden', backgroundColor: '#0a0a0a' }}>
        {/* Media */}
        <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', minWidth: 300, maxWidth: '65vw', maxHeight: '90vh', position: 'relative' }}>
          {isVideo ? (
            <video src={src} controls autoPlay style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
          ) : (
            <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
          )}
          {index > 0 && <button onClick={(e) => { e.stopPropagation(); onPrev(); }} style={navBtnStyle('left')}>&larr;</button>}
          {index < total - 1 && <button onClick={(e) => { e.stopPropagation(); onNext(); }} style={navBtnStyle('right')}>&rarr;</button>}
        </div>

        {/* Sidebar */}
        <div style={{ width: 320, padding: 20, overflowY: 'auto', maxHeight: '90vh', backgroundColor: '#0f0f12', borderLeft: '1px solid #1e1e23' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#555' }}>{index + 1} / {total}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer' }}>&times;</button>
          </div>

          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <span style={badgeStyle(platform)}>{platform === 'tiktok' ? 'TikTok' : 'Instagram'}</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, color: isVideo ? '#a78bfa' : '#4ade80', backgroundColor: isVideo ? 'rgba(167,139,250,0.12)' : 'rgba(74,222,128,0.12)' }}>
              {isVideo ? 'Video' : 'Image'}
            </span>
          </div>

          {item.created_at && <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{item.created_at}</div>}

          {item.metrics && (
            <div className="flex flex-wrap gap-3" style={{ marginBottom: 16 }}>
              {item.metrics.likes != null && item.metrics.likes > 0 && <div style={{ fontSize: 13 }}><span style={{ color: '#f87171', fontWeight: 600 }}>{fmtNum(item.metrics.likes)}</span> <span style={{ color: '#555' }}>likes</span></div>}
              {item.metrics.views != null && item.metrics.views > 0 && <div style={{ fontSize: 13 }}><span style={{ color: '#60a5fa', fontWeight: 600 }}>{fmtNum(item.metrics.views)}</span> <span style={{ color: '#555' }}>views</span></div>}
              {item.metrics.comments != null && item.metrics.comments > 0 && <div style={{ fontSize: 13 }}><span style={{ color: '#fbbf24', fontWeight: 600 }}>{fmtNum(item.metrics.comments)}</span> <span style={{ color: '#555' }}>comments</span></div>}
            </div>
          )}

          {item.caption && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Caption</div>
              <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{item.caption}</p>
            </div>
          )}

          {item.hashtags && item.hashtags.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Hashtags</div>
              <div className="flex flex-wrap gap-1.5">
                {item.hashtags.map((tag) => (
                  <span key={tag} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, color: '#a78bfa', backgroundColor: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>#{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid #1e1e23', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>File</div>
            <div style={{ fontSize: 12, color: '#666', fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>{item.filename}</div>
            <div className="flex gap-3" style={{ marginTop: 4, fontSize: 12, color: '#555' }}>
              <span>{fmt(item.size_bytes)}</span>
              {item.duration_seconds && <span>{fmtDur(item.duration_seconds)}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function navBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', [side]: 8, top: '50%', transform: 'translateY(-50%)',
    width: 36, height: 36, borderRadius: '50%', border: 'none',
    backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

export type { ResultData };
