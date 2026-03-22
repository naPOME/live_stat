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
  { key: 'matchinfo',      label: 'Match Info',        hotkey: 'F11', group: 'static' },
  { key: 'schedule',       label: 'Schedule',          hotkey: 'F12', group: 'static' },
  { key: 'sponsor_overlay', label: 'Sponsor Bar',      hotkey: '',    group: 'static' },
];

const GROUPS = [
  { id: 'live',   label: 'LIVE',  color: 'var(--red)' },
  { id: 'post',   label: 'POST',  color: 'var(--accent)' },
  { id: 'static', label: 'INFO',  color: 'var(--purple)' },
] as const;

const PRESETS = [
  { label: 'Match Live', icon: '\u25B6', keys: ['leaderboard', 'killfeed', 'playercard', 'elimination'] },
  { label: 'Post Match', icon: '\u2605', keys: ['results', 'fraggers', 'mvp'] },
  { label: 'WWCD',       icon: '\u2714', keys: ['wwcd'] },
  { label: 'Pre-Match',  icon: '\u25A0', keys: ['teamlist', 'schedule', 'matchinfo'] },
  { label: 'Clean',      icon: '\u25CB', keys: ['killfeed', 'playercard', 'elimination'] },
];

export default function ControllerPage() {
  const [vis, setVis] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState('lobby');

  useEffect(() => {
    fetch('/api/widgets').then(r => r.json()).then(setVis).catch(() => {});
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = e => { try { setVis(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(d => setPhase(d?.phase || 'lobby')).catch(() => {});
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  const toggle = useCallback(async (key: string) => {
    setVis(prev => ({ ...prev, [key]: !prev[key] }));
    const res = await fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', key }) });
    setVis(await res.json());
  }, []);

  const showOnly = useCallback(async (key: string) => {
    const res = await fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'showOnly', key }) });
    setVis(await res.json());
  }, []);

  const hideAll = useCallback(async () => {
    setVis(prev => Object.fromEntries(Object.keys(prev).map(k => [k, false])));
    const res = await fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hideAll' }) });
    setVis(await res.json());
  }, []);

  const applyPreset = useCallback(async (preset: typeof PRESETS[0]) => {
    setVis(prev => {
      const next: Record<string, boolean> = {};
      for (const k of Object.keys(prev)) next[k] = false;
      for (const k of preset.keys) next[k] = true;
      return next;
    });
    await fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hideAll' }) });
    for (const key of preset.keys) {
      await fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', key, visible: true }) });
    }
    const res = await fetch('/api/widgets');
    setVis(await res.json());
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const w = WIDGETS.find(w => w.hotkey === e.key);
      if (w) { e.preventDefault(); toggle(w.key); }
      if (e.key === 'Escape') { e.preventDefault(); hideAll(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggle, hideAll]);

  const activeCount = Object.values(vis).filter(Boolean).length;
  const phaseColor = phase === 'ingame' ? 'var(--red)' : phase === 'finished' ? 'var(--accent)' : 'var(--text-faint)';

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Controller</h1>
        <div className="flex items-center gap-8">
          <div className="pill" style={{ color: phaseColor, borderColor: `color-mix(in srgb, ${phaseColor} 25%, transparent)`, background: `color-mix(in srgb, ${phaseColor} 8%, transparent)` }}>
            <div className={`pill-dot${phase === 'ingame' ? ' pulse' : ''}`} style={{ background: phaseColor }} />
            {phase === 'ingame' ? 'LIVE' : phase.toUpperCase()}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: activeCount > 0 ? 'var(--accent)' : 'var(--text-faint)' }}>
            {activeCount} active
          </span>
          <button className="btn" onClick={hideAll} style={{ fontSize: 11, padding: '4px 10px' }}>
            Hide All <kbd style={{ marginLeft: 4, fontSize: 9, opacity: 0.5 }}>ESC</kbd>
          </button>
        </div>
      </div>

      {/* Presets — compact row */}
      <div className="flex gap-4" style={{ marginBottom: 16 }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p)} className="btn" style={{
            fontSize: 11, padding: '5px 12px', flex: 1,
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Widget groups */}
      {GROUPS.map(g => {
        const groupWidgets = WIDGETS.filter(w => w.group === g.id);
        return (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: g.color, marginBottom: 6 }}>{g.label}</div>
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {groupWidgets.map((w, i) => {
                const on = vis[w.key] ?? false;
                return (
                  <button
                    key={w.key}
                    onClick={() => toggle(w.key)}
                    onDoubleClick={() => showOnly(w.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '8px 12px', cursor: 'pointer',
                      background: on ? `color-mix(in srgb, ${g.color} 6%, transparent)` : 'transparent',
                      borderBottom: i < groupWidgets.length - 1 ? '1px solid var(--border)' : 'none',
                      border: 'none', borderBottomStyle: i < groupWidgets.length - 1 ? 'solid' : 'none',
                      borderBottomWidth: 1, borderBottomColor: 'var(--border)',
                      color: 'inherit', textAlign: 'left', outline: 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; else e.currentTarget.style.background = `color-mix(in srgb, ${g.color} 6%, transparent)`; }}
                  >
                    {/* Toggle dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: on ? g.color : 'rgba(255,255,255,0.08)',
                      boxShadow: on ? `0 0 8px ${g.color}` : 'none',
                      transition: 'all 0.2s',
                    }} />

                    {/* Label */}
                    <span style={{ flex: 1, fontSize: 12, fontWeight: on ? 700 : 500, color: on ? 'var(--text)' : 'var(--text-dim)' }}>
                      {w.label}
                    </span>

                    {/* Hotkey */}
                    <kbd style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                      color: 'var(--text-faint)', fontFamily: 'var(--mono)',
                    }}>
                      {w.hotkey}
                    </kbd>

                    {/* Status */}
                    {on && (
                      <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.06em', color: g.color, textTransform: 'uppercase' }}>ON</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-faint)' }}>
        Double-click to solo a widget
      </div>
    </div>
  );
}
