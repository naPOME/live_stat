'use client';

import { useEffect, useState, useCallback } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
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
  EyeSlash,
  Palette,
  SlidersHorizontal,
} from '@phosphor-icons/react';

const WIDGETS = [
  { key: 'leaderboard',  label: 'Ranking',     hotkey: 'F1', group: 'live', icon: <ListNumbers size={18} weight="duotone" /> },
  { key: 'killfeed',     label: 'Kill Feed',   hotkey: 'F2', group: 'live', icon: <Crosshair size={18} weight="duotone" /> },
  { key: 'playercard',   label: 'Player',      hotkey: 'F3', group: 'live', icon: <UserCircle size={18} weight="duotone" /> },
  { key: 'elimination',  label: 'Elim Alert',  hotkey: 'F4', group: 'live', icon: <Warning size={18} weight="duotone" /> },
  { key: 'wwcd',         label: 'WWCD',        hotkey: 'F5', group: 'post', icon: <Trophy size={18} weight="duotone" /> },
  { key: 'fraggers',     label: 'Fraggers',    hotkey: 'F6', group: 'post', icon: <Sword size={18} weight="duotone" /> },
  { key: 'results',      label: 'Results',     hotkey: 'F7', group: 'post', icon: <ChartBar size={18} weight="duotone" /> },
  { key: 'mvp',          label: 'MVP',         hotkey: 'F8', group: 'post', icon: <Star size={18} weight="duotone" /> },
  { key: 'pointtable',   label: 'Points',      hotkey: 'F9', group: 'info', icon: <Table size={18} weight="duotone" /> },
  { key: 'teamlist',     label: 'Teams',       hotkey: 'F10', group: 'info', icon: <UsersThree size={18} weight="duotone" /> },
  { key: 'matchinfo',    label: 'Match Info',  hotkey: 'F11', group: 'info', icon: <Info size={18} weight="duotone" /> },
  { key: 'schedule',     label: 'Schedule',    hotkey: 'F12', group: 'info', icon: <CalendarBlank size={18} weight="duotone" /> },
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
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SlidersHorizontal size={20} weight="duotone" style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Controller</h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>
            {activeCount} overlay{activeCount !== 1 ? 's' : ''} active · ESC to clear
          </p>
        </div>
        <button className="btn" onClick={hideAll}>
          <EyeSlash size={14} />
          <span>Clear All</span>
        </button>
      </div>

      {/* ── Theme Row ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Palette size={16} weight="duotone" style={{ color: 'var(--text-faint)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Broadcast Theme
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {PALETTES.map((p, idx) => {
            const sel = themeIdx === idx;
            return (
              <button
                key={p.name}
                onClick={() => switchTheme(idx)}
                title={p.name}
                style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: p.accent,
                  border: sel ? '2px solid var(--text)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  opacity: sel ? 1 : 0.35,
                  transform: sel ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            );
          })}
          <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 8, fontWeight: 600 }}>{pal.name}</span>
        </div>
      </div>

      {/* ── Widget Groups ── */}
      {GROUPS.map(g => {
        const items = WIDGETS.filter(w => w.group === g.id);
        return (
          <div key={g.id}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2 }}>
              {g.label}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {items.map(w => {
                const on = vis[w.key] ?? false;
                return (
                  <button
                    key={w.key}
                    onClick={() => toggle(w.key)}
                    className={on ? 'card' : 'card'}
                    style={{
                      position: 'relative',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      padding: 14,
                      height: 88,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      borderColor: on ? `${pal.accent}50` : 'var(--border)',
                      background: on ? `${pal.accent}08` : 'var(--bg-card)',
                    }}
                  >
                    {/* Top row: icon + status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <div style={{ color: on ? pal.accent : 'var(--text-muted)', transition: 'color 0.15s' }}>
                        {w.icon}
                      </div>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: on ? pal.accent : 'var(--border-hi)',
                        boxShadow: on ? `0 0 8px ${pal.accent}` : 'none',
                        transition: 'all 0.2s',
                      }} />
                    </div>

                    {/* Bottom row: label + hotkey */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                      <span style={{ fontSize: 12, fontWeight: on ? 700 : 600, color: on ? 'var(--text)' : 'var(--text-dim)' }}>
                        {w.label}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
                        padding: '2px 6px', borderRadius: 4,
                        background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                      }}>
                        {w.hotkey}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Footer ── */}
      <div className="flex items-center" style={{ justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 10, color: 'var(--text-muted)' }}>
        <span>OBS Source: <span className="mono" style={{ color: 'var(--text-dim)' }}>localhost:3001/overlay/master</span></span>
        <span>F1-F12 to toggle · ESC to clear</span>
      </div>
    </div>
  );
}
