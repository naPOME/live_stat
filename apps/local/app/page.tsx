'use client';

import { useEffect, useState } from 'react';

interface RosterInfo {
  roster_loaded: boolean;
  roster_path?: string | null;
  team_count: number;
  player_count: number;
  tournament_id?: string | null;
  match_id?: string | null;
  teams_preview?: { slot_number: number; name: string; short_name: string }[];
  error?: string | null;
}

interface GameData {
  phase?: string;
  matchId?: string;
  teams: {
    teamName: string;
    displayName?: string;
    shortName?: string;
    brandColor?: string;
    kills: number;
    totalPoints: number;
    liveMemberNum: number;
    alive: boolean;
  }[];
  players?: { playerName: string; displayName?: string; teamName: string; kills: number }[];
  spotlight?: { playerName: string; teamName: string; kills: number };
}

interface WidgetState {
  [key: string]: boolean;
}

interface SyncStatus {
  role: 'leader' | 'follower' | 'standalone';
  connected: boolean;
  matchId: string | null;
  peerCount: number;
  lastSyncAt: number | null;
  error: string | null;
}

const NAV_CARDS = [
  {
    title: 'Widget Controller',
    desc: 'Toggle overlays with hotkeys (F1-F12) during broadcast. Quick presets for match phases.',
    href: '/controller',
    tag: 'OPERATOR',
    tagColor: '#ff4e4e',
    icon: '⎚',
  },
  {
    title: 'Overlay Gallery',
    desc: 'Browse all overlay widgets, copy OBS URLs, and preview each one.',
    href: '/overlay/gallery',
    tag: 'SETUP',
    tagColor: '#00ffc3',
    icon: '◫',
  },
  {
    title: 'Master Overlay',
    desc: 'Single OBS browser source that composites all active widgets. Add this to OBS.',
    href: '/overlay/master',
    tag: 'OBS SOURCE',
    tagColor: '#6d5efc',
    icon: '⊞',
  },
];

