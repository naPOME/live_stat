'use client';

import { useEffect, useState, useCallback } from 'react';

interface WidgetDef {
  key: string;
  label: string;
  hotkey: string;
  group: 'live' | 'post' | 'static';
}

const WIDGETS: WidgetDef[] = [
  { key: 'leaderboard',  label: 'Match Ranking',     hotkey: 'F1', group: 'live' },
  { key: 'killfeed',     label: 'Kill Feed',         hotkey: 'F2', group: 'live' },
  { key: 'playercard',   label: 'Player Card',       hotkey: 'F3', group: 'live' },
  { key: 'elimination',  label: 'Elimination Alert', hotkey: 'F4', group: 'live' },
  { key: 'wwcd',         label: 'WWCD',              hotkey: 'F5', group: 'post' },
  { key: 'fraggers',     label: 'Top Fraggers',      hotkey: 'F6', group: 'post' },
  { key: 'results',      label: 'After Match Score', hotkey: 'F7', group: 'post' },
  { key: 'mvp',          label: 'MVP',               hotkey: 'F8', group: 'post' },
  { key: 'pointtable',   label: 'Point Table',       hotkey: 'F9', group: 'static' },
  { key: 'teamlist',     label: 'Team List',         hotkey: 'F10', group: 'static' },
  { key: 'matchinfo',    label: 'Match Info',        hotkey: 'F11', group: 'static' },
  { key: 'schedule',     label: 'Schedule',          hotkey: 'F12', group: 'static' },
];

const GROUP_META: Record<string, { label: string; color: string; desc: string }> = {
  live:   { label: 'LIVE WIDGETS',         color: '#ff4e4e', desc: 'Active during gameplay' },
  post:   { label: 'POST-MATCH',           color: '#00ffc3', desc: 'Show after match ends' },
  static: { label: 'STATIC / PRE-MATCH',   color: '#6d5efc', desc: 'Info overlays' },
};

const PRESETS = [
  { label: 'Match Live', desc: 'Board + Feed + Card', keys: ['leaderboard', 'killfeed', 'playercard', 'elimination'], icon: '▶' },
  { label: 'Post Match', desc: 'Results + Fraggers + MVP', keys: ['results', 'fraggers', 'mvp'], icon: '◼' },
  { label: 'WWCD', desc: 'Winner screen', keys: ['wwcd'], icon: '★' },
  { label: 'Pre-Match', desc: 'Teams + Schedule + Info', keys: ['teamlist', 'schedule', 'matchinfo'], icon: '◈' },
  { label: 'Point Table', desc: 'Show points only', keys: ['pointtable'], icon: '▦' },
  { label: 'Clean', desc: 'Feed + Card only', keys: ['killfeed', 'playercard', 'elimination'], icon: '○' },
];

interface GameData {
  phase?: string;
  teams: { teamName: string; displayName?: string; kills: number; totalPoints: number; liveMemberNum: number }[];
}

interface SyncStatus {
  role: 'leader' | 'follower' | 'standalone';
  connected: boolean;
  peerCount: number;
}

