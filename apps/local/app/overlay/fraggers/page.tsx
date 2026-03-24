'use client';

import { useEffect, useState } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

interface Player {
  playerName: string;
  displayName?: string;
  teamName: string;
  kills: number;
  damage?: number;
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
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      const teamMap = new Map<string, Team>();
      for (const t of d.teams) teamMap.set(t.teamName, t);

      const sorted = (d.players || [])
        .filter(p => p.kills > 0)
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 5)
        .map(pl => {
          const team = teamMap.get(pl.teamName);
          return { ...pl, brandColor: team?.brandColor, teamDisplayName: team?.displayName || team?.teamName };
        });
      setTopPlayers(sorted);
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (topPlayers.length === 0) return null;

  const p = PALETTES[themeIdx];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700;800;900&display=swap');
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}} />

      <div style={{
        position: 'fixed', bottom: 48, left: '50%', transform: 'translateX(-50%)',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            display: 'inline-block',
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em',
            padding: '4px 14px', borderRadius: 100,
            background: p.accent + '22', color: p.accent,
          }}>THIS GAME</div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 26, fontWeight: 900, color: p.text,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            margin: '8px 0 0',
          }}>TOP FRAGGERS</h2>
        </div>

        {/* Players Row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          {topPlayers.map((pl, i) => {
            const color = pl.brandColor || p.accent;
            return (
              <div key={i} style={{
                width: 160, display: 'flex', flexDirection: 'column', alignItems: 'center',
                borderRadius: 12, overflow: 'hidden',
                background: p.cardBg,
                border: i === 0 ? '2px solid ' + p.accent : '1px solid ' + p.separator,
              }}>
                {/* Player Silhouette */}
                <div style={{
                  width: '100%', height: 120,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  background: color + '11',
                }}>
                  <svg width="50" height="70" viewBox="0 0 60 80" fill="none">
                    <circle cx="30" cy="20" r="14" fill={p.textMuted + '33'} />
                    <path d="M8 75C8 55 15 42 30 42C45 42 52 55 52 75" fill={p.textMuted + '22'} />
                  </svg>
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 4,
                      background: p.accent, color: p.cardBg,
                    }}>MVP</div>
                  )}
                </div>

                {/* Name Badge */}
                <div style={{
                  width: '100%', padding: '8px 12px', textAlign: 'center',
                  background: color + '33',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: p.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pl.displayName || pl.playerName}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ width: '100%', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 28, fontWeight: 900, color: p.accent,
                  }}>{pl.kills}</div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: p.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>ELIMS</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
