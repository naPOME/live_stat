'use client';

import { useState } from 'react';

const WIDGETS = [
  { name: 'Match Ranking',        path: '/overlay/leaderboard', size: '420\u00D71080',  position: 'Right side',    desc: 'Live leaderboard with teams, status, points and eliminations.' },
  { name: 'Kill Feed',            path: '/overlay/killfeed',    size: '1920\u00D71080', position: 'Top left',      desc: 'Real-time kill feed. Auto-fades after 5s.' },
  { name: 'Player Card',          path: '/overlay/playercard',  size: '1920\u00D71080', position: 'Bottom left',   desc: 'Currently observed player stats: health, kills, team.' },
  { name: 'Elimination Alert',    path: '/overlay/elimination', size: '1920\u00D71080', position: 'Top center',    desc: 'Popup when a team is eliminated with rank and stats.' },
  { name: 'WWCD',                 path: '/overlay/wwcd',        size: '1920\u00D71080', position: 'Full screen',   desc: 'Winner screen with player silhouettes and team stats.' },
  { name: 'Top Fraggers',         path: '/overlay/fraggers',    size: '1920\u00D71080', position: 'Bottom center', desc: 'Top 5 players by eliminations with MVP badge.' },
  { name: 'After Match Score',    path: '/overlay/results',     size: '1920\u00D71080', position: 'Center',        desc: 'Two-column match results table, all teams ranked.' },
  { name: 'MVP',                  path: '/overlay/mvp',         size: '1920\u00D71080', position: 'Center',        desc: 'Match MVP with detailed player stats.' },
  { name: 'Point Table',          path: '/overlay/pointtable',  size: '1920\u00D71080', position: 'Center',        desc: 'PUBG Mobile standard point system display.' },
  { name: 'Team List',            path: '/overlay/teamlist',    size: '1920\u00D71080', position: 'Center',        desc: 'Grid of all teams with logos. Pre-match display.' },
  { name: 'Match Info',           path: '/overlay/matchinfo',   size: '1920\u00D71080', position: 'Center',        desc: 'Match start notification with stage, game, map.', params: '?stage=Groups&game=Game 1&map=Erangel' },
  { name: 'Schedule',             path: '/overlay/schedule',    size: '1920\u00D71080', position: 'Bottom',        desc: 'Bottom bar with match schedule and status indicators.', params: '?matches=MATCH 1:ERANGEL:finished,MATCH 2:MIRAMAR:live,MATCH 3:SANHOK:upcoming' },
];

export default function GalleryPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';

  function copy(path: string, params?: string) {
    navigator.clipboard.writeText(`${base}${path}${params || ''}`);
    setCopied(path);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="flex items-center gap-8">
          <a href="/" className="topbar-brand">
            <div className="topbar-logo">LS</div>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Live Stat</span>
          </a>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.15 }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Overlay Gallery</span>
        </div>
        <div className="topbar-right">
          <a href="/controller" className="btn" style={{ textDecoration: 'none' }}>Controller</a>
        </div>
      </header>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px' }}>
        {/* Hero cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ borderColor: 'rgba(0,255,195,0.15)' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.1em' }}>RECOMMENDED</span>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>Master Overlay</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 10px' }}>Single OBS source that composites all widgets. Toggle from Controller.</div>
            <code className="mono" style={{ display: 'block', fontSize: 11, padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: '1px solid rgba(0,255,195,0.15)', color: 'var(--accent)' }}>
              {base}/overlay/master
            </code>
          </div>
          <a href="/controller" className="nav-link" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--red)', letterSpacing: '0.1em' }}>OPERATOR</span>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>Widget Controller</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Toggle overlays with hotkeys (F1-F12) during broadcast.</div>
          </a>
        </div>

        <div className="section-label">All Widgets</div>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: -6, marginBottom: 14 }}>
          Add as Browser Sources in OBS \u00B7 1920\u00D71080 \u00B7 Transparent background
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
          {WIDGETS.map(w => (
            <div key={w.path} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="flex items-center" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{w.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{w.size} \u00B7 {w.position}</div>
                </div>
                <a href={w.path + (w.params || '')} target="_blank" rel="noopener" className="btn" style={{ fontSize: 10, padding: '4px 8px' }}>Preview</a>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{w.desc}</div>
              <div className="flex items-center gap-6">
                <code className="mono" style={{ flex: 1, fontSize: 10, padding: '5px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {base}{w.path}{w.params || ''}
                </code>
                <button onClick={() => copy(w.path, w.params)} className={copied === w.path ? 'btn btn-accent' : 'btn'} style={{ fontSize: 10, padding: '4px 10px', whiteSpace: 'nowrap' }}>
                  {copied === w.path ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center" style={{ justifyContent: 'space-between', marginTop: 28, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-faint)' }}>
          <span>Live Stat Local Engine</span>
          <div className="flex gap-10">
            <a href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Dashboard</a>
            <a href="/controller" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Controller</a>
          </div>
        </div>
      </div>
    </div>
  );
}