export default function ControllerPage() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ role: 'standalone', connected: false, peerCount: 0 });

  // Fetch initial state
  useEffect(() => {
    fetch('/api/widgets').then(r => r.json()).then(setVisibility).catch(() => {});
  }, []);

  // SSE for real-time widget state changes
  useEffect(() => {
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = (e) => {
      try { setVisibility(JSON.parse(e.data)); } catch {}
    };
    return () => es.close();
  }, []);

  // Sync status
  useEffect(() => {
    fetch('/api/sync').then(r => r.json()).then(setSyncStatus).catch(() => {});
    const es = new EventSource('/api/sync?stream=1');
    es.onmessage = (e) => {
      try { setSyncStatus(JSON.parse(e.data)); } catch {}
    };
    return () => es.close();
  }, []);

  // Poll game data
  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(setGameData).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  const toggleWidget = useCallback(async (key: string) => {
    setActivePreset(null);
    const res = await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', key }),
    });
    setVisibility(await res.json());
  }, []);

  const showOnly = useCallback(async (key: string) => {
    setActivePreset(null);
    const res = await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'showOnly', key }),
    });
    setVisibility(await res.json());
  }, []);

  const hideAll = useCallback(async () => {
    setActivePreset(null);
    const res = await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hideAll' }),
    });
    setVisibility(await res.json());
  }, []);

  const applyPreset = useCallback(async (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.label);
    await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hideAll' }),
    });
    for (const key of preset.keys) {
      await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', key, visible: true }),
      });
    }
    const res = await fetch('/api/widgets');
    setVisibility(await res.json());
  }, []);

  // Keyboard hotkeys
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const widget = WIDGETS.find(w => w.hotkey === e.key);
      if (widget) {
        e.preventDefault();
        toggleWidget(widget.key);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        hideAll();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleWidget, hideAll]);

  const activeCount = Object.values(visibility).filter(Boolean).length;
  const phase = gameData?.phase || 'lobby';
  const teamCount = gameData?.teams?.length ?? 0;
  const aliveTeams = gameData?.teams?.filter(t => t.liveMemberNum > 0).length ?? 0;

  const phaseConfig = {
    lobby: { color: '#64748b', label: 'LOBBY' },
    ingame: { color: '#ff4e4e', label: 'LIVE' },
    finished: { color: '#00ffc3', label: 'FINISHED' },
  }[phase] ?? { color: '#64748b', label: phase.toUpperCase() };

  return (
    <div style={{
      fontFamily: 'var(--font-geist-sans), Inter, system-ui, sans-serif',
      background: 'var(--bg-primary, #0b1120)',
      minHeight: '100vh',
      color: 'var(--text-primary, #f1f5f9)',
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
        background: 'var(--bg-secondary, #111827)',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'linear-gradient(135deg, #00ffc3, #6d5efc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 900, color: '#000',
            }}>LS</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Live Stat</span>
          </a>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.2 }}>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Widget Controller</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Sync badge */}
          {syncStatus.role !== 'standalone' && syncStatus.connected && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 999,
              background: 'rgba(109,94,252,0.1)',
              border: '1px solid rgba(109,94,252,0.3)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6d5efc', boxShadow: '0 0 6px #6d5efc' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6d5efc', textTransform: 'uppercase' }}>
                {syncStatus.role} ({syncStatus.peerCount} PCs)
              </span>
            </div>
          )}

          {/* Game status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 999,
            background: `${phaseConfig.color}15`,
            border: `1px solid ${phaseConfig.color}33`,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: phaseConfig.color,
              boxShadow: phase === 'ingame' ? `0 0 8px ${phaseConfig.color}` : 'none',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: phaseConfig.color }}>
              {phaseConfig.label}
            </span>
            {phase === 'ingame' && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {aliveTeams}/{teamCount}
              </span>
            )}
          </div>

          {/* Active count */}
          <div style={{
            padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: activeCount > 0 ? 'rgba(0,255,195,0.1)' : 'rgba(255,255,255,0.04)',
            color: activeCount > 0 ? '#00ffc3' : 'var(--text-muted)',
            border: `1px solid ${activeCount > 0 ? 'rgba(0,255,195,0.2)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            {activeCount} active
          </div>

          {/* Hide all */}
          <button
            onClick={hideAll}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 14px',
              color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Hide All
            <kbd style={{
              marginLeft: 6, fontSize: 9, padding: '1px 4px',
              borderRadius: 3, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>ESC</kbd>
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px' }}>
        {/* Quick Presets */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
          }}>
            Quick Presets
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {PRESETS.map(preset => {
              const isActive = activePreset === preset.label;
              return (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  style={{
                    background: isActive ? 'rgba(0,255,195,0.1)' : 'var(--bg-card, #1a2332)',
                    border: `1px solid ${isActive ? 'rgba(0,255,195,0.3)' : 'var(--border, rgba(255,255,255,0.06))'}`,
                    borderRadius: 12, padding: '14px 12px',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 6, opacity: 0.5 }}>{preset.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#00ffc3' : '#fff', marginBottom: 2 }}>
                    {preset.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{preset.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Widget Groups */}
        {(['live', 'post', 'static'] as const).map(group => {
          const meta = GROUP_META[group];
          return (
            <div key={group} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                  color: meta.color, textTransform: 'uppercase',
                }}>
                  {meta.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{meta.desc}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {WIDGETS.filter(w => w.group === group).map(widget => {
                  const active = visibility[widget.key] ?? false;
                  return (
                    <button
                      key={widget.key}
                      onClick={() => toggleWidget(widget.key)}
                      onDoubleClick={() => showOnly(widget.key)}
                      title={`Click to toggle, double-click to solo. Hotkey: ${widget.hotkey}`}
                      style={{
                        background: active ? `${meta.color}10` : 'var(--bg-card, #1a2332)',
                        border: `2px solid ${active ? meta.color + '44' : 'var(--border, rgba(255,255,255,0.06))'}`,
                        borderRadius: 14,
                        padding: '16px 16px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Active top bar */}
                      {active && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                          background: meta.color,
                        }} />
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        {/* Toggle indicator */}
                        <div style={{
                          width: 32, height: 18, borderRadius: 9,
                          background: active ? meta.color : 'rgba(255,255,255,0.08)',
                          position: 'relative',
                          transition: 'all 0.2s',
                        }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%',
                            background: active ? '#fff' : 'rgba(255,255,255,0.3)',
                            position: 'absolute', top: 2,
                            left: active ? 16 : 2,
                            transition: 'all 0.2s',
                            boxShadow: active ? `0 0 6px ${meta.color}66` : 'none',
                          }} />
                        </div>

                        {/* Hotkey badge */}
                        <kbd style={{
                          fontSize: 10, fontWeight: 700,
                          color: active ? '#fff' : 'var(--text-muted)',
                          background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                          padding: '2px 7px', borderRadius: 5,
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontFamily: 'var(--font-geist-mono), monospace',
                        }}>
                          {widget.hotkey}
                        </kbd>
                      </div>

                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: active ? '#fff' : 'var(--text-secondary, #94a3b8)',
                      }}>
                        {widget.label}
                      </div>

                      <div style={{
                        fontSize: 10, marginTop: 3, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: active ? meta.color : 'rgba(255,255,255,0.15)',
                      }}>
                        {active ? 'ON AIR' : 'OFF'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div style={{
          marginTop: 8, padding: '14px 0',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Tip: Double-click a widget to solo it. Hotkeys work when this page is focused.
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
            <a href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</a>
            <a href="/overlay/gallery" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Gallery</a>
          </div>
        </div>
      </div>
    </div>
  );
}
