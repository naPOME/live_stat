'use client';

import { useState, useEffect } from 'react';
import {
  ListNumbers,
  Crosshair,
  UserCircle,
  Warning,
  Trophy,
  Sword,
  ChartBar,
  Star,
  Table,
  UsersThree,
  Info,
  CalendarBlank,
  Monitor,
  GameController,
  Copy,
  Check,
  ArrowSquareOut,
} from '@phosphor-icons/react';

const WIDGETS = [
  { name: 'Match Ranking',     path: '/overlay/leaderboard', size: '420×1080',  position: 'Right side',    desc: 'Live leaderboard with teams, status, points and eliminations.', icon: <ListNumbers size={20} weight="duotone" /> },
  { name: 'Kill Feed',         path: '/overlay/killfeed',    size: '1920×1080', position: 'Top left',      desc: 'Real-time kill feed. Auto-fades after 5s.', icon: <Crosshair size={20} weight="duotone" /> },
  { name: 'Player Card',       path: '/overlay/playercard',  size: '1920×1080', position: 'Bottom left',   desc: 'Currently observed player stats: health, kills, team.', icon: <UserCircle size={20} weight="duotone" /> },
  { name: 'Elimination Alert', path: '/overlay/elimination', size: '1920×1080', position: 'Top center',    desc: 'Popup when a team is eliminated with rank and stats.', icon: <Warning size={20} weight="duotone" /> },
  { name: 'WWCD',              path: '/overlay/wwcd',        size: '1920×1080', position: 'Full screen',   desc: 'Winner screen with player silhouettes and team stats.', icon: <Trophy size={20} weight="duotone" /> },
  { name: 'Top Fraggers',      path: '/overlay/fraggers',    size: '1920×1080', position: 'Bottom center', desc: 'Top 5 players by eliminations with MVP badge.', icon: <Sword size={20} weight="duotone" /> },
  { name: 'After Match Score',    path: '/overlay/results',     size: '1920×1080', position: 'Center',        desc: 'Two-column match results table, all teams ranked.', icon: <ChartBar size={20} weight="duotone" /> },
  { name: 'MVP',               path: '/overlay/mvp',         size: '1920×1080', position: 'Center',        desc: 'Match MVP with detailed player stats.', icon: <Star size={20} weight="duotone" /> },
  { name: 'Point Table',       path: '/overlay/pointtable',  size: '1920×1080', position: 'Center',        desc: 'PUBG Mobile standard point system display.', icon: <Table size={20} weight="duotone" /> },
  { name: 'Team List',         path: '/overlay/teamlist',     size: '1920×1080', position: 'Center',        desc: 'Grid of all teams with logos. Pre-match display.', icon: <UsersThree size={20} weight="duotone" /> },
  { name: 'Match Info',        path: '/overlay/matchinfo',   size: '1920×1080', position: 'Center',        desc: 'Match start notification with stage, game, map.', icon: <Info size={20} weight="duotone" />, params: '?stage=Groups&game=Game 1&map=Erangel' },
  { name: 'Schedule',          path: '/overlay/schedule',    size: '1920×1080', position: 'Bottom',        desc: 'Bottom bar with match schedule and status indicators.', icon: <CalendarBlank size={20} weight="duotone" />, params: '?matches=MATCH 1:ERANGEL:finished,MATCH 2:MIRAMAR:live,MATCH 3:SANHOK:upcoming' },
];

export default function GalleryPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [base, setBase] = useState('http://localhost:3001');

  useEffect(() => {
    setBase(window.location.origin);
  }, []);

  function copy(path: string, params?: string) {
    navigator.clipboard.writeText(`${base}${path}${params || ''}`);
    setCopied(path);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Widget Gallery</h1>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>
            {WIDGETS.length} overlay widgets · 1920×1080 · Transparent background
          </p>
        </div>
        <a href="/controller" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <GameController size={14} />
          Controller
        </a>
      </div>

      {/* ── Master overlay hero ── */}
      <div className="card" style={{ borderColor: 'rgba(59,130,246,0.12)', padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-soft)', border: '1px solid rgba(59,130,246,0.1)',
              display: 'grid', placeItems: 'center',
            }}>
              <Monitor size={20} weight="duotone" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>Master Overlay</span>
                <span style={{
                  fontSize: 9, fontWeight: 800, color: 'var(--accent)',
                  letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 4,
                  background: 'var(--accent-soft)', border: '1px solid rgba(59,130,246,0.1)',
                }}>RECOMMENDED</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>
                Single OBS source that composites all widgets. Toggle from Controller.
              </div>
            </div>
          </div>
          <button onClick={() => copy('/overlay/master')} className="btn btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {copied === '/overlay/master' ? <Check size={14} weight="bold" /> : <Copy size={14} />}
            {copied === '/overlay/master' ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
        <code className="mono" style={{
          display: 'block', fontSize: 11, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--accent)',
          marginTop: 14,
        }}>
          {base}/overlay/master
        </code>
      </div>

      {/* ── Widget grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
        {WIDGETS.map(w => {
          const isCopied = copied === w.path;
          return (
            <div key={w.path} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px' }}>
              {/* Top: icon + name + preview */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                  display: 'grid', placeItems: 'center', color: 'var(--text-dim)',
                }}>
                  {w.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{w.name}</span>
                    <a
                      href={w.path + (w.params || '')}
                      target="_blank"
                      rel="noopener"
                      style={{ color: 'var(--text-faint)', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                      title="Preview"
                    >
                      <ArrowSquareOut size={14} />
                    </a>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                    {w.size} · {w.position}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{w.desc}</div>

              {/* URL + copy */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <code className="mono" style={{
                  flex: 1, fontSize: 10, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-base)', border: '1px solid var(--border)',
                  color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {base}{w.path}{w.params || ''}
                </code>
                <button
                  onClick={() => copy(w.path, w.params)}
                  className="btn"
                  style={{ fontSize: 10, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {isCopied ? <Check size={12} weight="bold" style={{ color: 'var(--green)' }} /> : <Copy size={12} />}
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center" style={{ justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 10, color: 'var(--text-muted)' }}>
        <span>Live Stat Engine</span>
        <span className="mono">:3001</span>
      </div>
    </div>
  );
}
