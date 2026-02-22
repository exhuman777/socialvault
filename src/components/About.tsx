'use client';

import { useState } from 'react';

export default function About() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '1px solid #2a2a30',
          backgroundColor: '#131316',
          color: '#555',
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a30'; e.currentTarget.style.color = '#555'; }}
      >
        ?
      </button>
    );
  }

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
        style={{
          backgroundColor: '#131316',
          border: '1px solid #2a2a30',
          borderRadius: 20,
          padding: 32,
          maxWidth: 480,
          width: '100%',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            fontSize: 20,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 12,
          }}>
            SV
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>SocialVault</h2>
          <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>v2.0.0 &middot; MIT License</p>
        </div>

        {/* Description */}
        <p style={{ fontSize: 14, color: '#999', lineHeight: 1.6, textAlign: 'center', marginBottom: 24 }}>
          Local TikTok & Instagram downloader with a dashboard. Download your content. Own it forever.
          Upload to <a href="https://zo.computer" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', textDecoration: 'none' }}>zo.computer</a> for free cloud storage.
        </p>

        {/* Authors */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Authors</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href="https://x.com/3xhuman"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: '#1a1a1f',
                border: '1px solid #2a2a30',
                textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a3a42'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a30'; }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>X</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7' }}>Exhuman</div>
                <div style={{ fontSize: 12, color: '#555' }}>@3xhuman</div>
              </div>
            </a>
            <a
              href="https://instagram.com/exhto"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: '#1a1a1f',
                border: '1px solid #2a2a30',
                textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a3a42'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a30'; }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>IG</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7' }}>Exhto</div>
                <div style={{ fontSize: 12, color: '#555' }}>@exhto</div>
              </div>
            </a>
          </div>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'GitHub', url: 'https://github.com/exhuman777/socialvault' },
            { label: 'zo.computer', url: 'https://zo.computer' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#a78bfa',
                backgroundColor: 'rgba(124, 58, 237, 0.08)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Network info */}
        <div style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 8,
          backgroundColor: '#111114',
          border: '1px solid #1e1e23',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Network Access</div>
          <p style={{ fontSize: 12, color: '#666' }}>
            Anyone on your network can access this dashboard.
          </p>
          <p style={{ fontSize: 12, color: '#888', fontFamily: 'ui-monospace, monospace', marginTop: 4 }}>
            http://{'<'}your-ip{'>'}:3777
          </p>
        </div>

        {/* Close */}
        <button
          onClick={() => setOpen(false)}
          style={{
            display: 'block',
            margin: '20px auto 0',
            padding: '6px 20px',
            borderRadius: 8,
            border: '1px solid #2a2a30',
            backgroundColor: 'transparent',
            color: '#555',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
