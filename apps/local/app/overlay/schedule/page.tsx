'use client';

import { useEffect, useState } from 'react';

interface MatchSlot {
  name: string;
  map: string;
  status: 'upcoming' | 'live' | 'finished';
}

const MAP_COLORS: Record<string, string> = {
  erangel: '#2d5a3d',
  miramar: '#8b6914',
  sanhok: '#3d6b2d',
  vikendi: '#4a6b7a',
  rondo: '#5a3d6b',
  livik: '#6b5a2d',
  deston: '#3d4a6b',
  nusa: '#2d6b5a',
  taego: '#6b3d3d',
};

export default function ScheduleOverlay() {
  const [matches, setMatches] = useState<MatchSlot[]>([]);
  const [theme, setTheme] = useState({ accent_color: '#00ffc3' });

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(r => setTheme(r?.data ?? r)).catch(() => {});

    // Read matches from query params: ?matches=Game 1:Erangel:finished,Game 2:Miramar:live,Game 3:Sanhok:upcoming
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('matches') || '';

    if (raw) {
      const parsed = raw.split(',').map(m => {
        const [name, map, status] = m.split(':');
        return {
          name: (name || 'Match').trim(),
          map: (map || 'Erangel').trim(),
          status: (status || 'upcoming').trim() as MatchSlot['status'],
        };
      });
      setMatches(parsed);
    } else {
      // Default demo
      setMatches([
        { name: 'MATCH 1', map: 'ERANGEL', status: 'finished' },
        { name: 'MATCH 2', map: 'MIRAMAR', status: 'finished' },
        { name: 'MATCH 3', map: 'SANHOK', status: 'live' },
        { name: 'MATCH 4', map: 'ERANGEL', status: 'upcoming' },
        { name: 'MATCH 5', map: 'MIRAMAR', status: 'upcoming' },
        { name: 'MATCH 6', map: 'ERANGEL', status: 'upcoming' },
      ]);
    }
  }, []);

  if (matches.length === 0) return <style jsx global>{`body { background: transparent !important; margin: 0; }`}</style>;

  const accent = theme.accent_color || '#00ffc3';

  return (
    <div className="fixed bottom-0 left-0 right-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div
        className="flex items-stretch"
        style={{
          background: 'rgba(10,10,26,0.95)',
          borderTop: `2px solid ${accent}33`,
        }}
      >
        {matches.map((m, i) => {
          const mapKey = m.map.toLowerCase();
          const mapColor = MAP_COLORS[mapKey] || '#333';
          const isLive = m.status === 'live';
          const isFinished = m.status === 'finished';

          return (
            <div
              key={i}
              className="flex-1 relative overflow-hidden"
              style={{
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              {/* Map Background */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${mapColor}88 0%, ${mapColor}33 100%)`,
                  opacity: isLive ? 1 : isFinished ? 0.4 : 0.6,
                }}
              />

              {/* Live indicator bar */}
              {isLive && (
                <div
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ background: accent }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 px-3 py-3 text-center">
                {/* Match status icon */}
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {isLive && (
                    <div className="relative flex items-center justify-center">
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: '#ff4e4e' }}
                      />
                    </div>
                  )}
                  {isFinished && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 6L5.5 8.5L9 3.5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{
                      color: isLive ? accent : isFinished ? '#8b8da6' : '#fff',
                    }}
                  >
                    {m.name}
                  </span>
                </div>

                {/* Map Name */}
                <div
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{
                    color: isLive ? '#fff' : '#8b8da6',
                  }}
                >
                  {m.map}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
