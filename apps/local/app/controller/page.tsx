'use client';

import { useEffect, useState, useCallback } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { useUnifiedStream } from '@/hooks/useUnifiedStream';
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
  ImageSquare,
  CaretLeft,
  CaretRight,
  X,
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
  // Single SSE connection for all channels
  const stream = useUnifiedStream();
  const vis = stream.widgets;
  const themeIdx = stream.themeIdx;
  const activeWp = stream.wallpaper;
  const lbPage = stream.lbPage;

  const [wallpapers, setWallpapers] = useState<string[]>([]);

  // Fetch available wallpaper list (one-time, not SSE)
  useEffect(() => {
    fetch('/api/wallpaper').then(r => r.json()).then(d => {
      setWallpapers(d.available ?? []);
    }).catch(() => {});
  }, []);

  const toggle = useCallback(async (key: string) => {
    fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', key }) });
  }, []);

  const hideAll = useCallback(async () => {
    fetch('/api/widgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hideAll' }) });
  }, []);

  const switchTheme = useCallback(async (idx: number) => {
    fetch('/api/theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idx }) });
  }, []);

  const pickWallpaper = useCallback(async (url: string | null) => {
    fetch('/api/wallpaper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
  }, []);

  const toggleLbPage = useCallback(async () => {
    fetch('/api/leaderboard-page', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle' }) });
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
  const isLeaderboardOn = vis['pointtable'] ?? false;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
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

      {/* Theme + Wallpaper Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Theme Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Palette size={16} weight="duotone" style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Theme
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {PALETTES.map((p, idx) => {
              const sel = themeIdx === idx;
              return (
                <button
                  key={p.name}
                  onClick={() => switchTheme(idx)}
                  title={p.name}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-sm)',
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
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4, fontWeight: 600 }}>{pal.name}</span>
          </div>
        </div>

        {/* Wallpaper Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ImageSquare size={16} weight="duotone" style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Background
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* None option */}
            <button
              onClick={() => pickWallpaper(null)}
              title="No background"
              style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-inset)',
                border: activeWp === null ? '2px solid var(--text)' : '2px solid var(--border)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: activeWp === null ? 1 : 0.5,
              }}
            >
              <X size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
            {wallpapers.map(wp => {
              const sel = activeWp === wp;
              const name = wp.split('/').pop()?.replace(/\.[^.]+$/, '') || wp;
              return (
                <button
                  key={wp}
                  onClick={() => pickWallpaper(wp)}
                  title={name}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                    backgroundImage: `url(${wp})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: sel ? '2px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer',
                    opacity: sel ? 1 : 0.5,
                    transition: 'all 0.15s',
                  }}
                />
              );
            })}
            {wallpapers.length === 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Add images to public/wallpapers/</span>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Page Toggle (only visible when pointtable is active) */}
      {isLeaderboardOn && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListNumbers size={16} weight="duotone" style={{ color: pal.accent }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>
              Leaderboard Page
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn"
              onClick={toggleLbPage}
              style={{ padding: '4px 12px', fontSize: 12 }}
            >
              <CaretLeft size={12} />
              <span style={{ fontWeight: 800, minWidth: 50, textAlign: 'center' }}>Page {lbPage}</span>
              <CaretRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Widget Groups */}
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
                    className="card"
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

      {/* Footer */}
      <div className="flex items-center" style={{ justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 10, color: 'var(--text-muted)' }}>
        <span>OBS Source: <span className="mono" style={{ color: 'var(--text-dim)' }}>localhost:3001/overlay/master</span></span>
        <span>F1-F12 to toggle · ESC to clear</span>
      </div>
    </div>
  );
}
