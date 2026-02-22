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

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** Build a media URL from the download path + filename */
function mediaUrl(downloadPath: string, filename: string): string {
  // downloadPath is absolute like /Users/.../socialvault/instagram/exhto/2026-02-22
  // We need relative path from ~/Downloads/socialvault/
  const base = downloadPath.split('/socialvault/')[1] || '';
  return `/api/v1/media?path=${encodeURIComponent(base + '/' + filename)}`;
}

export default function ResultView({ job, onBack, onOpenFolder }: ResultViewProps) {
  const result = job.result;
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'image'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'likes'>('newest');
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!result) return [];
    let items = [...result.items];

    // Search
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.filename.toLowerCase().includes(q) ||
          i.caption?.toLowerCase().includes(q) ||
          i.hashtags?.some((h) => h.toLowerCase().includes(q))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      items = items.filter((i) => i.type === typeFilter);
    }

    // Sort
    items.sort((a, b) => {
      if (sortBy === 'likes') {
        return (b.metrics?.likes || 0) - (a.metrics?.likes || 0);
      }
      if (sortBy === 'oldest') {
        return (a.created_at || '').localeCompare(b.created_at || '');
      }
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return items;
  }, [result, search, typeFilter, sortBy]);

  // Keyboard navigation for modal
  useEffect(() => {
    if (modalIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalIndex(null);
      if (e.key === 'ArrowRight') setModalIndex((i) => (i !== null ? Math.min(i + 1, filtered.length - 1) : null));
      if (e.key === 'ArrowLeft') setModalIndex((i) => (i !== null ? Math.max(i - 1, 0) : null));
      if (e.key === ' ') { e.preventDefault(); setModalIndex((i) => (i !== null ? Math.min(i + 1, filtered.length - 1) : null)); }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [modalIndex, filtered.length]);

  if (!result) {
    return (
      <div className="animate-fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <button onClick={onBack} className="sv-btn-secondary" style={{ padding: '6px 12px', fontSize: 13, marginBottom: 24 }}>
          &larr; Back
        </button>
        {job.status === 'failed' && job.error && (
          <div style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.06)' }}>
            <p className="text-sm font-medium" style={{ color: '#f87171' }}>Download failed</p>
            <p className="mt-1 text-xs" style={{ color: '#f87171', opacity: 0.7 }}>{job.error}</p>
          </div>
        )}
      </div>
    );
  }

  const downloadPath = result.download_path;
  const videos = result.items.filter((i) => i.type === 'video');
  const images = result.items.filter((i) => i.type === 'image');
  const totalLikes = result.items.reduce((sum, i) => sum + (i.metrics?.likes || 0), 0);
  const totalViews = result.items.reduce((sum, i) => sum + (i.metrics?.views || 0), 0);
  const modalItem = modalIndex !== null ? filtered[modalIndex] : null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <button onClick={onBack} className="sv-btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}>
            &larr;
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold" style={{ color: '#fff' }}>{result.username}</h2>
            <span className="text-xs capitalize" style={{ color: '#666' }}>{result.platform} / {job.mode}</span>
          </div>
          <button onClick={() => onOpenFolder(downloadPath)} className="sv-btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}>
            Open in Finder
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
          {[
            { value: String(result.items.length), label: 'Total', color: '#fff' },
            { value: String(videos.length), label: 'Videos', color: '#a78bfa' },
            { value: String(images.length), label: 'Photos', color: '#4ade80' },
            { value: formatBytes(result.total_size_bytes), label: 'Size', color: '#fff' },
            { value: totalLikes > 0 ? formatNumber(totalLikes) : '--', label: 'Likes', color: '#f87171' },
            { value: totalViews > 0 ? formatNumber(totalViews) : '--', label: 'Views', color: '#60a5fa' },
          ].map((s) => (
            <div key={s.label} style={{ padding: '12px 10px', borderRadius: 10, backgroundColor: '#131313', border: '1px solid #1e1e23', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search captions, hashtags..."
          style={{
            flex: '1 1 200px',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #2a2a30',
            backgroundColor: '#111114',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'video', 'image'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: typeFilter === t ? '#7c3aed' : '#1a1a1f',
                color: typeFilter === t ? '#fff' : '#888',
              }}
            >
              {t === 'all' ? 'All' : t === 'video' ? 'Videos' : 'Photos'}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'likes')}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #2a2a30',
            backgroundColor: '#111114',
            color: '#aaa',
            fontSize: 12,
          }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="likes">Most liked</option>
        </select>
        <span style={{ fontSize: 12, color: '#555' }}>{filtered.length} items</span>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
        gap: 6,
      }}>
        {filtered.map((item, idx) => (
          <GalleryCard
            key={item.id}
            item={item}
            downloadPath={downloadPath}
            platform={result.platform}
            onClick={() => setModalIndex(idx)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: '#444' }}>
          {search ? 'No items match your search' : 'No media files found'}
        </div>
      )}

      {/* Lightbox Modal */}
      {modalItem && modalIndex !== null && (
        <LightboxModal
          item={modalItem}
          downloadPath={downloadPath}
          platform={result.platform}
          index={modalIndex}
          total={filtered.length}
          onClose={() => setModalIndex(null)}
          onPrev={() => setModalIndex(Math.max(0, modalIndex - 1))}
          onNext={() => setModalIndex(Math.min(filtered.length - 1, modalIndex + 1))}
        />
      )}
    </div>
  );
}

/* ─── Gallery Card ─── */

