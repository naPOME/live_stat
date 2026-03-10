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

const GROUP_LABELS: Record<string, string> = {
  live: 'LIVE WIDGETS',
  post: 'POST-MATCH',
  static: 'STATIC / PRE-MATCH',
};

const GROUP_COLORS: Record<string, string> = {
  live: '#ff4e4e',
  post: '#00ffc3',
  static: '#8b8da6',
};

interface GameData {
  phase?: string;
  teams: { teamName: string; displayName?: string; kills: number; totalPoints: number; liveMemberNum: number }[];
  players?: { playerName: string; displayName?: string; kills: number }[];
}

export default function ControllerPage() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [gameData, setGameData] = useState<GameData | null>(null);

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

  // Poll game data for status display
  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(setGameData).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  // Toggle widget
  const toggleWidget = useCallback(async (key: string) => {
    const res = await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', key }),
    });
    const data = await res.json();
    setVisibility(data);
  }, []);

  // Show only one widget (+ always-on)
  const showOnly = useCallback(async (key: string) => {
    const res = await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'showOnly', key }),
    });
    setVisibility(await res.json());
  }, []);

  // Hide all
  const hideAll = useCallback(async () => {
    const res = await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hideAll' }),
    });
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
      // Escape = hide all
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

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#0e1621', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Widget Controller</h1>
            <p style={{ color: '#8b8da6', fontSize: 12, margin: '4px 0 0' }}>
              Toggle overlays with hotkeys (F1-F12) or click. ESC = hide all.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Game status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#1a2a3a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '8px 14px',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: phase === 'ingame' ? '#ff4e4e' : phase === 'finished' ? '#00ffc3' : '#8b8da6',
                boxShadow: phase === 'ingame' ? '0 0 8px #ff4e4e' : 'none',
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {phase}
              </span>
              {phase === 'ingame' && (
                <span style={{ fontSize: 11, color: '#8b8da6' }}>
                  {aliveTeams}/{teamCount} alive
                </span>
              )}
            </div>

            {/* Active count */}
            <div style={{
              background: '#00ffc322', border: '1px solid #00ffc333',
              borderRadius: 10, padding: '8px 14px',
              fontSize: 12, fontWeight: 700, color: '#00ffc3',
            }}>
              {activeCount} active
            </div>

            {/* Hide all */}
            <button
              onClick={hideAll}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '8px 16px', color: '#8b8da6',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Hide All (ESC)
            </button>
          </div>
        </div>

        {/* Widget Groups */}
        {['live', 'post', 'static'].map(group => (
          <div key={group} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.15em',
              color: GROUP_COLORS[group], marginBottom: 10, textTransform: 'uppercase',
            }}>
              {GROUP_LABELS[group]}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {WIDGETS.filter(w => w.group === group).map(widget => {
                const active = visibility[widget.key] ?? false;
                return (
                  <button
                    key={widget.key}
                    onClick={() => toggleWidget(widget.key)}
                    onDoubleClick={() => showOnly(widget.key)}
                    style={{
                      background: active ? `${GROUP_COLORS[group]}15` : '#1a2a3a',
                      border: `2px solid ${active ? GROUP_COLORS[group] + '55' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 14,
                      padding: '16px 14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Active indicator */}
                    {active && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                        background: GROUP_COLORS[group],
                      }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      {/* Toggle dot */}
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: active ? GROUP_COLORS[group] : 'rgba(255,255,255,0.1)',
                        boxShadow: active ? `0 0 10px ${GROUP_COLORS[group]}66` : 'none',
                        transition: 'all 0.15s',
                      }} />
                      {/* Hotkey badge */}
                      <span style={{
                        fontSize: 10, fontWeight: 800, color: active ? '#fff' : '#8b8da6',
                        background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                        padding: '2px 6px', borderRadius: 5,
                      }}>
                        {widget.hotkey}
                      </span>
                    </div>

                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: active ? '#fff' : '#8b8da6',
                    }}>
                      {widget.label}
                    </div>

                    <div style={{
                      fontSize: 10, color: active ? GROUP_COLORS[group] : '#8b8da655',
                      marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {active ? 'ON' : 'OFF'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quick presets */}
        <div style={{
          background: '#1a2a3a', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: 16, marginTop: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#8b8da6', letterSpacing: '0.15em', marginBottom: 10 }}>
            QUICK PRESETS
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Match Live', desc: 'Leaderboard + Feed + Card', keys: ['leaderboard', 'killfeed', 'playercard', 'elimination'] },
              { label: 'Post Match', desc: 'Results + Fraggers + MVP', keys: ['results', 'fraggers', 'mvp'] },
              { label: 'WWCD', desc: 'Winner screen', keys: ['wwcd'] },
              { label: 'Pre-Match', desc: 'Team List + Schedule + Info', keys: ['teamlist', 'schedule', 'matchinfo'] },
              { label: 'Point Table', desc: 'Show points only', keys: ['pointtable'] },
              { label: 'Clean', desc: 'Feed + Card only', keys: ['killfeed', 'playercard', 'elimination'] },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={async () => {
                  // First hide all, then enable preset keys
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
                }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '10px 16px',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{preset.label}</div>
                <div style={{ fontSize: 10, color: '#8b8da6', marginTop: 2 }}>{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: 16, fontSize: 11, color: '#8b8da655', textAlign: 'center' }}>
          Master overlay: <code style={{ color: '#00ffc3', background: '#00ffc311', padding: '2px 6px', borderRadius: 4 }}>
            http://localhost:3000/overlay/master
          </code>
          {' '}— single OBS source that composites all active widgets
        </div>
      </div>
    </div>
  );
}
