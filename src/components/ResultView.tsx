'use client';

import { useState, useMemo, useEffect, useRef } from 'react';

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

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function highlightSearch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  for (const term of terms) {
    const idx = remaining.toLowerCase().indexOf(term);
    if (idx === -1) continue;
    if (idx > 0) parts.push(remaining.slice(0, idx));
    parts.push(
      <mark key={key++} style={{ background: 'rgba(102,126,234,0.3)', color: '#fff', padding: '0 2px', borderRadius: 2 }}>
        {remaining.slice(idx, idx + term.length)}
      </mark>
    );
    remaining = remaining.slice(idx + term.length);
  }
  if (remaining) parts.push(remaining);
  return parts.length > 0 ? <>{parts}</> : text;
}

const ITEMS_PER_BATCH = 400;

export default function ResultView({ job, onBack, onOpenFolder }: ResultViewProps) {
  const result = job.result;
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'image'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'likes-desc' | 'views-desc'>('date-desc');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [gridLimit, setGridLimit] = useState(ITEMS_PER_BATCH);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [researchQuery, setResearchQuery] = useState('');
  const [researchLimit, setResearchLimit] = useState(50);
  const [hashtagsExpanded, setHashtagsExpanded] = useState(false);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);

  // Available years
  const years = useMemo(() => {
    if (!result) return [];
    const ySet = new Set<string>();
    for (const item of result.items) {
      if (item.created_at) ySet.add(item.created_at.slice(0, 4));
    }
    return [...ySet].sort();
  }, [result]);

  // Filtered items
  const filtered = useMemo(() => {
    if (!result) return [];
    let items = [...result.items];
    const q = (view === 'research' ? researchQuery : search).toLowerCase();

    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      items = items.filter((i) => {
        const text = ((i.caption || '') + ' ' + (i.hashtags || []).join(' ') + ' ' + i.filename).toLowerCase();
        return terms.every(t => text.includes(t));
      });
    }
    if (typeFilter !== 'all') items = items.filter((i) => i.type === typeFilter);
    if (yearFilter !== 'all') items = items.filter((i) => i.created_at?.startsWith(yearFilter));

    // Research: filter by selected hashtag
    if (view === 'research' && selectedHashtag) {
      items = items.filter((i) => i.hashtags?.includes(selectedHashtag));
    }

    const [field, dir] = sortBy.split('-');
    items.sort((a, b) => {
      let va: string | number, vb: string | number;
      if (field === 'date') { va = a.created_at || ''; vb = b.created_at || ''; }
      else if (field === 'likes') { va = a.metrics?.likes || 0; vb = b.metrics?.likes || 0; }
      else if (field === 'views') { va = a.metrics?.views || 0; vb = b.metrics?.views || 0; }
      else { va = a.created_at || ''; vb = b.created_at || ''; }
      return dir === 'desc' ? (va > vb ? -1 : va < vb ? 1 : 0) : (va < vb ? -1 : va > vb ? 1 : 0);
    });
    return items;
  }, [result, search, researchQuery, typeFilter, sortBy, yearFilter, view, selectedHashtag]);

  // Reset limits on filter change
  useEffect(() => { setGridLimit(ITEMS_PER_BATCH); }, [search, typeFilter, sortBy, yearFilter]);
  useEffect(() => { setResearchLimit(50); }, [researchQuery, selectedHashtag]);

  // Timeline grouped by month
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
      .slice(0, 80);
  }, [result]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (modalIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalIndex(null);
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setModalIndex((i) => i !== null ? (i + 1) % filtered.length : null);
      }
      if (e.key === 'ArrowLeft') {
        setModalIndex((i) => i !== null ? (i - 1 + filtered.length) % filtered.length : null);
      }
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
          <div style={{ padding: 16, borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.06)', marginTop: 16 }}>
            <p style={{ color: '#f87171', fontSize: 14, fontWeight: 500 }}>Download failed</p>
            <p style={{ color: '#f87171', opacity: 0.7, fontSize: 12, marginTop: 4 }}>{job.error}</p>
          </div>
        )}
      </div>
    );
  }

  const dp = result.download_path;
  const platform = result.platform;
  const videos = result.items.filter((i) => i.type === 'video');
  const images = result.items.filter((i) => i.type === 'image');
  const totalLikes = result.items.reduce((s, i) => s + (i.metrics?.likes || 0), 0);
  const totalViews = result.items.reduce((s, i) => s + (i.metrics?.views || 0), 0);
  const modalItem = modalIndex !== null ? filtered[modalIndex] : null;

  return (
    <div className="animate-fade-in">
      {/* -- Header with gradient -- */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        borderBottom: '1px solid #222',
        padding: '28px 30px 20px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={onBack} style={backBtnStyle}>&larr;</button>
          <button onClick={() => onOpenFolder(dp)} style={{
            padding: '7px 14px', borderRadius: 6, border: '1px solid #333',
            background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 12,
          }}>
            Open Folder
          </button>
        </div>

        <h1 style={{
          fontSize: '2em', letterSpacing: -1, fontWeight: 700,
          background: 'linear-gradient(135deg, #ff0050, #dc2743, #bc1888, #667eea)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          @{result.username}
        </h1>
        <div style={{ fontSize: '0.85em', color: '#666', margin: '4px 0 16px' }}>
          {platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : 'TikTok + Instagram'} Media Archive
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {[
            { v: String(result.items.length), l: 'Total', cls: 'total' },
            { v: String(videos.length), l: 'Videos', cls: platform === 'tiktok' ? 'tk' : 'ig' },
            { v: String(images.length), l: 'Photos', cls: '' },
            { v: fmt(result.total_size_bytes), l: 'Size', cls: '' },
            { v: totalLikes > 0 ? fmtNum(totalLikes) : '--', l: 'Likes', cls: '' },
            { v: totalViews > 0 ? fmtNum(totalViews) : '--', l: 'Views', cls: '' },
          ].map((s) => (
            <div key={s.l} style={{
              background: '#151515', border: '1px solid #222', borderRadius: 10,
              padding: '12px 20px', minWidth: 100, textAlign: 'center',
            }}>
              <div style={{
                fontSize: '1.4em', fontWeight: 700,
                color: s.cls === 'tk' ? '#ff0050' : s.cls === 'ig' ? '#dc2743' : '#fff',
              }}>{s.v}</div>
              <div style={{ fontSize: '0.7em', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* -- Sticky controls bar -- */}
      <div style={{
        background: '#0f0f0f', padding: '10px 16px',
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
        borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search captions..."
          style={{
            padding: '7px 12px', borderRadius: 6, border: '1px solid #2a2a2a',
            background: '#151515', color: '#fff', fontSize: 12, outline: 'none',
            width: 260, transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#dc2743'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; }}
        />

        {/* Platform pills - only show "All" if multi-platform data exists */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            className={`pill ${typeFilter === 'all' ? 'active' : ''}`}
            style={typeFilter === 'all' ? { background: '#333', color: '#fff' } : {}}
            onClick={() => setTypeFilter('all')}
          >All</button>
          <button
            className={`pill ${typeFilter === 'video' ? 'active' : ''}`}
            style={typeFilter === 'video' ? { background: '#ff0050', color: '#fff' } : {}}
            onClick={() => setTypeFilter('video')}
          >Videos</button>
          <button
            className={`pill ${typeFilter === 'image' ? 'active' : ''}`}
            style={typeFilter === 'image' ? { background: '#dc2743', color: '#fff' } : {}}
            onClick={() => setTypeFilter('image')}
          >Photos</button>
        </div>

        {/* View pills */}
        <div style={{ display: 'flex', gap: 2 }}>
          {(['grid', 'timeline', 'captions', 'research', 'stats'] as ViewMode[]).map((v) => (
            <button
              key={v}
              className={`pill ${view === v ? 'active' : ''}`}
              style={view === v ? { background: '#333', color: '#fff' } : {}}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          style={{
            padding: '7px 12px', borderRadius: 6, border: '1px solid #2a2a2a',
            background: '#151515', color: '#fff', fontSize: 12, outline: 'none',
          }}
        >
          <option value="date-desc">Newest</option>
          <option value="date-asc">Oldest</option>
          <option value="likes-desc">Most liked</option>
          <option value="views-desc">Most viewed</option>
        </select>

        {/* Year filter */}
        {years.length > 1 && (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <button
              className={`year-btn ${yearFilter === 'all' ? 'active' : ''}`}
              onClick={() => setYearFilter('all')}
            >All</button>
            {years.map((y) => (
              <button
                key={y}
                className={`year-btn ${yearFilter === y ? 'active' : ''}`}
                onClick={() => setYearFilter(y)}
              >{y}</button>
            ))}
          </div>
        )}
      </div>

      {/* -- Content area -- */}
      <div style={{ padding: 12, minHeight: 'calc(100vh - 180px)' }}>
        {/* Grid View */}
        {view === 'grid' && (
          <div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#444', fontSize: '0.85em' }}>No results</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 6 }}>
                  {filtered.slice(0, gridLimit).map((item, idx) => (
                    <LazyCard key={item.id} item={item} downloadPath={dp} platform={platform} onClick={() => setModalIndex(idx)} />
                  ))}
                </div>
                {filtered.length > gridLimit && (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <button
                      onClick={() => setGridLimit((l) => l + ITEMS_PER_BATCH)}
                      style={{
                        padding: '10px 30px', borderRadius: 8, border: '1px solid #333',
                        background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 13,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2743'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; }}
                    >
                      Load more ({filtered.length - gridLimit} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Timeline View */}
        {view === 'timeline' && (
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#444' }}>No results</div>
            ) : (
              timeline.map(([month, items]) => (
                <div key={month} style={{ marginBottom: 28 }}>
                  <div style={{
                    fontSize: '1em', fontWeight: 700, padding: '8px 0',
                    borderBottom: '1px solid #1a1a1a', marginBottom: 10,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ color: '#fff' }}>
                      {month === 'Unknown' ? 'Unknown date' : formatMonthLabel(month)}
                    </span>
                    <span style={{ fontSize: '0.75em', color: '#555', fontWeight: 400 }}>
                      {items.length} posts
                    </span>
                  </div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 4,
                  }}>
                    {items.map((item) => {
                      const globalIdx = filtered.indexOf(item);
                      return (
                        <TimelineThumb key={item.id} item={item} downloadPath={dp} platform={platform} onClick={() => setModalIndex(globalIdx)} />
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Captions View */}
        {view === 'captions' && (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {filtered.filter(i => i.caption).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#444' }}>No captions</div>
            ) : (
              filtered.filter(i => i.caption).slice(0, 300).map((item) => {
                const globalIdx = filtered.indexOf(item);
                return (
                  <div
                    key={item.id}
                    onClick={() => setModalIndex(globalIdx)}
                    style={{
                      background: '#131313', borderRadius: 8, padding: 14, marginBottom: 8,
                      cursor: 'pointer', transition: 'background 0.15s',
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#131313'; }}
                  >
                    <LazyImg
                      src={mediaUrl(dp, item.filename)}
                      isVideo={item.type === 'video'}
                      style={{ width: 56, height: 56, borderRadius: 6, objectFit: 'cover', flexShrink: 0, background: '#1a1a1a' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8 }}>
                        <span style={{ fontSize: '0.7em', color: '#555' }}>
                          {item.created_at?.slice(0, 10) || ''} {(item.metrics?.likes || 0) > 0 ? `\u2665 ${item.metrics!.likes}` : ''} {(item.metrics?.views || 0) > 0 ? `\u25B6 ${(item.metrics!.views! / 1000).toFixed(0)}k` : ''}
                        </span>
                        <span style={{
                          fontSize: '0.6em', padding: '2px 6px', borderRadius: 3, fontWeight: 600, color: '#fff',
                          background: platform === 'tiktok' ? '#ff0050' : '#dc2743',
                        }}>
                          {platform === 'tiktok' ? 'TikTok' : 'IG'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.82em', color: '#aaa', lineHeight: 1.5,
                        whiteSpace: 'pre-wrap', maxHeight: '4.5em', overflow: 'hidden',
                      }}>
                        {highlightSearch(item.caption || '', search)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Research View */}
        {view === 'research' && (
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {/* Sticky research search bar */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 16,
              position: 'sticky', top: 50, zIndex: 50,
              background: '#0a0a0a', padding: '10px 0',
            }}>
              <input
                type="text"
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                placeholder="Deep search captions, hashtags, mentions..."
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 10,
                  border: '1px solid #2a2a2a', background: '#131313', color: '#fff',
                  fontSize: 15, outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <button
                onClick={() => exportResearch(filtered, result)}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1px solid #333',
                  background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; }}
              >
                Export
              </button>
            </div>

            {/* Hashtag cloud */}
            {hashtagCloud.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: '0.7em', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Top Hashtags
                </div>
                <div style={{
                  display: 'flex', gap: 4, flexWrap: 'wrap',
                  maxHeight: hashtagsExpanded ? 'none' : 80, overflow: 'hidden',
                  transition: 'max-height 0.3s',
                }}>
                  {hashtagCloud.map(([tag, count]) => {
                    const maxCount = hashtagCloud[0]?.[1] || 1;
                    const size = 10 + Math.round((count / maxCount) * 6);
                    return (
                      <span
                        key={tag}
                        onClick={() => setSelectedHashtag(selectedHashtag === tag ? null : tag)}
                        style={{
                          padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                          fontSize: size, transition: 'all 0.15s',
                          background: selectedHashtag === tag ? '#667eea' : '#151515',
                          color: selectedHashtag === tag ? '#fff' : '#667eea',
                        }}
                      >
                        #{tag}<span style={{ opacity: 0.5, marginLeft: 2, fontSize: '0.8em' }}>{count}</span>
                      </span>
                    );
                  })}
                </div>
                <button
                  onClick={() => setHashtagsExpanded(!hashtagsExpanded)}
                  style={{ padding: '3px 10px', border: 'none', background: 'transparent', color: '#555', cursor: 'pointer', fontSize: 11 }}
                >
                  {hashtagsExpanded ? 'Show less' : 'Show all'}
                </button>
              </div>
            )}

            <div style={{ fontSize: '0.8em', color: '#555', padding: '4px 0' }}>
              {filtered.length} results
            </div>

            {/* Research results */}
            <div style={{ marginTop: 10 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#444', fontSize: '0.85em' }}>No matches found</div>
              ) : (
                <>
                  {filtered.slice(0, researchLimit).map((item) => {
                    const isTk = platform === 'tiktok';
                    return (
                      <div
                        key={item.id}
                        onClick={() => { const fi = filtered.indexOf(item); setModalIndex(fi); }}
                        style={{
                          background: '#131313', border: '1px solid #1a1a1a', borderRadius: 10,
                          padding: 16, marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', gap: 14,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#171717'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#131313'; e.currentTarget.style.borderColor = '#1a1a1a'; }}
                      >
                        <LazyImg
                          src={mediaUrl(dp, item.filename)}
                          isVideo={item.type === 'video'}
                          style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: '#1a1a1a' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.6em', padding: '2px 6px', borderRadius: 3, fontWeight: 600, color: '#fff',
                              background: isTk ? '#ff0050' : '#dc2743',
                            }}>
                              {isTk ? 'TikTok' : 'IG'}
                            </span>
                            <span style={{ fontSize: '0.75em', color: '#555' }}>{item.created_at || ''}</span>
                            {(item.metrics?.likes || 0) > 0 && (
                              <span style={{ fontSize: '0.75em', color: '#666' }}>{'\u2665'} {item.metrics!.likes!.toLocaleString()}</span>
                            )}
                            {(item.metrics?.views || 0) > 0 && (
                              <span style={{ fontSize: '0.75em', color: '#666' }}>{'\u25B6'} {(item.metrics!.views! / 1000).toFixed(0)}k</span>
                            )}
                            <span style={{ fontSize: '0.75em', color: '#666' }}>{item.type} &middot; {fmt(item.size_bytes)}</span>
                          </div>
                          <div style={{ fontSize: '0.85em', color: '#bbb', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {highlightSearch(item.caption || '', researchQuery)}
                          </div>
                          {item.hashtags && item.hashtags.length > 0 && (
                            <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {item.hashtags.slice(0, 8).map(h => (
                                <span key={h} style={{ fontSize: '0.65em', padding: '2px 6px', borderRadius: 3, background: '#1a1a2e', color: '#667eea' }}>
                                  #{h}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length > researchLimit && (
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <button
                        onClick={() => setResearchLimit((l) => l + 50)}
                        style={{
                          padding: '10px 30px', borderRadius: 8, border: '1px solid #333',
                          background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 13,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2743'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; }}
                      >
                        Load more ({filtered.length - researchLimit} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Stats View */}
        {view === 'stats' && <StatsView items={result.items} filtered={filtered} platform={platform} totalSize={result.total_size_bytes} onOpenModal={setModalIndex} downloadPath={dp} />}
      </div>

      {/* -- Lightbox -- */}
      {modalItem && modalIndex !== null && (
        <LightboxModal
          item={modalItem} downloadPath={dp} platform={platform}
          index={modalIndex} total={filtered.length}
          onClose={() => setModalIndex(null)}
          onPrev={() => setModalIndex((modalIndex - 1 + filtered.length) % filtered.length)}
          onNext={() => setModalIndex((modalIndex + 1) % filtered.length)}
        />
      )}
    </div>
  );
}

/* -- Styles -- */

const backBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
  backgroundColor: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a', cursor: 'pointer',
};

function exportResearch(filtered: ResultItem[], result: NonNullable<ResultData['result']>) {
  const exported = filtered.map(f => ({
    platform: result.platform,
    type: f.type,
    date: f.created_at,
    likes: f.metrics?.likes || 0,
    views: f.metrics?.views || 0,
    caption: f.caption || '',
    hashtags: f.hashtags || [],
    file: f.filename,
  }));
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${result.username}-research-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* -- Lazy Image with IntersectionObserver -- */

function LazyImg({ src, isVideo, style }: { src: string; isVideo: boolean; style: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ ...style, overflow: 'hidden', position: 'relative' }}>
      {visible ? (
        isVideo ? (
          <video
            src={src} preload="metadata" muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }}
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <img
            src={src} alt="" loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }}
            onLoad={() => setLoaded(true)}
          />
        )
      ) : null}
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}
    </div>
  );
}

/* -- Lazy Gallery Card -- */

function LazyCard({ item, downloadPath, platform, onClick }: { item: ResultItem; downloadPath: string; platform: string; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isVideo = item.type === 'video';
  const src = mediaUrl(downloadPath, item.filename);
  const isTk = platform === 'tiktok';
  const eng = (item.metrics?.views || 0) > 0
    ? `${((item.metrics?.views || 0) / 1000).toFixed(0)}k`
    : (item.metrics?.likes || 0) > 0
      ? String(item.metrics?.likes)
      : '';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        background: '#131313', borderRadius: 6, overflow: 'hidden',
        cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Platform badge */}
      <span style={{
        position: 'absolute', top: 6, left: 6, padding: '2px 6px', borderRadius: 3,
        fontSize: '0.55em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3,
        zIndex: 2, color: '#fff',
        background: isTk ? '#ff0050' : 'linear-gradient(135deg, #f09433, #dc2743)',
      }}>
        {isTk ? 'TT' : 'IG'}
      </span>

      {/* Engagement badge */}
      {eng && (
        <span style={{
          position: 'absolute', top: 6, right: 6, fontSize: '0.6em',
          background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 3, zIndex: 2, color: '#fff',
        }}>
          {'\u2665'} {eng}
        </span>
      )}

      {/* Thumbnail area */}
      <div style={{ width: '100%', aspectRatio: isTk ? '9/16' : '1/1', background: '#1a1a1a', position: 'relative' }}>
        {visible ? (
          isVideo ? (
            <video
              src={src} preload="metadata" muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }}
              onLoadedData={() => setLoaded(true)}
            />
          ) : (
            <img
              src={src} alt="" loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }}
              onLoad={() => setLoaded(true)}
            />
          )
        ) : null}
      </div>

      {/* Bottom overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
        padding: '40px 8px 7px',
      }}>
        {item.caption && (
          <div style={{ fontSize: '0.65em', lineHeight: 1.3, maxHeight: '2.6em', overflow: 'hidden', opacity: 0.9, color: '#fff' }}>
            {item.caption.slice(0, 55)}
          </div>
        )}
        <div style={{ fontSize: '0.55em', color: '#777', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
          <span>{item.created_at?.slice(0, 10) || ''}</span>
          <span>{fmt(item.size_bytes)}</span>
        </div>
      </div>
    </div>
  );
}

/* -- Timeline Thumb -- */

function TimelineThumb({ item, downloadPath, platform, onClick }: { item: ResultItem; downloadPath: string; platform: string; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isVideo = item.type === 'video';
  const src = mediaUrl(downloadPath, item.filename);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        position: 'relative', borderRadius: 3, overflow: 'hidden',
        cursor: 'pointer', aspectRatio: '1/1', background: '#151515',
      }}
    >
      {visible ? (
        isVideo ? (
          <video
            src={src} preload="metadata" muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none', transition: 'opacity 0.15s' }}
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <img
            src={src} alt="" loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none', transition: 'opacity 0.15s' }}
            onLoad={() => setLoaded(true)}
          />
        )
      ) : null}
      {/* Platform dot */}
      <div style={{
        position: 'absolute', bottom: 4, left: 4, width: 8, height: 8, borderRadius: '50%',
        backgroundColor: platform === 'tiktok' ? '#ff0050' : '#dc2743', zIndex: 2,
      }} />
    </div>
  );
}

/* -- Stats View -- */

function StatsView({ items, filtered, platform, totalSize, onOpenModal, downloadPath }: {
  items: ResultItem[]; filtered: ResultItem[]; platform: string; totalSize: number;
  onOpenModal: (idx: number) => void; downloadPath: string;
}) {
  const videos = items.filter(i => i.type === 'video');
  const images = items.filter(i => i.type === 'image');
  const totalLikes = items.reduce((s, i) => s + (i.metrics?.likes || 0), 0);
  const totalViews = items.reduce((s, i) => s + (i.metrics?.views || 0), 0);
  const avgLikes = items.length > 0 ? Math.round(totalLikes / items.length) : 0;
  const isTk = platform === 'tiktok';

  // Monthly breakdown
  const monthCounts: Record<string, { tk: number; ig: number }> = {};
  for (const item of items) {
    const m = item.created_at ? item.created_at.slice(0, 7) : null;
    if (!m) continue;
    if (!monthCounts[m]) monthCounts[m] = { tk: 0, ig: 0 };
    if (isTk) monthCounts[m].tk++; else monthCounts[m].ig++;
  }
  const months = Object.entries(monthCounts).sort(([a], [b]) => b.localeCompare(a));
  const maxMonth = Math.max(...months.map(([, v]) => v.tk + v.ig), 1);
  const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Top posts by likes
  const topLiked = [...items].sort((a, b) => (b.metrics?.likes || 0) - (a.metrics?.likes || 0)).slice(0, 5);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 0' }}>
      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: 12, marginBottom: 30,
      }}>
        {[
          { title: 'Total Posts', big: items.length.toLocaleString(), sub: `${videos.length} videos, ${images.length} photos`, color: '#fff' },
          { title: 'Total Engagement', big: totalLikes.toLocaleString(), sub: 'likes across all posts', color: '#fff' },
          {
            title: isTk ? 'TikTok Views' : 'Total Views',
            big: totalViews > 1e6 ? `${(totalViews / 1e6).toFixed(1)}M` : totalViews > 1e3 ? `${(totalViews / 1e3).toFixed(0)}K` : totalViews.toLocaleString(),
            sub: `across ${videos.length} videos`,
            color: isTk ? '#ff0050' : '#dc2743',
          },
          { title: 'Avg Likes', big: String(avgLikes), sub: 'per post', color: '#fff' },
          { title: 'Media Split', big: `${images.length} / ${videos.length}`, sub: 'photos / videos', color: '#fff' },
          { title: 'Archive Size', big: fmt(totalSize), sub: `${items.length.toLocaleString()} files total`, color: '#fff' },
        ].map((s) => (
          <div key={s.title} style={{
            background: '#131313', border: '1px solid #1a1a1a', borderRadius: 10, padding: 20,
          }}>
            <h3 style={{ fontSize: '0.85em', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.title}</h3>
            <div style={{ fontSize: '2em', fontWeight: 700, color: s.color }}>{s.big}</div>
            <div style={{ fontSize: '0.8em', color: '#555', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Horizontal bar chart */}
      {months.length > 1 && (
        <>
          <h3 style={{ color: '#666', fontSize: '0.85em', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Posts per Month</h3>
          <div style={{ marginTop: 20 }}>
            {months.slice(0, 24).map(([m, v]) => {
              const [y, mo] = m.split('-');
              const label = mo ? `${mNames[+mo - 1]} ${y.slice(2)}` : m;
              const total = v.tk + v.ig;
              const pct = ((total / maxMonth) * 100).toFixed(1);
              return (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 70, fontSize: '0.75em', color: '#888', textAlign: 'right' }}>{label}</div>
                  <div style={{ flex: 1, height: 20, background: '#151515', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, transition: 'width 0.5s',
                      display: 'flex', alignItems: 'center', paddingLeft: 6, fontSize: '0.6em', color: '#fff',
                      width: `${pct}%`,
                      background: isTk
                        ? 'linear-gradient(90deg, #ff0050, #ff4081)'
                        : 'linear-gradient(90deg, #f09433, #dc2743)',
                    }}>
                      {total > 2 ? total : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7em', color: '#555', width: 30 }}>{total}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Top posts by likes */}
      {topLiked.length > 0 && (topLiked[0].metrics?.likes || 0) > 0 && (
        <>
          <h3 style={{ color: '#666', fontSize: '0.85em', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Top Posts by Likes</h3>
          {topLiked.map((item) => {
            const fi = filtered.indexOf(item);
            return (
              <div
                key={item.id}
                onClick={() => { if (fi >= 0) onOpenModal(fi); }}
                style={{
                  background: '#131313', borderRadius: 8, padding: 14, marginBottom: 8,
                  cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#131313'; }}
              >
                <LazyImg
                  src={mediaUrl(downloadPath, item.filename)}
                  isVideo={item.type === 'video'}
                  style={{ width: 56, height: 56, borderRadius: 6, objectFit: 'cover', flexShrink: 0, background: '#1a1a1a' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8 }}>
                    <span style={{ fontSize: '0.7em', color: '#555' }}>
                      {'\u2665'} {(item.metrics?.likes || 0).toLocaleString()} {(item.metrics?.views || 0) > 0 ? `\u00B7 \u25B6 ${((item.metrics?.views || 0) / 1000).toFixed(0)}k` : ''} &middot; {item.created_at?.slice(0, 10) || ''}
                    </span>
                    <span style={{
                      fontSize: '0.6em', padding: '2px 6px', borderRadius: 3, fontWeight: 600, color: '#fff',
                      background: isTk ? '#ff0050' : '#dc2743',
                    }}>
                      {isTk ? 'TikTok' : 'IG'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82em', color: '#aaa', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.caption || 'No caption'}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* -- Lightbox Modal -- */

function LightboxModal({ item, downloadPath, platform, index, total, onClose, onPrev, onNext }: {
  item: ResultItem; downloadPath: string; platform: string;
  index: number; total: number; onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const isVideo = item.type === 'video';
  const src = mediaUrl(downloadPath, item.filename);
  const isTk = platform === 'tiktok';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.96)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: 16, right: 16,
          background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff',
          fontSize: 22, width: 40, height: 40, borderRadius: '50%',
          cursor: 'pointer', zIndex: 1001,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      >&times;</button>

      {/* Prev nav */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        style={{
          position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff',
          fontSize: 28, padding: 14, cursor: 'pointer', borderRadius: 8, zIndex: 1001,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      >&lsaquo;</button>

      {/* Next nav */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        style={{
          position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff',
          fontSize: 28, padding: 14, cursor: 'pointer', borderRadius: 8, zIndex: 1001,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      >&rsaquo;</button>

      {/* Counter */}
      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        fontSize: '0.75em', color: '#444', zIndex: 1001,
      }}>
        {index + 1} / {total}
      </div>

      {/* Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex', gap: 20, maxWidth: '90vw', maxHeight: '90vh', alignItems: 'flex-start',
        }}
      >
        {/* Media */}
        <div style={{ maxWidth: 500, maxHeight: '85vh', display: 'flex', alignItems: 'center' }}>
          {isVideo ? (
            <video src={src} controls autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 10 }} />
          ) : (
            <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 10 }} />
          )}
        </div>

        {/* Details panel */}
        <div style={{
          width: 320, background: '#151515', border: '1px solid #1a1a1a', borderRadius: 10,
          padding: 20, maxHeight: '85vh', overflowY: 'auto',
        }}>
          <div style={{
            display: 'inline-block', padding: '3px 8px', borderRadius: 4,
            fontSize: '0.7em', fontWeight: 700, marginBottom: 10, color: '#fff',
            background: isTk ? '#ff0050' : 'linear-gradient(135deg, #f09433, #dc2743)',
          }}>
            {isTk ? 'TikTok' : 'Instagram'}
          </div>

          <div style={{ fontSize: '0.8em', color: '#555', marginBottom: 4 }}>{item.created_at || ''}</div>

          <div style={{ fontSize: '0.8em', color: '#777', marginBottom: 14 }}>
            {[
              (item.metrics?.likes || 0) > 0 ? `${item.metrics!.likes!.toLocaleString()} likes` : '',
              (item.metrics?.views || 0) > 0 ? `${((item.metrics?.views || 0) / 1000).toFixed(0)}k views` : '',
              (item.metrics?.comments || 0) > 0 ? `${item.metrics!.comments} comments` : '',
            ].filter(Boolean).join(' \u00B7 ')}
          </div>

          <div style={{ fontSize: '0.85em', lineHeight: 1.7, color: '#ccc', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {item.caption || 'No caption'}
          </div>

          {item.hashtags && item.hashtags.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {item.hashtags.map(h => (
                <span key={h} style={{ fontSize: '0.65em', padding: '2px 6px', borderRadius: 3, background: '#1a1a2e', color: '#667eea' }}>
                  #{h}
                </span>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid #1a1a1a', marginTop: 14, paddingTop: 12 }}>
            <div style={{ fontSize: '0.75em', color: '#555' }}>
              {item.filename}
            </div>
            <div style={{ fontSize: '0.75em', color: '#555', marginTop: 4 }}>
              {fmt(item.size_bytes)} {item.duration_seconds ? `\u00B7 ${fmtDur(item.duration_seconds)}` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ResultData };
