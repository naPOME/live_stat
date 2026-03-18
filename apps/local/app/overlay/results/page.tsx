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

interface LiveData {
  phase?: string;
  teams: Team[];
}

export default function ResultsOverlay() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [theme, setTheme] = useState({ accent_color: '#60a5fa' });
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(r => setTheme(r?.data ?? r)).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => { const d = (raw?.data ?? raw) as LiveData;
      if (d.teams.length > 0) {
        setTeams(d.teams);
        if (!show) setTimeout(() => setShow(true), 300);
      }
    }).catch(() => {});

    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [show]);

  if (teams.length === 0) return <style jsx global>{`body { background: transparent !important; margin: 0; }`}</style>;

  const accent = theme.accent_color || '#60a5fa';

  // Split into two columns
  const half = Math.ceil(teams.length / 2);
  const leftTeams = teams.slice(0, half);
  const rightTeams = teams.slice(half);

  function renderRow(team: Team, rank: number) {
    const name = team.displayName || team.teamName;
    const short = team.shortName || name.substring(0, 3).toUpperCase();
    const color = team.brandColor || '#ffffff';

    return (
      <div
        key={name}
        className="flex items-center gap-0 border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: rank % 2 === 0 ? 'rgba(15,15,35,0.95)' : 'rgba(10,10,26,0.95)',
        }}
      >
        {/* Rank */}
        <div
          className="w-7 flex items-center justify-center text-[11px] font-black flex-shrink-0 py-2"
          style={{
            color: rank <= 3 ? '#000' : '#fff',
            background: rank === 1 ? accent : rank === 2 ? '#ef6b6b' : rank === 3 ? '#f0b940' : 'transparent',
          }}
        >
          #{rank}
        </div>

        {/* Color bar */}
        <div className="w-[3px] self-stretch flex-shrink-0" style={{ background: color }} />

        {/* Logo + Team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5">
          {team.logoPath ? (
            <img src={team.logoPath} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded flex items-center justify-center text-[7px] font-black flex-shrink-0"
              style={{ background: color + '33', color }}>{short.substring(0, 2)}</div>
          )}
          <span className="text-white text-[11px] font-semibold truncate">{name}</span>
        </div>

        {/* Elims */}
        <div className="w-10 text-center text-[11px] font-bold text-[#8b8da6] flex-shrink-0">
          {team.kills}
        </div>

        {/* Total */}
        <div className="w-10 text-center text-[11px] font-black text-white flex-shrink-0 pr-2">
          {team.totalPoints}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center p-8 transition-all duration-700 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Title */}
      <div className="text-center mb-4">
        <div className="text-3xl font-black text-white uppercase tracking-wider">MATCH STATS</div>
      </div>

      {/* Two-column table */}
      <div className="flex gap-4 w-full max-w-[900px]">
        {/* Left */}
        <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#8b8da6]"
            style={{ background: accent, color: '#000' }}>
            <span className="w-7 text-center">#</span>
            <span className="flex-1 px-2">TEAM</span>
            <span className="w-10 text-center">ELIMS</span>
            <span className="w-10 text-center pr-2">TOTAL</span>
          </div>
          {leftTeams.map((t, i) => renderRow(t, i + 1))}
        </div>

        {/* Right */}
        <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: accent, color: '#000' }}>
            <span className="w-7 text-center">#</span>
            <span className="flex-1 px-2">TEAM</span>
            <span className="w-10 text-center">ELIMS</span>
            <span className="w-10 text-center pr-2">TOTAL</span>
          </div>
          {rightTeams.map((t, i) => renderRow(t, half + i + 1))}
        </div>
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
