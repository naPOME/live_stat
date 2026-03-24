'use client';

import { useEffect, useState, useCallback } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';

const WIDGETS = [
  { key: 'leaderboard',  label: 'Ranking',     hotkey: 'F1', group: 'live' },
  { key: 'killfeed',     label: 'Kill Feed',   hotkey: 'F2', group: 'live' },
  { key: 'playercard',   label: 'Player',      hotkey: 'F3', group: 'live' },
  { key: 'elimination',  label: 'Elim Alert',  hotkey: 'F4', group: 'live' },
  { key: 'wwcd',         label: 'WWCD',        hotkey: 'F5', group: 'post' },
  { key: 'fraggers',     label: 'Fraggers',    hotkey: 'F6', group: 'post' },
  { key: 'results',      label: 'Results',     hotkey: 'F7', group: 'post' },
  { key: 'mvp',          label: 'MVP',         hotkey: 'F8', group: 'post' },
  { key: 'pointtable',   label: 'Points',      hotkey: 'F9', group: 'info' },
  { key: 'teamlist',     label: 'Teams',       hotkey: 'F10', group: 'info' },
  { key: 'matchinfo',    label: 'Match Info',  hotkey: 'F11', group: 'info' },
  { key: 'schedule',     label: 'Schedule',    hotkey: 'F12', group: 'info' },
];

const GROUPS: { id: string; label: string }[] = [
  { id: 'live',  label: 'Live' },
  { id: 'post',  label: 'Post-Match' },
  { id: 'info',  label: 'Info' },
];

export default function ControllerPage() {
  const [vis, setVis] = useState<Record<string, boolean>>({});
  const [themeIdx, setThemeIdx] = useState(0);

  useEffect(() => {
    fetch('/api/widgets').then(r => r.json()).then(setVis).catch(() => {});
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = e => { try { setVis(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(d => {
      if (typeof d.activeThemeIdx === 'number') setThemeIdx(d.activeThemeIdx);
    }).catch(() => {});
    const es = new EventSource('/api/theme?stream=1');
    es.onmessage = e => {
      try { const d = JSON.parse(e.data); if (typeof d.activeThemeIdx === 'number') setThemeIdx(d.activeThemeIdx); } catch {}
    };
    return () => es.close();
  }, []);

  const toggle = useCallback(async (key: string) => {
    setVis(prev => ({ ...prev, [key]: !prev[key] }));
    fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', key }) })
      .then(r => r.json()).then(setVis);
  }, []);

  const hideAll = useCallback(async () => {
    setVis(prev => Object.fromEntries(Object.keys(prev).map(k => [k, false])));
    fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hideAll' }) })
      .then(r => r.json()).then(setVis);
  }, []);

  const switchTheme = useCallback(async (idx: number) => {
    setThemeIdx(idx);
    fetch('/api/theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idx }) });
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      const w = WIDGETS.find(w => w.hotkey === e.key);
      if (w) { e.preventDefault(); toggle(w.key); }
      if (e.key === 'Escape') { e.preventDefault(); hideAll(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggle, hideAll]);

  const activeCount = Object.values(vis).filter(Boolean).length;
  const pal = PALETTES[themeIdx];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0a; color: #e4e4e7; font-family: 'Inter', sans-serif; }
        .fade-in { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}} />

      <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Controller</h1>
            <p style={{ fontSize: 12, color: '#52525b', marginTop: 4 }}>
              {activeCount} overlay{activeCount !== 1 ? 's' : ''} active
            </p>
          </div>
          <button
            onClick={hideAll}
            style={{
              background: 'none', border: '1px solid #27272a', color: '#a1a1aa',
              padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'border-color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3f3f46'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#27272a'}
          >
            Clear All
          </button>
        </div>

        {/* ── Theme Row ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Theme
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {PALETTES.map((p, idx) => {
              const sel = themeIdx === idx;
              return (
                <button
                  key={p.name}
                  onClick={() => switchTheme(idx)}
                  title={p.name}
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: p.accent,
                    border: sel ? '2px solid #fff' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    opacity: sel ? 1 : 0.4,
                    transform: sel ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: '#52525b', marginTop: 8 }}>{pal.name}</div>
        </div>

        {/* ── Widget Groups ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {GROUPS.map(g => {
            const items = WIDGETS.filter(w => w.group === g.id);
            return (
              <div key={g.id}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                  {g.label}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {items.map(w => {
                    const on = vis[w.key] ?? false;
                    return (
                      <button
                        key={w.key}
                        onClick={() => toggle(w.key)}
                        style={{
                          position: 'relative',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          padding: 14,
                          height: 80,
                          borderRadius: 12,
                          border: on ? '1px solid ' + pal.accent + '60' : '1px solid #1c1c1e',
                          background: on ? pal.accent + '12' : '#111113',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#18181b'; }}
                        onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#111113'; }}
                      >
                        {/* Top row: label + status dot */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                          <span style={{ fontSize: 13, fontWeight: on ? 700 : 500, color: on ? '#f4f4f5' : '#71717a' }}>
                            {w.label}
                          </span>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: on ? pal.accent : '#27272a',
                            boxShadow: on ? '0 0 8px ' + pal.accent : 'none',
                            transition: 'all 0.2s',
                          }} />
                        </div>

                        {/* Bottom row: hotkey */}
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#3f3f46' }}>
                          {w.hotkey}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid #18181b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#3f3f46' }}>OBS → localhost:3001/overlay/master</span>
          <span style={{ fontSize: 11, color: '#3f3f46' }}>ESC to clear</span>
        </div>
      </div>
    </>
  );
}
