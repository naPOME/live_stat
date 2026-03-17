'use client';

import { useEffect, useState } from 'react';

interface Team {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  kills: number;
  placement?: number;
  liveMemberNum: number;
  placementPoints: number;
  totalPoints: number;
}

interface Player {
  playerName: string;
  displayName?: string;
  teamName: string;
  kills: number;
}

interface LiveData {
  phase?: string;
  teams: Team[];
  players?: Player[];
}

export default function WwcdOverlay() {
  const [winner, setWinner] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [show, setShow] = useState(false);
  const [theme, setTheme] = useState({ accent_color: '#00ffc3' });

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(r => setTheme(r?.data ?? r)).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => { const d = (raw?.data ?? raw) as LiveData;
      if (d.phase === 'finished' && d.teams.length > 0) {
        // Winner is first team (already sorted by points)
        const winTeam = d.teams[0];
        setWinner(winTeam);

        // Get winner's players
        const teamPlayers = (d.players || [])
          .filter(p => p.teamName === winTeam.teamName)
          .sort((a, b) => b.kills - a.kills);
        setPlayers(teamPlayers);
        setTimeout(() => setShow(true), 200);
      }
    }).catch(() => {});

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (!winner) return <style jsx global>{`body { background: transparent !important; margin: 0; }`}</style>;

  const accent = theme.accent_color || '#00ffc3';
  const name = winner.displayName || winner.teamName;
  const color = winner.brandColor || accent;

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${
        show ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Tournament Label */}
      <div
        className="text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-1 rounded mb-3"
        style={{ background: accent, color: '#000' }}
      >
        PUBG MOBILE TOURNAMENT
      </div>

      {/* WINNER WINNER CHICKEN DINNER */}
      <h1
        className="text-5xl font-black uppercase tracking-wider mb-6"
        style={{
          color: accent,
          textShadow: `0 0 40px ${accent}44, 0 0 80px ${accent}22`,
        }}
      >
        WINNER WINNER CHICKEN DINNER
      </h1>

      {/* Player Silhouettes Row */}
      <div className="flex items-end gap-6 mb-6">
        {players.slice(0, 4).map((p, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="w-[120px] h-[140px] rounded-xl flex items-center justify-center mb-2"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
                <circle cx="30" cy="20" r="14" fill="rgba(255,255,255,0.15)" />
                <path d="M8 75C8 55 15 42 30 42C45 42 52 55 52 75" fill="rgba(255,255,255,0.1)" />
              </svg>
            </div>
            <span className="text-white text-xs font-semibold">{p.displayName || p.playerName}</span>
            <span className="text-[10px] font-bold" style={{ color: accent }}>{p.kills} ELIMS</span>
          </div>
        ))}
      </div>

      {/* Team Name */}
      <div className="flex items-center gap-3 mb-6">
        {winner.logoPath ? (
          <img src={winner.logoPath} alt="" className="w-10 h-10 rounded-lg object-contain" />
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black"
            style={{ background: color + '33', color }}
          >
            {(winner.shortName || name).substring(0, 2).toUpperCase()}
          </div>
        )}
        <span className="text-2xl font-bold text-white">{name}</span>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-0 rounded-xl overflow-hidden" style={{ border: `2px solid ${accent}33` }}>
        {[
          { label: 'WWCD', value: '1' },
          { label: 'TOTAL ELIMS', value: String(winner.kills) },
          { label: 'PLACEMENT PTS', value: String(winner.placementPoints) },
          { label: 'TOTAL POINTS', value: String(winner.totalPoints) },
        ].map((stat, i) => (
          <div
            key={i}
            className="px-8 py-3 text-center"
            style={{
              background: i === 0 ? accent : 'rgba(10,10,26,0.9)',
              color: i === 0 ? '#000' : '#fff',
              borderLeft: i > 0 ? `1px solid ${accent}22` : 'none',
            }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: i === 0 ? '#000' : '#8b8da6' }}
            >
              {stat.label}
            </div>
            <div className="text-2xl font-black">{stat.value}</div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
