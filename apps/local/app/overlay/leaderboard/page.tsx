'use client';

import { useEffect, useState, useRef } from 'react';
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
  const themeIdx = useGlobalTheme();
  const prevPoints = useRef<Record<string, number>>({});
  const [flashing, setFlashing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      const newFlash: Record<string, boolean> = {};
      for (const t of d.teams) {
        const key = t.displayName || t.teamName;
        const prev = prevPoints.current[key];
        if (prev !== undefined && prev !== t.totalPoints) newFlash[key] = true;
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

  const p = PALETTES[themeIdx];
  const teams = data.teams.slice(0, 16);

  const renderAliveDots = (alive: number) => (
    <div style={{ display: 'flex', gap: 2 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{
          width: 3, height: 14, borderRadius: 1,
          background: i < alive ? p.accent : 'rgba(255,255,255,0.1)',
        }} />
      ))}
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700;800;900&display=swap');
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}} />

      <div style={{
        position: 'fixed', top: 0, right: 0,
        width: 420, height: '100vh',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '32px 1fr 50px 40px 50px',
          padding: '10px 12px',
          background: p.accent,
          fontSize: 10, fontWeight: 800, color: p.cardBg,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <span style={{ textAlign: 'center' }}>#</span>
          <span>TEAMS</span>
          <span style={{ textAlign: 'center' }}>ALIVE</span>
          <span style={{ textAlign: 'center' }}>PTS</span>
          <span style={{ textAlign: 'center' }}>ELIM</span>
        </div>

        {/* Team Rows */}
        {teams.map((team, i) => {
          const name = team.displayName || team.teamName;
          const isFlash = flashing[name];
          const isElim = !team.alive && team.liveMemberNum === 0;
          const rank = i + 1;

          return (
            <div key={name} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 50px 40px 50px',
              alignItems: 'center',
              padding: '0 12px',
              height: 42,
              background: isFlash ? p.accent + '22' : (i % 2 === 0 ? p.cardBg : p.bg),
              borderBottom: '1px solid ' + p.separator,
              opacity: isElim ? 0.4 : 1,
              filter: isElim ? 'grayscale(80%)' : 'none',
              transition: 'background 0.3s',
            }}>
              {/* Rank */}
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14, fontWeight: 900, textAlign: 'center',
                color: rank <= 3 ? p.accent : p.textMuted,
              }}>{rank}</div>

              {/* Team */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <div style={{
                  width: 3, height: 22, borderRadius: 1, flexShrink: 0,
                  background: team.brandColor || p.textMuted,
                }} />
                {team.logoPath ? (
                  <img src={team.logoPath} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                    background: (team.brandColor || '#fff') + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 900, color: team.brandColor || p.text,
                  }}>{(team.shortName || name).substring(0, 2)}</div>
                )}
                <span style={{
                  fontSize: 12, fontWeight: 700, color: p.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{name}</span>
              </div>

              {/* Alive */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderAliveDots(team.liveMemberNum)}
              </div>

              {/* Points */}
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textAlign: 'center', fontSize: 14, fontWeight: 900,
                color: isFlash ? p.accent : p.text,
              }}>{team.totalPoints}</div>

              {/* Kills */}
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textAlign: 'center', fontSize: 12, fontWeight: 700,
                color: p.textMuted,
              }}>{team.kills}</div>
            </div>
          );
        })}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: '6px 12px',
          background: p.cardBg, borderTop: '1px solid ' + p.separator,
          fontSize: 9, fontWeight: 700, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 3, height: 10, borderRadius: 1, background: p.accent }} /> ALIVE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 3, height: 10, borderRadius: 1, background: 'rgba(255,255,255,0.1)' }} /> DEAD
          </span>
        </div>
      </div>
    </>
  );
}
