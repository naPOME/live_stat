'use client';

import { useEffect, useState, useCallback } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';

interface WidgetDef {
  key: string;
  label: string;
  hotkey: string;
  group: 'live' | 'post' | 'static';
  icon: string;
}

const WIDGETS: WidgetDef[] = [
  { key: 'leaderboard',  label: 'Match Ranking',     hotkey: 'F1', group: 'live', icon: '🏆' },
  { key: 'killfeed',     label: 'Kill Feed',         hotkey: 'F2', group: 'live', icon: '⚔️' },
  { key: 'playercard',   label: 'Player Card',       hotkey: 'F3', group: 'live', icon: '👤' },
  { key: 'elimination',  label: 'Elimination Alert', hotkey: 'F4', group: 'live', icon: '💀' },
  { key: 'wwcd',         label: 'WWCD',              hotkey: 'F5', group: 'post', icon: '🍗' },
  { key: 'fraggers',     label: 'Top Fraggers',      hotkey: 'F6', group: 'post', icon: '🔥' },
  { key: 'results',      label: 'After Match Score', hotkey: 'F7', group: 'post', icon: '📊' },
  { key: 'mvp',          label: 'MVP',               hotkey: 'F8', group: 'post', icon: '⭐' },
  { key: 'pointtable',   label: 'Point Table',       hotkey: 'F9', group: 'static', icon: '📋' },
  { key: 'teamlist',     label: 'Team List',         hotkey: 'F10', group: 'static', icon: '🛡️' },
  { key: 'matchinfo',    label: 'Match Info',        hotkey: 'F11', group: 'static', icon: 'ℹ️' },
  { key: 'schedule',     label: 'Schedule',          hotkey: 'F12', group: 'static', icon: '📅' },
  { key: 'sponsor_overlay', label: 'Sponsor Bar',    hotkey: 'S',  group: 'static', icon: '📺' },
];

const GROUPS = [
  { id: 'live',   label: 'LIVE BROADCAST',  color: '#ef4444' }, // Red
  { id: 'post',   label: 'POST MATCH',      color: '#8b5cf6' }, // Purple
  { id: 'static', label: 'STATIC INFO',     color: '#3b82f6' }, // Blue
] as const;

