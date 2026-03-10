'use client';

import { useEffect, useState, useRef } from 'react';

interface Team {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  kills: number;
  placement?: number;
  alive: boolean;
  liveMemberNum: number;
  placementPoints: number;
  totalPoints: number;
}

interface LiveData {
  phase?: string;
  teams: Team[];
}

export default function LeaderboardOverlay() {
  const [data, setData] = useState<LiveData | null>(null);
  const [theme, setTheme] = useState({ bg_color: '#0a0a1a', accent_color: '#00ffc3' });
  const prevPoints = useRef<Record<string, number>>({});
  const [flashing, setFlashing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(setTheme).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((d: LiveData) => {
      // Detect point changes for flash animation
      const newFlash: Record<string, boolean> = {};
      for (const t of d.teams) {
        const key = t.displayName || t.teamName;
        const prev = prevPoints.current[key];
        if (prev !== undefined && prev !== t.totalPoints) {
          newFlash[key] = true;
        }
        prevPoints.current[key] = t.totalPoints;
      }
      if (Object.keys(newFlash).length > 0) {
        setFlashing(newFlash);
        setTimeout(() => setFlashing({}), 800);
      }
      setData(d);
    }).catch(() => {});

    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, []);

  if (!data || data.teams.length === 0) return null;

  const accent = theme.accent_color || '#00ffc3';
  const teams = data.teams.slice(0, 16);

  return (
    <div
      className="fixed top-0 right-0 w-[420px] h-[1080px] flex flex-col"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: accent, color: '#000' }}
      >
        <span className="text-xs font-black uppercase tracking-wider">TEAMS</span>
        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider">
          <span>PLAYERS</span>
          <span className="w-8 text-center">PTS</span>
          <span className="w-8 text-center">ELIMS</span>
        </div>
      </div>

      {/* Team Rows */}
      <div className="flex-1 flex flex-col">
        {teams.map((team, i) => {
          const name = team.displayName || team.teamName;
          const short = team.shortName || name.substring(0, 4).toUpperCase();
          const color = team.brandColor || '#ffffff';
          const isFlash = flashing[name];
          const isEliminated = !team.alive && team.liveMemberNum === 0;
          const rank = i + 1;

          return (
            <div
              key={name}
              className="flex items-center gap-0 border-b transition-all duration-300"
              style={{
                borderColor: 'rgba(255,255,255,0.06)',
                background: isFlash
                  ? `${accent}22`
                  : isEliminated
                  ? 'rgba(255,0,0,0.05)'
                  : i % 2 === 0
                  ? 'rgba(10,10,26,0.92)'
                  : 'rgba(15,15,35,0.92)',
                opacity: isEliminated ? 0.5 : 1,
              }}
            >
              {/* Rank */}
              <div
                className="w-8 flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{
                  color: rank <= 3 ? '#000' : '#fff',
                  background:
                    rank === 1 ? accent
                    : rank === 2 ? '#ff4e4e'
                    : rank === 3 ? '#ffb800'
                    : 'transparent',
                }}
              >
                {rank}
              </div>

              {/* Team Color Bar */}
              <div className="w-1 h-full flex-shrink-0" style={{ background: color }} />

              {/* Logo + Name */}
              <div className="flex items-center gap-2 flex-1 min-w-0 px-2 py-[6px]">
                {team.logoPath ? (
                  <img src={team.logoPath} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                ) : (
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-black flex-shrink-0"
                    style={{ background: color + '33', color }}
                  >
                    {short.substring(0, 2)}
                  </div>
                )}
                <span className="text-white text-xs font-semibold truncate">{name}</span>
              </div>

              {/* Player Status (4 bars) */}
              <div className="flex items-center gap-[2px] px-2">
                {Array.from({ length: 4 }, (_, pi) => {
                  // Get alive count from liveMemberNum
                  const isAlive = pi < team.liveMemberNum;
                  return (
                    <div
                      key={pi}
                      className="w-[3px] h-[14px] rounded-sm"
                      style={{
                        background: isAlive ? accent : 'rgba(255,78,78,0.4)',
                      }}
                    />
                  );
                })}
              </div>

              {/* Points */}
              <div
                className="w-8 text-center text-xs font-black flex-shrink-0"
                style={{ color: isFlash ? accent : '#fff' }}
              >
                {team.totalPoints}
              </div>

              {/* Elims */}
              <div className="w-8 text-center text-xs font-bold flex-shrink-0 pr-2" style={{ color: '#8b8da6' }}>
                {team.kills}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Legend */}
      <div
        className="flex items-center justify-center gap-4 px-4 py-1.5 text-[9px] uppercase tracking-wider"
        style={{ background: 'rgba(10,10,26,0.95)', color: '#8b8da6' }}
      >
        <span className="flex items-center gap-1">
          <span className="w-[3px] h-[10px] rounded-sm" style={{ background: accent }} /> ALIVE
        </span>
        <span className="flex items-center gap-1">
          <span className="w-[3px] h-[10px] rounded-sm" style={{ background: 'rgba(255,78,78,0.4)' }} /> KNOCKED
        </span>
        <span className="flex items-center gap-1">
          <span className="w-[3px] h-[10px] rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} /> DEAD
        </span>
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