export default function Dashboard() {
  const [rosterInfo, setRosterInfo] = useState<RosterInfo | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [widgets, setWidgets] = useState<WidgetState>({});
  const [rosterPathInput, setRosterPathInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [time, setTime] = useState(new Date());

  // Multi-PC Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ role: 'standalone', connected: false, matchId: null, peerCount: 0, lastSyncAt: null, error: null });
  const [syncRole, setSyncRole] = useState<'leader' | 'follower'>('leader');
  const [syncMatchId, setSyncMatchId] = useState('');
  const [syncSupabaseUrl, setSyncSupabaseUrl] = useState('');
  const [syncSupabaseKey, setSyncSupabaseKey] = useState('');
  const [syncConnecting, setSyncConnecting] = useState(false);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Sync status SSE
  useEffect(() => {
    fetch('/api/sync').then(r => r.json()).then(setSyncStatus).catch(() => {});
    const es = new EventSource('/api/sync?stream=1');
    es.onmessage = (e) => {
      try { setSyncStatus(JSON.parse(e.data)); } catch {}
    };
    return () => es.close();
  }, []);

  // Fetch roster
  useEffect(() => {
    fetch('/api/roster')
      .then(r => r.json())
      .then((data: RosterInfo) => {
        setRosterInfo(data);
        if (!rosterPathInput && data?.roster_path) setRosterPathInput(data.roster_path);
      })
      .catch(() => {});
  }, []);

  // Poll game data
  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(setGameData).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  // Widget state
  useEffect(() => {
    fetch('/api/widgets').then(r => r.json()).then(setWidgets).catch(() => {});
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = (e) => {
      try { setWidgets(JSON.parse(e.data)); } catch {}
    };
    return () => es.close();
  }, []);

  const syncRoster = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roster_path: rosterPathInput || null }),
      });
      const data = await res.json();
      setRosterInfo(data);
      setSyncMsg(data.roster_loaded ? 'Roster loaded successfully' : 'Failed to load roster');
    } catch {
      setSyncMsg('Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  const startMultiSync = async () => {
    if (!syncMatchId.trim() || !syncSupabaseUrl.trim() || !syncSupabaseKey.trim()) return;
    setSyncConnecting(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          role: syncRole,
          matchId: syncMatchId.trim(),
          supabaseUrl: syncSupabaseUrl.trim(),
          supabaseAnonKey: syncSupabaseKey.trim(),
        }),
      });
      const data = await res.json();
      if (data.status) setSyncStatus(data.status);
    } catch { /* */ }
    finally { setSyncConnecting(false); }
  };

  const stopMultiSync = async () => {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
  };

  const phase = gameData?.phase || 'lobby';
  const totalTeams = gameData?.teams?.length ?? 0;
  const aliveTeams = gameData?.teams?.filter(t => t.liveMemberNum > 0).length ?? 0;
  const totalKills = gameData?.teams?.reduce((s, t) => s + t.kills, 0) ?? 0;
  const activeWidgets = Object.values(widgets).filter(Boolean).length;

  const phaseConfig = {
    lobby: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'LOBBY' },
    ingame: { color: '#ff4e4e', bg: 'rgba(255,78,78,0.1)', label: 'LIVE' },
    finished: { color: '#00ffc3', bg: 'rgba(0,255,195,0.1)', label: 'FINISHED' },
  }[phase] ?? { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: phase.toUpperCase() };

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans), Inter, system-ui, sans-serif', background: 'var(--bg-primary, #0b1120)', minHeight: '100vh', color: 'var(--text-primary, #f1f5f9)' }}>
      {/* Top bar */}
      <header style={{
        borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
        background: 'var(--bg-secondary, #111827)',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #00ffc3, #6d5efc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: '#000',
          }}>LS</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Live Stat</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted, #64748b)' }}>Local Engine</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Game phase badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 999,
            background: phaseConfig.bg,
            border: `1px solid ${phaseConfig.color}33`,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: phaseConfig.color,
              boxShadow: phase === 'ingame' ? `0 0 8px ${phaseConfig.color}` : 'none',
              animation: phase === 'ingame' ? 'pulse 1.5s infinite' : 'none',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: phaseConfig.color, letterSpacing: '0.05em' }}>
              {phaseConfig.label}
            </span>
          </div>

          {/* Sync badge */}
          {syncStatus.role !== 'standalone' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999,
              background: syncStatus.connected ? 'rgba(109,94,252,0.1)' : 'rgba(255,78,78,0.1)',
              border: `1px solid ${syncStatus.connected ? 'rgba(109,94,252,0.3)' : 'rgba(255,78,78,0.3)'}`,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: syncStatus.connected ? '#6d5efc' : '#ff4e4e',
                boxShadow: syncStatus.connected ? '0 0 6px #6d5efc' : 'none',
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: syncStatus.connected ? '#6d5efc' : '#ff4e4e', textTransform: 'uppercase' }}>
                {syncStatus.role} {syncStatus.peerCount > 0 ? `(${syncStatus.peerCount} PCs)` : ''}
              </span>
            </div>
          )}

          {/* Widgets active */}
          <div style={{
            padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: activeWidgets > 0 ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
            color: activeWidgets > 0 ? 'var(--accent, #00ffc3)' : 'var(--text-muted)',
            border: `1px solid ${activeWidgets > 0 ? 'rgba(0,255,195,0.2)' : 'var(--border)'}`,
          }}>
            {activeWidgets} widget{activeWidgets !== 1 ? 's' : ''} active
          </div>

          {/* Clock */}
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
        {/* Status Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Teams', value: totalTeams, sub: rosterInfo?.roster_loaded ? 'from roster' : 'no roster', color: '#6d5efc' },
            { label: 'Alive', value: phase === 'lobby' ? '—' : `${aliveTeams}/${totalTeams}`, sub: phase === 'ingame' ? 'in battle' : phase, color: '#00ffc3' },
            { label: 'Total Kills', value: totalKills, sub: 'this match', color: '#ff4e4e' },
            { label: 'Roster', value: rosterInfo?.roster_loaded ? 'Loaded' : 'None', sub: rosterInfo?.tournament_id ? `T: ${rosterInfo.tournament_id.slice(0, 8)}…` : 'sync below', color: rosterInfo?.roster_loaded ? '#00ffc3' : '#ffb800' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', borderRadius: 14,
              border: '1px solid var(--border)',
              padding: '18px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${stat.color}, transparent)`,
                opacity: 0.6,
              }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: Navigation + Roster */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          {/* Navigation Cards */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Quick Access
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {NAV_CARDS.map((card) => (
                <a
                  key={card.href}
                  href={card.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '16px 20px',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover, #1f2b3d)';
                    (e.currentTarget as HTMLElement).style.borderColor = `${card.tagColor}33`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${card.tagColor}15`,
                    border: `1px solid ${card.tagColor}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: card.tagColor, flexShrink: 0,
                  }}>
                    {card.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{card.title}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                        background: `${card.tagColor}20`, color: card.tagColor,
                        letterSpacing: '0.05em',
                      }}>{card.tag}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{card.desc}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Roster Sync Panel */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Roster Configuration
            </div>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '20px',
            }}>
              {/* Status row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Roster File</span>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                  background: rosterInfo?.roster_loaded ? 'var(--accent-dim)' : 'var(--danger-dim)',
                  color: rosterInfo?.roster_loaded ? 'var(--accent)' : 'var(--danger)',
                }}>
                  {rosterInfo?.roster_loaded ? 'LOADED' : 'NOT LOADED'}
                </span>
              </div>

              {/* Path input */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Path to roster_mapping.json
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={rosterPathInput}
                    onChange={(e) => setRosterPathInput(e.target.value)}
                    placeholder="C:\path\to\roster_mapping.json"
                    style={{
                      flex: 1, background: 'var(--bg-primary)',
                      border: '1px solid var(--border-accent)',
                      color: 'var(--text-secondary)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 12,
                      fontFamily: 'var(--font-geist-mono), monospace',
                      outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,255,195,0.3)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-accent)'; }}
                  />
                  <button
                    onClick={syncRoster}
                    disabled={syncing}
                    style={{
                      background: syncing ? 'var(--accent-dim)' : 'var(--accent, #00ffc3)',
                      border: 'none', borderRadius: 8,
                      padding: '9px 18px', color: '#000',
                      fontSize: 12, fontWeight: 800, cursor: syncing ? 'default' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {syncing ? 'Loading…' : 'Load Roster'}
                  </button>
                </div>
              </div>

              {/* Sync message */}
              {syncMsg && (
                <div style={{
                  fontSize: 11, padding: '8px 12px', borderRadius: 8, marginBottom: 12,
                  background: syncMsg.includes('success') ? 'var(--accent-dim)' : 'var(--danger-dim)',
                  color: syncMsg.includes('success') ? 'var(--accent)' : 'var(--danger)',
                }}>
                  {syncMsg}
                </div>
              )}

              {/* Roster details */}
              {rosterInfo?.roster_loaded && (
                <div style={{
                  background: 'var(--bg-primary)', borderRadius: 10,
                  border: '1px solid var(--border)', padding: 14,
                }}>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Teams: </span>
                      <span style={{ fontWeight: 700 }}>{rosterInfo.team_count}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Players: </span>
                      <span style={{ fontWeight: 700 }}>{rosterInfo.player_count}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Match: </span>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11 }}>
                        {rosterInfo.match_id ? rosterInfo.match_id.slice(0, 8) + '…' : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Team chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(rosterInfo.teams_preview ?? []).slice(0, 16).map((t) => (
                      <div key={t.slot_number} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '4px 8px', fontSize: 11,
                      }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: 9 }}>
                          {String(t.slot_number).padStart(2, '0')}
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {t.short_name || t.name}
                        </span>
                      </div>
                    ))}
                    {(rosterInfo.teams_preview?.length ?? 0) > 16 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px' }}>
                        +{(rosterInfo.teams_preview?.length ?? 0) - 16} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {rosterInfo?.error && (
                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 8 }}>
                  {rosterInfo.error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Multi-PC Sync Panel */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Multi-PC Sync
          </div>
          <div style={{
            background: 'var(--bg-card)',
            border: `1px solid ${syncStatus.connected ? 'rgba(109,94,252,0.3)' : 'var(--border)'}`,
            borderRadius: 14,
            padding: '20px',
          }}>
            {syncStatus.role === 'standalone' || !syncStatus.connected ? (
              <>
                {/* Role selector */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {(['leader', 'follower'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setSyncRole(r)}
                      style={{
                        flex: 1, padding: '12px 16px',
                        background: syncRole === r ? (r === 'leader' ? 'rgba(255,78,78,0.1)' : 'rgba(0,255,195,0.1)') : 'var(--bg-primary)',
                        border: `2px solid ${syncRole === r ? (r === 'leader' ? 'rgba(255,78,78,0.4)' : 'rgba(0,255,195,0.4)') : 'var(--border)'}`,
                        borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%',
                          border: `2px solid ${syncRole === r ? (r === 'leader' ? '#ff4e4e' : '#00ffc3') : 'rgba(255,255,255,0.2)'}`,
                          background: syncRole === r ? (r === 'leader' ? '#ff4e4e' : '#00ffc3') : 'transparent',
                        }} />
                        <span style={{
                          fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                          color: syncRole === r ? '#fff' : 'var(--text-muted)',
                        }}>
                          {r}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {r === 'leader'
                          ? 'This PC receives PCOB data and broadcasts to others'
                          : 'This PC receives game state from the Leader PC'}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Connection fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Supabase URL</label>
                    <input
                      value={syncSupabaseUrl}
                      onChange={e => setSyncSupabaseUrl(e.target.value)}
                      placeholder="https://xxx.supabase.co"
                      style={{
                        width: '100%', background: 'var(--bg-primary)',
                        border: '1px solid var(--border-accent)', color: 'var(--text-secondary)',
                        borderRadius: 8, padding: '8px 10px', fontSize: 11,
                        fontFamily: 'var(--font-geist-mono), monospace', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Anon Key</label>
                    <input
                      value={syncSupabaseKey}
                      onChange={e => setSyncSupabaseKey(e.target.value)}
                      placeholder="eyJ..."
                      type="password"
                      style={{
                        width: '100%', background: 'var(--bg-primary)',
                        border: '1px solid var(--border-accent)', color: 'var(--text-secondary)',
                        borderRadius: 8, padding: '8px 10px', fontSize: 11,
                        fontFamily: 'var(--font-geist-mono), monospace', outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Match ID (same on all PCs)</label>
                    <input
                      value={syncMatchId}
                      onChange={e => setSyncMatchId(e.target.value)}
                      placeholder="match-abc123"
                      style={{
                        width: '100%', background: 'var(--bg-primary)',
                        border: '1px solid var(--border-accent)', color: 'var(--text-secondary)',
                        borderRadius: 8, padding: '8px 10px', fontSize: 11,
                        fontFamily: 'var(--font-geist-mono), monospace', outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    onClick={startMultiSync}
                    disabled={syncConnecting || !syncMatchId.trim() || !syncSupabaseUrl.trim() || !syncSupabaseKey.trim()}
                    style={{
                      background: syncConnecting ? 'rgba(109,94,252,0.2)' : '#6d5efc',
                      border: 'none', borderRadius: 8,
                      padding: '9px 20px', color: '#fff',
                      fontSize: 12, fontWeight: 800, cursor: syncConnecting ? 'default' : 'pointer',
                      whiteSpace: 'nowrap', opacity: (!syncMatchId.trim() || !syncSupabaseUrl.trim() || !syncSupabaseKey.trim()) ? 0.4 : 1,
                    }}
                  >
                    {syncConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>

                {syncStatus.error && (
                  <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 10 }}>
                    {syncStatus.error}
                  </div>
                )}
              </>
            ) : (
              /* Connected state */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: syncStatus.role === 'leader' ? 'rgba(255,78,78,0.15)' : 'rgba(0,255,195,0.15)',
                      border: `1px solid ${syncStatus.role === 'leader' ? 'rgba(255,78,78,0.3)' : 'rgba(0,255,195,0.3)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>
                      {syncStatus.role === 'leader' ? '👑' : '📡'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>{syncStatus.role}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {syncStatus.role === 'leader' ? 'Broadcasting game state to followers' : 'Receiving game state from leader'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={stopMultiSync}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,78,78,0.3)',
                      borderRadius: 8, padding: '7px 16px',
                      color: '#ff4e4e', fontSize: 11, fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Disconnect
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div style={{
                    background: 'var(--bg-primary)', borderRadius: 10,
                    border: '1px solid var(--border)', padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>MATCH ID</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-geist-mono), monospace' }}>
                      {syncStatus.matchId?.slice(0, 12)}{(syncStatus.matchId?.length ?? 0) > 12 ? '...' : ''}
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--bg-primary)', borderRadius: 10,
                    border: '1px solid var(--border)', padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>CONNECTED PCs</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#6d5efc' }}>
                      {syncStatus.peerCount}
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--bg-primary)', borderRadius: 10,
                    border: '1px solid var(--border)', padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>LAST SYNC</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-geist-mono), monospace' }}>
                      {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleTimeString() : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Match Summary */}
        {phase !== 'lobby' && gameData && gameData.teams.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Live Match — Top Teams
            </div>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              overflow: 'hidden',
            }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 100px',
                padding: '10px 16px', fontSize: 10, fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
                borderBottom: '1px solid var(--border)',
              }}>
                <span>#</span>
                <span>Team</span>
                <span style={{ textAlign: 'center' }}>Alive</span>
                <span style={{ textAlign: 'center' }}>Kills</span>
                <span style={{ textAlign: 'right' }}>Points</span>
              </div>

              {/* Top teams */}
              {gameData.teams.slice(0, 8).map((team, i) => {
                const name = team.displayName || team.teamName;
                const color = team.brandColor || '#fff';
                const rank = i + 1;
                return (
                  <div key={name} style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 100px',
                    padding: '10px 16px', alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: 800,
                      color: rank === 1 ? '#00ffc3' : rank === 2 ? '#ff4e4e' : rank === 3 ? '#ffb800' : 'var(--text-muted)',
                    }}>
                      {rank}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 3, height: 20, borderRadius: 2, background: color,
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: team.liveMemberNum > 0 ? 'var(--accent)' : 'var(--danger)',
                      }}>
                        {team.liveMemberNum}/4
                      </span>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700 }}>
                      {team.kills}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 800, color: '#fff' }}>
                      {team.totalPoints}
                    </div>
                  </div>
                );
              })}

              {gameData.teams.length > 8 && (
                <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                  +{gameData.teams.length - 8} more teams
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spotlight + Hotkeys Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Spotlight / MVP */}
          {gameData?.spotlight && gameData.spotlight.kills > 0 && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '20px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Current MVP
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(0,255,195,0.15), rgba(109,94,252,0.15))',
                  border: '1px solid rgba(0,255,195,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 900, color: '#00ffc3',
                }}>
                  {gameData.spotlight.kills}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{gameData.spotlight.playerName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{gameData.spotlight.teamName}</div>
                </div>
                <div style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 800,
                  padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(255,78,78,0.15)', color: '#ff4e4e',
                }}>
                  {gameData.spotlight.kills} KILLS
                </div>
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Quick Reference
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              {[
                { label: 'Master Overlay', value: 'localhost:3001/overlay/master' },
                { label: 'Controller', value: 'localhost:3001/controller' },
                { label: 'Kill Feed (F2)', value: 'Always-on overlay' },
                { label: 'Player Card (F3)', value: 'Always-on overlay' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-geist-mono), monospace' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, padding: '16px 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Live Stat Local Engine — Port 3001
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
            <a href="/controller" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Controller</a>
            <a href="/overlay/gallery" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Gallery</a>
            <a href="/overlay/master" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Master Overlay</a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
