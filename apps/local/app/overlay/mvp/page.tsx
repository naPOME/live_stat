'use client';

import { useEffect, useState } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

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
}

interface LiveData {
  phase?: string;
  teams: Team[];
  players?: Player[];
}

function computeMvpPoints(player: Player, allPlayers: Player[]): number {
  const totalKills = allPlayers.reduce((s, p) => s + p.kills, 0);
  const totalDamage = allPlayers.reduce((s, p) => s + p.damage, 0);
  const totalKnockouts = allPlayers.reduce((s, p) => s + p.knockouts, 0);
  const globalAvgSurvival = allPlayers.length > 0
    ? allPlayers.reduce((s, p) => s + p.survivalTime, 0) / allPlayers.length : 0;
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
  const [show, setShow] = useState(false);
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      const players = d.players || [];
      if (players.length === 0) return;

      let bestPlayer: Player | null = null;
      let bestPoints = -1;
      for (const pl of players) {
        const pts = computeMvpPoints(pl, players);
        if (pts > bestPoints) { bestPoints = pts; bestPlayer = pl; }
      }
      if (!bestPlayer || bestPoints === 0) return;

      const team = d.teams.find(t => t.teamName === bestPlayer!.teamName);
      setMvp({
        ...bestPlayer,
        mvpPoints: bestPoints,
        brandColor: team?.brandColor,
        teamShort: team?.shortName || team?.displayName || bestPlayer.teamName,
        teamLogo: team?.logoPath,
      });
      if (!show) setTimeout(() => setShow(true), 300);
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [show]);

  if (!mvp) return null;

  const p = PALETTES[themeIdx];
  const color = mvp.brandColor || p.accent;
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
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700;800;900&display=swap');
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}} />

      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        opacity: show ? 1 : 0, transform: show ? 'scale(1)' : 'scale(0.9)',
        transition: 'all 0.7s ease',
      }}>
        <div style={{
          display: 'flex', overflow: 'hidden', borderRadius: 16,
          border: '2px solid ' + p.accent + '33',
          maxWidth: 700,
        }}>
          {/* Left: Player Silhouette */}
          <div style={{
            width: 240, position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(180deg, ${p.cardBg} 0%, ${p.accent}15 100%)`,
          }}>
            {/* MVP watermark */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', pointerEvents: 'none', opacity: 0.05 }}>
              <span style={{ fontSize: 120, fontWeight: 900, color: p.text, letterSpacing: '-0.05em' }}>MVP</span>
            </div>

            <svg width="120" height="160" viewBox="0 0 120 160" fill="none" style={{ position: 'relative', zIndex: 1 }}>
              <circle cx="60" cy="40" r="28" fill={p.textMuted + '33'} />
              <path d="M16 150C16 110 30 84 60 84C90 84 104 110 104 150" fill={p.textMuted + '22'} />
            </svg>

            <div style={{ position: 'absolute', top: 16, left: 16, fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 900, color: p.accent, textShadow: `0 0 20px ${p.accent}44` }}>
              MVP
            </div>

            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: p.textMuted }}>MVP Score</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 900, color: p.accent }}>{mvp.mvpPoints.toFixed(4)}</div>
            </div>
          </div>

          {/* Right: Info Panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: p.cardBg }}>
            {/* Team + Player Name */}
            <div style={{ padding: '20px 24px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {mvp.teamLogo ? (
                  <img src={mvp.teamLogo} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: 20, height: 20, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, background: color + '33', color }}>{(mvp.teamShort || '').substring(0, 2)}</div>
                )}
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>{mvp.teamShort}</span>
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 900, color: p.text, textTransform: 'uppercase' }}>{name}</div>
            </div>

            {/* Stats Grid */}
            <div style={{ padding: '0 24px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {stats.map((stat, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderRadius: 8,
                  background: stat.highlight ? p.accent + '22' : p.bg,
                  border: '1px solid ' + (stat.highlight ? p.accent + '33' : p.separator),
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: p.textMuted }}>{stat.label}</span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 900, color: stat.highlight ? p.accent : p.text }}>{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Survival Time + Rescues */}
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 2 }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderRadius: 8,
                background: p.accent, color: p.cardBg,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SURVIVAL</span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 900 }}>{formatTime(mvp.survivalTime)}</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderRadius: 8,
                background: p.bg, border: '1px solid ' + p.separator,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: p.textMuted, marginRight: 12 }}>RESCUES</span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 900, color: p.text }}>{mvp.rescues}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