export default function ControllerPage() {
  const [vis, setVis] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState('lobby');
  const [activeThemeIdx, setActiveThemeIdx] = useState(0);

  // Poll generic match state
  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(d => setPhase(d?.phase || 'lobby')).catch(() => {});
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  // Sync Widget Visibility via SSE
  useEffect(() => {
    fetch('/api/widgets').then(r => r.json()).then(setVis).catch(() => {});
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = e => { try { setVis(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  // Sync Global Theme via SSE
  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(d => {
      if (typeof d.activeThemeIdx === 'number') setActiveThemeIdx(d.activeThemeIdx);
    }).catch(() => {});
    const es = new EventSource('/api/theme?stream=1');
    es.onmessage = e => { 
      try { 
        const d = JSON.parse(e.data);
        if (typeof d.activeThemeIdx === 'number') setActiveThemeIdx(d.activeThemeIdx); 
      } catch {} 
    };
    return () => es.close();
  }, []);

  const toggle = useCallback(async (key: string) => {
    // Optimistic UI update
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
    setActiveThemeIdx(idx); // Optimistic
    fetch('/api/theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idx }) });
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const w = WIDGETS.find(w => w.hotkey.toLowerCase() === e.key.toLowerCase());
      if (w) { e.preventDefault(); toggle(w.key); }
      if (e.key === 'Escape') { e.preventDefault(); hideAll(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggle, hideAll]);

  const activeCount = Object.values(vis).filter(Boolean).length;
  const p = PALETTES[activeThemeIdx];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b', // Ultra dark background for the dashboard itself
      fontFamily: "'Inter', sans-serif",
      color: '#fff',
      padding: '40px 60px'
    }}>
      {/* ── Dashboard Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 48 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', margin: 0, 
            background: 'linear-gradient(135deg, ' + p.accent + ' 0%, #fff 100%)', 
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Broadcast Director
          </h1>
          <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4, letterSpacing: '0.05em' }}>
            ENGINE RUNNING • PORT 3001
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 8, 
            background: phase === 'ingame' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
            border: phase === 'ingame' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
            padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 700,
            color: phase === 'ingame' ? '#ef4444' : '#a1a1aa',
            textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>
            {phase === 'ingame' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />}
            {phase === 'ingame' ? 'LIVE SYNC' : phase}
          </div>
          
          <button 
            onClick={hideAll}
            style={{ 
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
              padding: '8px 20px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.1em'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          >
            Clear All Overlays
            <kbd style={{ background: 'rgba(239,68,68,0.2)', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>ESC</kbd>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 40, alignItems: 'start' }}>
        
        {/* ── Left Side: Stream Deck Grid ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {GROUPS.map(g => {
            const groupWidgets = WIDGETS.filter(w => w.group === g.id);
            return (
              <div key={g.id}>
                <h3 style={{ fontSize: 11, fontWeight: 800, color: g.color, letterSpacing: '0.15em', margin: '0 0 16px 0' }}>
                  {g.label}
                </h3>
                
                {/* Visual Stream Deck Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {groupWidgets.map(w => {
                    const on = vis[w.key] ?? false;
                    
                    return (
                      <button
                        key={w.key}
                        onClick={() => toggle(w.key)}
                        style={{
                          position: 'relative',
                          textAlign: 'left',
                          padding: '16px',
                          borderRadius: 16,
                          border: on ? '2px solid ' + g.color : '2px solid rgba(255,255,255,0.05)',
                          background: on ? g.color + '15' : 'rgba(255,255,255,0.02)',
                          color: on ? '#fff' : '#a1a1aa',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          transform: on ? 'translateY(-2px)' : 'none',
                          boxShadow: on ? '0 8px 32px ' + g.color + '40' : 'none'
                        }}
                        onMouseEnter={e => { if(!on) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}}
                        onMouseLeave={e => { if(!on) { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}}
                      >
                        {/* Status Dot Ring */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 24, opacity: on ? 1 : 0.4 }}>{w.icon}</span>
                          <div style={{ 
                            width: 12, height: 12, borderRadius: '50%', 
                            background: on ? g.color : 'rgba(255,255,255,0.1)',
                            boxShadow: on ? '0 0 12px ' + g.color : 'none',
                            border: on ? 'none' : '2px solid rgba(255,255,255,0.05)'
                          }} />
                        </div>
                        
                        <div>
                          <div style={{ fontSize: 13, fontWeight: on ? 800 : 600, marginTop: 4 }}>{w.label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                            <kbd style={{ 
                              background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4, 
                              fontSize: 10, fontWeight: 700, color: '#fff', opacity: on ? 1 : 0.5
                            }}>
                              {w.hotkey}
                            </kbd>
                            <span style={{ fontSize: 9, fontWeight: 900, color: on ? g.color : 'transparent', letterSpacing: '0.1em' }}>ON AIR</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Right Side: Global Theme Engine ── */}
        <div>
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 24,
            padding: 24
          }}>
            <h3 style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.15em', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              GLOBAL THEME ENGINE
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </h3>
            
            <p style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5, marginBottom: 24 }}>
              Select a visual palette. This instantly syncs across all live overlays on your OBS master feed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PALETTES.map((pal, idx) => {
                const isSelected = activeThemeIdx === idx;
                return (
                  <button
                    key={pal.name}
                    onClick={() => switchTheme(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '1px solid ' + pal.accent : '1px solid rgba(255,255,255,0.05)',
                      padding: '12px 16px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 0 20px ' + pal.accent + '20' : 'none'
                    }}
                    onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  >
                    {/* Theme Swatches */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: pal.accent, boxShadow: isSelected ? '0 0 10px ' + pal.accent : 'none' }} />
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: pal.cardBg }} />
                    </div>
                    
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#fff' : '#a1a1aa' }}>
                        {pal.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#71717a', marginTop: 2 }}>
                        {pal.cardBg === '#ffffff' ? 'Light Mode' : 'Dark Mode'}
                      </div>
                    </div>

                    {isSelected && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: pal.accent }} />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Live Master Feed Preview Link */}
            <div style={{ marginTop: 32, padding: 16, background: '#000', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 10, color: '#71717a', fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8 }}>OBS MASTER URL</div>
              <div style={{ fontFamily: "'Space Grotesk', monospace", fontSize: 12, color: '#fff', wordBreak: 'break-all' }}>
                http://localhost:3001/overlay/master
              </div>
              <p style={{ fontSize: 11, color: '#52525b', marginTop: 8, margin: 0 }}>
                Copy this URL into an OBS Browser Source (1920x1080).
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