function GalleryCard({
  item,
  downloadPath,
  platform,
  onClick,
}: {
  item: ResultItem;
  downloadPath: string;
  platform: string;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const isVideo = item.type === 'video';
  const src = mediaUrl(downloadPath, item.filename);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#131313',
        cursor: 'pointer',
        aspectRatio: isVideo ? '9/16' : '1/1',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(124, 58, 237, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Thumbnail */}
      {isVideo ? (
        <video
          src={src}
          preload="metadata"
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }}
          onLoadedData={() => setLoaded(true)}
        />
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }}
          onLoad={() => setLoaded(true)}
        />
      )}

      {/* Placeholder while loading */}
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
          {isVideo ? '▶' : '■'}
        </div>
      )}

      {/* Platform badge */}
      <span style={{
        position: 'absolute',
        top: 6,
        left: 6,
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        color: '#fff',
        background: platform === 'tiktok' ? '#ff0050' : 'linear-gradient(45deg, #f09433, #dc2743)',
        zIndex: 2,
      }}>
        {platform === 'tiktok' ? 'TT' : 'IG'}
      </span>

      {/* Video play icon */}
      {isVideo && (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          color: '#fff',
          zIndex: 2,
        }}>
          ▶
        </div>
      )}

      {/* Engagement badge */}
      {(item.metrics?.likes ?? 0) > 0 && (
        <span style={{
          position: 'absolute',
          top: 6,
          right: isVideo ? 32 : 6,
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          color: '#fff',
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 2,
        }}>
          ♥ {formatNumber(item.metrics!.likes!)}
        </span>
      )}

      {/* Hover overlay with caption */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '40px 8px 8px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        opacity: 0,
        transition: 'opacity 0.2s',
        zIndex: 1,
      }}
        className="gallery-card-overlay"
      >
        {item.caption && (
          <p style={{ fontSize: 11, color: '#ddd', lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.caption}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#888' }}>
          {item.created_at && <span>{item.created_at}</span>}
          <span>{formatBytes(item.size_bytes)}</span>
          {item.duration_seconds && <span>{formatDuration(item.duration_seconds)}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Lightbox Modal ─── */

function LightboxModal({
  item,
  downloadPath,
  platform,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  item: ResultItem;
  downloadPath: string;
  platform: string;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = item.type === 'video';
  const src = mediaUrl(downloadPath, item.filename);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          maxWidth: '95vw',
          maxHeight: '95vh',
          gap: 0,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#0a0a0a',
        }}
      >
        {/* Media panel */}
        <div style={{
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          minWidth: 300,
          maxWidth: '65vw',
          maxHeight: '90vh',
          position: 'relative',
        }}>
          {isVideo ? (
            <video
              ref={videoRef}
              src={src}
              controls
              autoPlay
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
            />
          ) : (
            <img
              src={src}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
            />
          )}

          {/* Nav arrows */}
          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              &larr;
            </button>
          )}
          {index < total - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              &rarr;
            </button>
          )}
        </div>

        {/* Info sidebar */}
        <div style={{
          width: 320,
          padding: 20,
          overflowY: 'auto',
          maxHeight: '90vh',
          backgroundColor: '#0f0f12',
          borderLeft: '1px solid #1e1e23',
        }}>
          {/* Close button */}
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#555' }}>
              {index + 1} / {total}
            </span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}
            >
              &times;
            </button>
          </div>

          {/* Platform + type */}
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <span style={{
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              background: platform === 'tiktok' ? '#ff0050' : 'linear-gradient(45deg, #f09433, #dc2743)',
            }}>
              {platform === 'tiktok' ? 'TikTok' : 'Instagram'}
            </span>
            <span style={{
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              color: isVideo ? '#a78bfa' : '#4ade80',
              backgroundColor: isVideo ? 'rgba(167,139,250,0.12)' : 'rgba(74,222,128,0.12)',
            }}>
              {isVideo ? 'Video' : 'Image'}
            </span>
          </div>

          {/* Date */}
          {item.created_at && (
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
              {item.created_at}
            </div>
          )}

          {/* Metrics */}
          {item.metrics && (
            <div className="flex flex-wrap gap-3" style={{ marginBottom: 16 }}>
              {item.metrics.likes != null && item.metrics.likes > 0 && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>{formatNumber(item.metrics.likes)}</span>
                  <span style={{ color: '#555', marginLeft: 4 }}>likes</span>
                </div>
              )}
              {item.metrics.views != null && item.metrics.views > 0 && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{formatNumber(item.metrics.views)}</span>
                  <span style={{ color: '#555', marginLeft: 4 }}>views</span>
                </div>
              )}
              {item.metrics.comments != null && item.metrics.comments > 0 && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>{formatNumber(item.metrics.comments)}</span>
                  <span style={{ color: '#555', marginLeft: 4 }}>comments</span>
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          {item.caption && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Caption</div>
              <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {item.caption}
              </p>
            </div>
          )}

          {/* Hashtags */}
          {item.hashtags && item.hashtags.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Hashtags</div>
              <div className="flex flex-wrap gap-1.5">
                {item.hashtags.map((tag) => (
                  <span key={tag} style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    color: '#a78bfa',
                    backgroundColor: 'rgba(124, 58, 237, 0.12)',
                    border: '1px solid rgba(124, 58, 237, 0.2)',
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File info */}
          <div style={{ borderTop: '1px solid #1e1e23', paddingTop: 12, marginTop: 'auto' }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>File</div>
            <div style={{ fontSize: 12, color: '#666', fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
              {item.filename}
            </div>
            <div className="flex gap-3" style={{ marginTop: 4, fontSize: 12, color: '#555' }}>
              <span>{formatBytes(item.size_bytes)}</span>
              {item.duration_seconds && <span>{formatDuration(item.duration_seconds)}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ResultData };
