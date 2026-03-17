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

const GROUPS: { id: string; label: string; color: string }[] = [
  { id: 'live',   label: 'LIVE',       color: 'var(--red)' },
  { id: 'post',   label: 'POST-MATCH', color: 'var(--accent)' },
  { id: 'static', label: 'STATIC',     color: 'var(--purple)' },
];

const PRESETS = [
  { label: 'Match Live', keys: ['leaderboard', 'killfeed', 'playercard', 'elimination'] },
  { label: 'Post Match', keys: ['results', 'fraggers', 'mvp'] },
  { label: 'WWCD',       keys: ['wwcd'] },
  { label: 'Pre-Match',  keys: ['teamlist', 'schedule', 'matchinfo'] },
  { label: 'Points',     keys: ['pointtable'] },
  { label: 'Clean',      keys: ['killfeed', 'playercard', 'elimination'] },
];

interface SyncStatus {
  role: 'leader' | 'follower' | 'standalone';
  connected: boolean;
  peerCount: number;
}

export default function ControllerPage() {
  const [vis, setVis] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState('lobby');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ role: 'standalone', connected: false, peerCount: 0 });

  useEffect(() => {
    fetch('/api/widgets').then(r => r.json()).then(setVis).catch(() => {});
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = e => { try { setVis(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  useEffect(() => {
    fetch('/api/sync').then(r => r.json()).then(setSyncStatus).catch(() => {});
    const es = new EventSource('/api/sync?stream=1');
    es.onmessage = e => { try { setSyncStatus(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(d => setPhase(d?.phase || 'lobby')).catch(() => {});
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  const toggle = useCallback(async (key: string) => {
    setActivePreset(null);
    setVis(prev => ({ ...prev, [key]: !prev[key] })); // optimistic
    const res = await fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', key }) });
    setVis(await res.json());
  }, []);

  const showOnly = useCallback(async (key: string) => {
    setActivePreset(null);
    const res = await fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'showOnly', key }) });
    setVis(await res.json());
  }, []);

  const hideAll = useCallback(async () => {
    setActivePreset(null);
    setVis(prev => Object.fromEntries(Object.keys(prev).map(k => [k, false]))); // optimistic
    const res = await fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hideAll' }) });
    setVis(await res.json());
  }, []);

  const applyPreset = useCallback(async (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.label);
    // Optimistic: turn off all, turn on preset keys
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
      {/* ── Page header ──────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>Controller</h1>
          <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Toggle overlays with hotkeys during broadcast</p>
        </div>
        <div className="flex items-center gap-10">
          {syncStatus.connected && (
            <div className="pill" style={{ color: 'var(--purple)', borderColor: 'rgba(124,106,252,0.25)', background: 'rgba(124,106,252,0.08)' }}>
              <div className="pill-dot" style={{ background: 'var(--purple)' }} />
              {syncStatus.role.toUpperCase()} {syncStatus.peerCount > 0 && `· ${syncStatus.peerCount}`}
            </div>
          )}
          <div className="pill" style={{ color: phaseColor, borderColor: `color-mix(in srgb, ${phaseColor} 25%, transparent)`, background: `color-mix(in srgb, ${phaseColor} 8%, transparent)` }}>
            <div className={`pill-dot${phase === 'ingame' ? ' pulse' : ''}`} style={{ background: phaseColor }} />
            {phase === 'ingame' ? 'LIVE' : phase.toUpperCase()}
          </div>
          <div className="pill" style={{ color: activeCount > 0 ? 'var(--accent)' : 'var(--text-faint)', borderColor: activeCount > 0 ? 'rgba(0,255,195,0.2)' : 'var(--border)', background: activeCount > 0 ? 'rgba(0,255,195,0.06)' : 'transparent' }}>
            {activeCount} active
          </div>
          <button className="btn" onClick={hideAll}>
            Hide All <kbd>ESC</kbd>
          </button>
        </div>
      </div>

      <div>
        {/* ── Presets ──────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div className="section-label">Presets</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`preset-btn${activePreset === p.label ? ' active' : ''}`}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: activePreset === p.label ? 'var(--accent)' : 'var(--text)' }}>{p.label}</div>
                <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2 }}>{p.keys.length} widget{p.keys.length !== 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Widget groups ────────────────────── */}
        {GROUPS.map(g => (
          <div key={g.id} style={{ marginBottom: 24 }}>
            <div className="flex items-center gap-8" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: g.color }}>{g.label}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {WIDGETS.filter(w => w.group === g.id).map(w => {
                const on = vis[w.key] ?? false;
                return (
                  <button
                    key={w.key}
                    onClick={() => toggle(w.key)}
                    onDoubleClick={() => showOnly(w.key)}
                    className={`widget-card${on ? ' active' : ''}`}
                    style={{ '--group-color': g.color } as React.CSSProperties}
                  >
                    <div className="flex items-center" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                      <div className={`toggle${on ? ' on' : ''}`}>
                        <div className="toggle-knob" />
                      </div>
                      <kbd>{w.hotkey}</kbd>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: on ? 'var(--text)' : 'var(--text-dim)' }}>
                      {w.label}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 3, color: on ? g.color : 'rgba(255,255,255,0.1)' }}>
                      {on ? 'ON AIR' : 'OFF'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── Footer ───────────────────────────── */}
        <div className="flex items-center" style={{ justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-faint)' }}>
          <span>Double-click to solo · Hotkeys work when focused</span>
        </div>
      </div>
    </div>
  );
}
