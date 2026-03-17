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
  logoPath?: string;
}

interface LiveData {
  phase?: string;
  teams: Team[];
  players?: Player[];
}

export default function MvpOverlay() {
  const [mvp, setMvp] = useState<(Player & { brandColor?: string; teamShort?: string; teamLogo?: string }) | null>(null);
  const [theme, setTheme] = useState({ accent_color: '#00ffc3' });
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(r => setTheme(r?.data ?? r)).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => { const d = (raw?.data ?? raw) as LiveData;
      const players = d.players || [];
      if (players.length === 0) return;

      // Find MVP: highest kills
      const sorted = [...players].sort((a, b) => b.kills - a.kills);
      const top = sorted[0];
      if (!top || top.kills === 0) return;

      const team = d.teams.find(t => t.teamName === top.teamName);

      setMvp({
        ...top,
        brandColor: team?.brandColor,
        teamShort: team?.shortName || team?.displayName || top.teamName,
        teamLogo: team?.logoPath,
      });

      if (!show) setTimeout(() => setShow(true), 300);
    }).catch(() => {});

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [show]);

  if (!mvp) return <style jsx global>{`body { background: transparent !important; margin: 0; }`}</style>;

  const accent = theme.accent_color || '#00ffc3';
  const color = mvp.brandColor || accent;
  const name = mvp.displayName || mvp.playerName;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div
        className={`flex items-stretch overflow-hidden rounded-2xl transition-all duration-700 ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
        style={{ border: `2px solid ${accent}33`, maxWidth: 700 }}
      >
        {/* Left: Player Silhouette */}
        <div
          className="w-[240px] relative flex items-center justify-center"
          style={{
            background: `linear-gradient(180deg, rgba(10,10,26,0.98) 0%, ${accent}15 100%)`,
          }}
        >
          {/* MVP watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none"
            style={{ opacity: 0.06 }}
          >
            <span className="text-[120px] font-black tracking-tighter text-white leading-none">MVP</span>
          </div>

          {/* Silhouette */}
          <svg width="120" height="160" viewBox="0 0 120 160" fill="none" className="relative z-10">
            <circle cx="60" cy="40" r="28" fill="rgba(255,255,255,0.12)" />
            <path d="M16 150C16 110 30 84 60 84C90 84 104 110 104 150" fill="rgba(255,255,255,0.08)" />
          </svg>

          {/* MVP Badge */}
          <div
            className="absolute top-4 left-4 text-3xl font-black tracking-tighter"
            style={{ color: accent, textShadow: `0 0 20px ${accent}44` }}
          >
            MVP
          </div>
        </div>

        {/* Right: Info Panel */}
        <div
          className="flex-1 flex flex-col"
          style={{ background: 'rgba(10,10,26,0.96)' }}
        >
          {/* Team + Player Name */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              {mvp.teamLogo ? (
                <img src={mvp.teamLogo} alt="" className="w-5 h-5 rounded object-contain" />
              ) : (
                <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black"
                  style={{ background: color + '33', color }}>
                  {(mvp.teamShort || '').substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{mvp.teamShort}</span>
            </div>
            <div className="text-white text-xl font-black uppercase tracking-wide">{name}</div>
          </div>

          {/* Stats Grid */}
          <div className="px-6 pb-5 grid grid-cols-2 gap-[2px]">
            {[
              { label: 'ELIMINATIONS', value: String(mvp.kills) },
              { label: 'DAMAGE', value: '—' },
              { label: 'ASSISTS', value: '—' },
              { label: 'KNOCKOUTS', value: '—' },
              { label: 'THROWABLES', value: '—' },
              { label: 'HEALS', value: '—' },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg"
                style={{
                  background: stat.label === 'ELIMINATIONS' ? `${accent}22` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${stat.label === 'ELIMINATIONS' ? accent + '33' : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b8da6]">{stat.label}</span>
                <span
                  className="text-sm font-black"
                  style={{ color: stat.label === 'ELIMINATIONS' ? accent : '#fff' }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Survival Time */}
          <div
            className="mx-6 mb-5 flex items-center justify-between px-4 py-2.5 rounded-lg"
            style={{ background: accent, color: '#000' }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">SURVIVAL TIME</span>
            <span className="text-sm font-black">—</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
