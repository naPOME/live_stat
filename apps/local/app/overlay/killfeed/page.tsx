'use client';

import { useEffect, useState, useRef } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

interface KillEvent {
  id: string;
  causerName: string;
  victimName: string;
  causerTeamColor?: string;
  victimTeamColor?: string;
  distance: number;
  timestamp: number;
}

interface KillEntry extends KillEvent {
  visible: boolean;
}

const FADE_DURATION = 5000;

export default function KillfeedPage() {
  const [kills, setKills] = useState<KillEntry[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const es = new EventSource('/api/killfeed');
    es.onmessage = (e) => {
      const kill = JSON.parse(e.data) as KillEvent;
      if (!kill.id) return;
      setKills(prev => {
        const entry: KillEntry = { ...kill, visible: true };
        return [entry, ...prev].slice(0, 8);
      });
      const t = setTimeout(() => {
        setKills(prev => prev.filter(k => k.id !== kill.id));
        timers.current.delete(kill.id);
      }, FADE_DURATION);
      timers.current.set(kill.id, t);
    };
    return () => { es.close(); timers.current.forEach(clearTimeout); };
  }, []);

  const p = PALETTES[themeIdx];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { background: transparent !important; margin: 0; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
      `}} />

      <div style={{
        position: 'fixed', top: 24, left: 24,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
        fontFamily: "'Inter', sans-serif",
      }}>
        {kills.map((kill) => (
          <div key={kill.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px',
            borderRadius: 8,
            background: p.cardBg,
            border: '1px solid ' + p.separator,
            fontSize: 13, fontWeight: 600,
            color: p.text,
            animation: 'slideIn 0.25s ease-out',
          }}>
            <span style={{
              color: kill.causerTeamColor ?? p.accent,
              textShadow: `0 0 8px ${kill.causerTeamColor ?? p.accent}55`,
            }}>{kill.causerName}</span>
            <span style={{ color: p.textMuted, fontSize: 10 }}>▶</span>
            <span style={{ color: '#ef4444' }}>{kill.victimName}</span>
            {kill.distance > 0 && (
              <span style={{ color: p.textMuted, fontSize: 10 }}>{Math.round(kill.distance)}m</span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
