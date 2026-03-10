'use client';

import { useEffect, useState } from 'react';

interface Player {
  playerName: string;
  displayName?: string;
  teamName: string;
  kills: number;
}

interface Team {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
}

interface LiveData {
  teams: Team[];
  players?: Player[];
}

export default function FraggersOverlay() {
  const [topPlayers, setTopPlayers] = useState<(Player & { brandColor?: string; teamDisplayName?: string })[]>([]);
  const [theme, setTheme] = useState({ accent_color: '#00ffc3' });

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(setTheme).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((d: LiveData) => {
      const teamMap = new Map<string, Team>();
      for (const t of d.teams) teamMap.set(t.teamName, t);

      const sorted = (d.players || [])
        .filter(p => p.kills > 0)
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 5)
        .map(p => {
          const team = teamMap.get(p.teamName);
          return {
            ...p,
            brandColor: team?.brandColor,
            teamDisplayName: team?.displayName || team?.teamName,
          };
        });
      setTopPlayers(sorted);
    }).catch(() => {});

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (topPlayers.length === 0) return <style jsx global>{`body { background: transparent !important; margin: 0; }`}</style>;

  const accent = theme.accent_color || '#00ffc3';

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Title */}
      <div className="text-center mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-0.5 rounded inline-block mb-1"
          style={{ background: accent + '22', color: accent }}>
          THIS GAME
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wider">TOP FRAGGERS</h2>
      </div>

      {/* Players Row */}
      <div className="flex items-end gap-4">
        {topPlayers.map((p, i) => {
          const color = p.brandColor || '#ffffff';
          return (
            <div
              key={i}
              className="w-[160px] flex flex-col items-center rounded-xl overflow-hidden"
              style={{
                background: 'rgba(10,10,26,0.92)',
                border: `1px solid ${i === 0 ? accent + '44' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {/* Player Silhouette */}
              <div className="w-full h-[120px] flex items-center justify-center relative"
                style={{ background: color + '11' }}>
                <svg width="50" height="70" viewBox="0 0 60 80" fill="none">
                  <circle cx="30" cy="20" r="14" fill="rgba(255,255,255,0.12)" />
                  <path d="M8 75C8 55 15 42 30 42C45 42 52 55 52 75" fill="rgba(255,255,255,0.08)" />
                </svg>
                {i === 0 && (
                  <div className="absolute top-2 right-2 text-[10px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: accent, color: '#000' }}>MVP</div>
                )}
              </div>

              {/* Name Badge */}
              <div className="w-full px-3 py-2 text-center" style={{ background: color + '33' }}>
                <div className="text-white text-xs font-bold truncate">{p.displayName || p.playerName}</div>
              </div>

              {/* Stats */}
              <div className="w-full px-3 py-2 text-center">
                <div className="text-2xl font-black" style={{ color: accent }}>{p.kills}</div>
                <div className="text-[10px] text-[#8b8da6] font-bold uppercase tracking-wider">ELIMS</div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
