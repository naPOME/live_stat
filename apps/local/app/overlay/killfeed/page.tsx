'use client';

import { useEffect, useState, useRef } from 'react';

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

  useEffect(() => {
    const es = new EventSource('/api/killfeed');

    es.onmessage = (e) => {
      const kill = JSON.parse(e.data) as KillEvent;
      if (!kill.id) return;

      setKills(prev => {
        const entry: KillEntry = { ...kill, visible: true };
        const next = [entry, ...prev].slice(0, 8);
        return next;
      });

      // Auto-fade after 5s
      const t = setTimeout(() => {
        setKills(prev => prev.filter(k => k.id !== kill.id));
        timers.current.delete(kill.id);
      }, FADE_DURATION);
      timers.current.set(kill.id, t);
    };

    return () => {
      es.close();
      timers.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="fixed top-6 left-6 flex flex-col gap-2 pointer-events-none" style={{ fontFamily: 'Inter, sans-serif' }}>
      {kills.map((kill) => (
        <div
          key={kill.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold animate-slideIn"
          style={{
            background: 'rgba(10,10,26,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
          }}
        >
          <span
            style={{
              color: kill.causerTeamColor ?? '#00ffc3',
              textShadow: `0 0 8px ${kill.causerTeamColor ?? '#00ffc3'}55`,
            }}
          >
            {kill.causerName}
          </span>
          <span style={{ color: '#8b8da6', fontSize: '10px' }}>▶</span>
          <span style={{ color: '#ff4e4e' }}>{kill.victimName}</span>
          {kill.distance > 0 && (
            <span style={{ color: '#8b8da6', fontSize: '10px' }}>{Math.round(kill.distance)}m</span>
          )}
        </div>
      ))}

      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.25s ease-out;
        }
        body { background: transparent !important; margin: 0; }
      `}</style>
    </div>
  );
}
