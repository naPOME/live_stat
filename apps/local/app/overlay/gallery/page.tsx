'use client';

import { useState } from 'react';

const WIDGETS = [
  {
    name: 'Match Ranking',
    path: '/overlay/leaderboard',
    description: 'Live leaderboard with teams, player status, points and eliminations. Updates every second.',
    size: '420×1080',
    position: 'Right side',
  },
  {
    name: 'Elimination Notification',
    path: '/overlay/elimination',
    description: 'Popup notification when a team is eliminated. Shows rank, team name, elims and points.',
    size: '1920×1080',
    position: 'Top center',
  },
  {
    name: 'Winner Winner Chicken Dinner',
    path: '/overlay/wwcd',
    description: 'WWCD screen with player silhouettes, team stats. Shows when match phase is "finished".',
    size: '1920×1080',
    position: 'Full screen',
  },
  {
    name: 'Top Fraggers',
    path: '/overlay/fraggers',
    description: 'Top 5 players by eliminations with MVP badge. Updates live.',
    size: '1920×1080',
    position: 'Bottom center',
  },
  {
    name: 'After Match Score',
    path: '/overlay/results',
    description: 'Two-column match results table with all teams ranked by points.',
    size: '1920×1080',
    position: 'Center',
  },
  {
    name: 'Point Table',
    path: '/overlay/pointtable',
    description: 'Visual PUBG Mobile standard point system display. Static widget.',
    size: '1920×1080',
    position: 'Center',
  },
  {
    name: 'Team List',
    path: '/overlay/teamlist',
    description: 'Two-column grid of all teams with logos. Good for pre-match display.',
    size: '1920×1080',
    position: 'Center',
  },
  {
    name: 'MVP',
    path: '/overlay/mvp',
    description: 'Match MVP display with player stats: eliminations, damage, assists, knockouts, throwables, heals, survival time.',
    size: '1920×1080',
    position: 'Center',
  },
  {
    name: 'Match Schedule',
    path: '/overlay/schedule',
    description: 'Bottom bar showing match schedule with map names, live/finished indicators. Configurable via query params.',
    size: '1920×1080',
    position: 'Bottom',
    params: '?matches=MATCH 1:ERANGEL:finished,MATCH 2:MIRAMAR:live,MATCH 3:SANHOK:upcoming',
  },
  {
    name: 'Match Info',
    path: '/overlay/matchinfo',
    description: 'Match started notification with stage, game number, and map name.',
    size: '1920×1080',
    position: 'Center',
    params: '?stage=Groups&game=Game 1&map=Erangel',
  },
  {
    name: 'Kill Feed',
    path: '/overlay/killfeed',
    description: 'Real-time kill feed showing killer, victim, and distance. Auto-fades after 5s.',
    size: '1920×1080',
    position: 'Top left',
  },
  {
    name: 'Player Card',
    path: '/overlay/playercard',
    description: 'Currently observed player stats: health, kills, team info.',
    size: '1920×1080',
    position: 'Bottom left',
  },
];

export default function GalleryPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';

  function copyUrl(path: string, params?: string) {
    const url = `${baseUrl}${path}${params || ''}`;
    navigator.clipboard.writeText(url);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#0e1621', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>OBS Overlay Widgets</h1>
        <p style={{ color: '#8b8da6', fontSize: 14, marginBottom: 32 }}>
          Add these as Browser Sources in OBS Studio. Set width/height to 1920×1080 with transparent background.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {WIDGETS.map((w) => (
            <div
              key={w.path}
              style={{
                background: '#213448',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{w.name}</h3>
                  <span style={{ fontSize: 11, color: '#8b8da6' }}>{w.size} — {w.position}</span>
                </div>
                <a
                  href={w.path + (w.params || '')}
                  target="_blank"
                  rel="noopener"
                  style={{
                    fontSize: 11,
                    color: '#00ffc3',
                    textDecoration: 'none',
                    border: '1px solid rgba(0,255,195,0.3)',
                    padding: '4px 10px',
                    borderRadius: 8,
                  }}
                >
                  Preview
                </a>
              </div>

              <p style={{ fontSize: 12, color: '#8b8da6', margin: 0, lineHeight: 1.5 }}>{w.description}</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code
                  style={{
                    flex: 1,
                    fontSize: 11,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    color: '#00ffc3',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {baseUrl}{w.path}{w.params || ''}
                </code>
                <button
                  onClick={() => copyUrl(w.path, w.params)}
                  style={{
                    fontSize: 11,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: copied === w.path ? '#00ffc3' : 'transparent',
                    color: copied === w.path ? '#000' : '#8b8da6',
                    cursor: 'pointer',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied === w.path ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
