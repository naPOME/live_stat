'use client';

import { useEffect, useState } from 'react';

interface Player {
  playerName: string;
  displayName?: string;
  teamName: string;
  teamSlot: number;
  kills: number;
  damage: number;
  damageTaken: number;
  heal: number;
  headshots: number;
  assists: number;
  knockouts: number;
  rescues: number;
  survivalTime: number;
  survived: boolean;
}

interface Team {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  logoPath64?: string;
}

interface LiveData {
  phase?: string;
  teams: Team[];
  players?: Player[];
}

/**
 * Weighted MVP formula:
 *   (playerKills / totalKills) × 0.4
 * + (playerDamage / totalDamage) × 0.3
 * + (playerAvgSurvival / globalAvgSurvival) × 0.2
 * + (playerKnockouts / totalKnockouts) × 0.1
 */
function computeMvpPoints(player: Player, allPlayers: Player[]): number {
  const totalKills = allPlayers.reduce((s, p) => s + p.kills, 0);
  const totalDamage = allPlayers.reduce((s, p) => s + p.damage, 0);
  const totalKnockouts = allPlayers.reduce((s, p) => s + p.knockouts, 0);
  const globalAvgSurvival = allPlayers.length > 0
    ? allPlayers.reduce((s, p) => s + p.survivalTime, 0) / allPlayers.length
    : 0;

  const killShare = totalKills > 0 ? (player.kills / totalKills) * 0.4 : 0;
  const damageShare = totalDamage > 0 ? (player.damage / totalDamage) * 0.3 : 0;
  const survivalShare = globalAvgSurvival > 0 ? (player.survivalTime / globalAvgSurvival) * 0.2 : 0;
  const knockoutShare = totalKnockouts > 0 ? (player.knockouts / totalKnockouts) * 0.1 : 0;

  return killShare + damageShare + survivalShare + knockoutShare;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MvpOverlay() {
  const [mvp, setMvp] = useState<(Player & { mvpPoints: number; brandColor?: string; teamShort?: string; teamLogo?: string }) | null>(null);
  const [theme, setTheme] = useState({ accent_color: '#60a5fa' });
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(r => setTheme(r?.data ?? r)).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      const players = d.players || [];
      if (players.length === 0) return;

      // Compute MVP points for all players, find the highest
      let bestPlayer: Player | null = null;
      let bestPoints = -1;
      for (const p of players) {
        const pts = computeMvpPoints(p, players);
        if (pts > bestPoints) {
          bestPoints = pts;
          bestPlayer = p;
        }
      }

      if (!bestPlayer || bestPoints === 0) return;

      const team = d.teams.find(t => t.teamName === bestPlayer!.teamName);

      setMvp({
        ...bestPlayer,
        mvpPoints: bestPoints,
        brandColor: team?.brandColor,
        teamShort: team?.shortName || team?.displayName || bestPlayer.teamName,
        teamLogo: team?.logoPath64 || team?.logoPath,
      });

      if (!show) setTimeout(() => setShow(true), 300);
    }).catch(() => {});

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [show]);

  if (!mvp) return <style jsx global>{`body { background: transparent !important; margin: 0; }`}</style>;

  const accent = theme.accent_color || '#60a5fa';
  const color = mvp.brandColor || accent;
  const name = mvp.displayName || mvp.playerName;

  const stats = [
    { label: 'ELIMINATIONS', value: String(mvp.kills), highlight: true },
    { label: 'DAMAGE', value: String(mvp.damage) },
    { label: 'KNOCKDOWNS', value: String(mvp.knockouts) },
    { label: 'HEADSHOTS', value: String(mvp.headshots) },
    { label: 'ASSISTS', value: String(mvp.assists) },
    { label: 'HEALS', value: String(mvp.heal) },
  ];

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

          {/* MVP Points */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#8b8da6]">MVP Score</div>
            <div className="text-xl font-black" style={{ color: accent }}>{mvp.mvpPoints.toFixed(4)}</div>
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
          <div className="px-6 pb-3 grid grid-cols-2 gap-[2px]">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg"
                style={{
                  background: stat.highlight ? `${accent}22` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${stat.highlight ? accent + '33' : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b8da6]">{stat.label}</span>
                <span
                  className="text-sm font-black"
                  style={{ color: stat.highlight ? accent : '#fff' }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Survival Time + Rescues */}
          <div className="px-6 pb-5 flex gap-[2px]">
            <div
              className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-lg"
              style={{ background: accent, color: '#000' }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">SURVIVAL TIME</span>
              <span className="text-sm font-black">{formatTime(mvp.survivalTime)}</span>
            </div>
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b8da6] mr-3">RESCUES</span>
              <span className="text-sm font-black text-white">{mvp.rescues}</span>
            </div>
          </div>

          {/* MVP Formula bar */}
          <div className="px-6 pb-4">
            <div className="flex gap-[2px] rounded-lg overflow-hidden h-1.5">
              <div style={{ width: '40%', background: '#fbbf24' }} title="Kills 40%" />
              <div style={{ width: '30%', background: '#ef4444' }} title="Damage 30%" />
              <div style={{ width: '20%', background: '#10b981' }} title="Survival 20%" />
              <div style={{ width: '10%', background: '#3b82f6' }} title="Knockdowns 10%" />
            </div>
            <div className="flex justify-between mt-1 text-[8px] font-bold uppercase tracking-wider text-[#8b8da6]">
              <span style={{ color: '#fbbf24' }}>Kills 40%</span>
              <span style={{ color: '#ef4444' }}>Dmg 30%</span>
              <span style={{ color: '#10b981' }}>Survival 20%</span>
              <span style={{ color: '#3b82f6' }}>KO 10%</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
