'use client';

import { useEffect, useState } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

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
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      if (d.teams.length > 0) {
        const winTeam = d.teams[0];
        setWinner(winTeam);
        const teamPlayers = (d.players || [])
          .filter(pl => pl.teamName === winTeam.teamName)
          .sort((a, b) => b.kills - a.kills);
        setPlayers(teamPlayers);
        setTimeout(() => setShow(true), 200);
      }
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (!winner) return null;

  const p = PALETTES[themeIdx];
  const name = winner.displayName || winner.teamName;
  const color = winner.brandColor || p.accent;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}} />

      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Roboto', sans-serif",
        opacity: show ? 1 : 0, transform: show ? 'scale(1)' : 'scale(0.9)',
        transition: 'all 1s ease',
      }}>
        {/* Tournament Label */}
        <div style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em',
          padding: '5px 18px', borderRadius: 100,
          background: p.accent, color: p.cardBg,
          marginBottom: 12,
        }}>
          PUBG MOBILE TOURNAMENT
        </div>

        {/* WWCD Title */}
        <h1 style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 52, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: p.accent,
          textShadow: `0 0 40px ${p.accent}44, 0 0 80px ${p.accent}22`,
          margin: '0 0 24px',
        }}>
          WINNER WINNER CHICKEN DINNER
        </h1>

        {/* Player Silhouettes */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 24 }}>
          {players.slice(0, 4).map((pl, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 120, height: 140, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
                background: p.bg, border: '1px solid ' + p.separator,
              }}>
                <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
                  <circle cx="30" cy="20" r="14" fill={p.textMuted + '33'} />
                  <path d="M8 75C8 55 15 42 30 42C45 42 52 55 52 75" fill={p.textMuted + '22'} />
                </svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: p.text }}>{pl.displayName || pl.playerName}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: p.accent }}>{pl.kills} ELIMS</span>
            </div>
          ))}
        </div>

        {/* Team Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {winner.logoPath ? (
            <img src={winner.logoPath} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain' }} />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900,
              background: color + '33', color,
            }}>{(winner.shortName || name).substring(0, 2)}</div>
          )}
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 26, fontWeight: 800, color: p.text }}>{name}</span>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'flex', borderRadius: 12, overflow: 'hidden',
          border: '2px solid ' + p.accent + '33',
        }}>
          {[
            { label: 'WWCD', value: '1' },
            { label: 'TOTAL ELIMS', value: String(winner.kills) },
            { label: 'PLACEMENT PTS', value: String(winner.placementPoints) },
            { label: 'TOTAL POINTS', value: String(winner.totalPoints) },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: '12px 32px', textAlign: 'center',
              background: i === 0 ? p.accent : p.cardBg,
              color: i === 0 ? p.cardBg : p.text,
              borderLeft: i > 0 ? '1px solid ' + p.separator : 'none',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                color: i === 0 ? p.cardBg : p.textMuted, marginBottom: 4,
              }}>{stat.label}</div>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 24, fontWeight: 900,
              }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
