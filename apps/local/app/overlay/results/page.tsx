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

interface LiveData {
  phase?: string;
  teams: Team[];
}

export default function ResultsOverlay() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [show, setShow] = useState(false);
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      if (d.teams.length > 0) {
        setTeams(d.teams);
        if (!show) setTimeout(() => setShow(true), 300);
      }
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [show]);

  if (teams.length === 0) return null;

  const p = PALETTES[themeIdx];
  const half = Math.ceil(teams.length / 2);
  const leftTeams = teams.slice(0, half);
  const rightTeams = teams.slice(half);

  function renderColumn(columnTeams: Team[], startRank: number) {
    return (
      <div style={{
        flex: 1, borderRadius: 12, overflow: 'hidden',
        border: '1px solid ' + p.separator,
      }}>
        {/* Column Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '32px 1fr 44px 50px',
          padding: '8px 12px',
          background: p.accent,
          fontSize: 9, fontWeight: 800, color: p.cardBg,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <span style={{ textAlign: 'center' }}>#</span>
          <span>TEAM</span>
          <span style={{ textAlign: 'center' }}>ELIMS</span>
          <span style={{ textAlign: 'center' }}>TOTAL</span>
        </div>

        {columnTeams.map((team, i) => {
          const name = team.displayName || team.teamName;
          const rank = startRank + i;

          return (
            <div key={name} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 44px 50px',
              alignItems: 'center',
              padding: '0 12px',
              height: 38,
              background: rank % 2 === 0 ? p.bg : p.cardBg,
              borderBottom: '1px solid ' + p.separator,
            }}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 12, fontWeight: 900, textAlign: 'center',
                color: rank <= 3 ? p.accent : p.textMuted,
              }}>#{rank}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <div style={{
                  width: 3, height: 18, borderRadius: 1, flexShrink: 0,
                  background: team.brandColor || '#fff',
                }} />
                {team.logoPath ? (
                  <img src={team.logoPath} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    background: (team.brandColor || '#fff') + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 900, color: team.brandColor || p.text,
                  }}>{(team.shortName || name).substring(0, 2)}</div>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: p.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
              </div>

              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textAlign: 'center', fontSize: 11, fontWeight: 700, color: p.textMuted,
              }}>{team.kills}</div>

              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textAlign: 'center', fontSize: 13, fontWeight: 900,
                color: rank <= 3 ? p.accent : p.text,
              }}>{team.totalPoints}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700;800;900&display=swap');
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}} />

      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 48,
        fontFamily: "'Inter', sans-serif",
        opacity: show ? 1 : 0,
        transition: 'opacity 0.7s ease',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontSize: 32, fontWeight: 900, color: p.text,
            fontFamily: "'Space Grotesk', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>MATCH RESULTS</div>
        </div>

        {/* Two-column table */}
        <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 900 }}>
          {renderColumn(leftTeams, 1)}
          {renderColumn(rightTeams, half + 1)}
        </div>
      </div>
    </>
  );
}
