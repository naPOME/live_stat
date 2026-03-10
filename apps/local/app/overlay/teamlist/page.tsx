'use client';

import { useEffect, useState } from 'react';

interface Team {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  kills: number;
  alive: boolean;
  liveMemberNum: number;
}

export default function TeamListOverlay() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [theme, setTheme] = useState({ accent_color: '#00ffc3' });

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(setTheme).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((d: { teams: Team[] }) => {
      setTeams(d.teams);
    }).catch(() => {});

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (teams.length === 0) return <style jsx global>{`body { background: transparent !important; margin: 0; }`}</style>;

  const accent = theme.accent_color || '#00ffc3';

  // Two-column grid layout
  const half = Math.ceil(teams.length / 2);
  const leftTeams = teams.slice(0, half);
  const rightTeams = teams.slice(half);

  function renderTeamCard(team: Team, idx: number) {
    const name = team.displayName || team.teamName;
    const short = team.shortName || name.substring(0, 3).toUpperCase();
    const color = team.brandColor || '#ffffff';
    const slotNum = idx + 1;

    return (
      <div
        key={name}
        className="flex items-center gap-3 px-3 py-2.5 border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: slotNum % 2 === 0 ? 'rgba(15,15,35,0.95)' : 'rgba(10,10,26,0.95)',
        }}
      >
        {/* Slot Number */}
        <div className="text-[10px] font-bold text-[#8b8da6] w-4 text-right flex-shrink-0">
          {slotNum}
        </div>

        {/* Logo */}
        {team.logoPath ? (
          <img src={team.logoPath} alt="" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
            style={{ background: color + '33', color }}
          >
            {short.substring(0, 2)}
          </div>
        )}

        {/* Name */}
        <span className="text-white text-sm font-semibold truncate flex-1">{name}</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-12" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-[700px]">
        {/* Title */}
        <div className="text-center mb-4">
          <div className="text-2xl font-black text-white uppercase tracking-wider">TEAM LIST</div>
          <div className="text-xs text-[#8b8da6]">{teams.length} Teams</div>
        </div>

        {/* Two columns */}
        <div className="flex gap-4">
          <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {leftTeams.map((t, i) => renderTeamCard(t, i))}
          </div>
          <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {rightTeams.map((t, i) => renderTeamCard(t, half + i))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
