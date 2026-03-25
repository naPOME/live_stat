'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';
import type { TeamStandings } from './OverallLeaderboardWidget';

/**
 * Social Media Overall Rankings — 2-column layout, all teams on one page.
 * Designed for sharing as a screenshot/image on social media.
 * Matches the official PUBG MOBILE broadcast visual style.
 */

interface OverallRankingSocialWidgetProps {
  teams: TeamStandings[];
  stageText?: string;
  matchText?: string;
  palette?: ColorPalette;
  backgroundImageUrl?: string;
}

export function OverallRankingSocialWidget({
  teams = [],
  stageText = 'GRAND FINAL',
  matchText = 'DAY 2  MATCH 8',
  palette = PALETTES[0],
  backgroundImageUrl,
}: OverallRankingSocialWidgetProps) {
  const p = palette;
  const mid = Math.ceil(teams.length / 2);
  const leftCol = teams.slice(0, mid);
  const rightCol = teams.slice(mid);

  const COL_GRID = '52px 36px 1fr 64px 56px 56px 72px';

  function TeamRow({ team, idx }: { team: TeamStandings; idx: number }) {
    const isEven = idx % 2 === 0;
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: COL_GRID,
        alignItems: 'center',
        height: 48,
        background: isEven ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Rank */}
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 18, fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
        }}>{team.rank}</div>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {team.logoUrl ? (
            <img src={team.logoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: 4,
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#fff',
            }}>{team.name.substring(0, 2).toUpperCase()}</div>
          )}
        </div>

        {/* Team Name */}
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 14, fontWeight: 700,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          paddingLeft: 8,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{team.name}</div>

        {/* WWCD */}
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 16, fontWeight: 700,
          color: team.wwcd > 0 ? '#fff' : 'rgba(255,255,255,0.4)',
          textAlign: 'center',
        }}>{team.wwcd}</div>

        {/* PP (Placement Points) */}
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 15, fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
        }}>{team.placement}</div>

        {/* FP (Frag/Kill Points) */}
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 15, fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
        }}>{team.eliminations}</div>

        {/* Total */}
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 18, fontWeight: 900,
          color: '#fff',
          textAlign: 'center',
          background: team.rank <= 3 ? 'rgba(241,194,50,0.15)' : 'transparent',
          height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{team.totalPoints}</div>
      </div>
    );
  }

  function ColumnHeader() {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: COL_GRID,
        alignItems: 'center',
        height: 40,
        background: p.accent,
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 11,
        fontWeight: 800,
        color: p.badgeText,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        <div style={{ textAlign: 'center' }}></div>
        <div></div>
        <div style={{ paddingLeft: 8 }}>Teams</div>
        <div style={{ textAlign: 'center' }}>WWCD</div>
        <div style={{ textAlign: 'center' }}>PP</div>
        <div style={{ textAlign: 'center' }}>FP</div>
        <div style={{ textAlign: 'center' }}>Total</div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
      `}} />

      <div style={{
        width: '100%',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Roboto', sans-serif",
        background: '#0a0a0a',
      }}>
        {/* Cinematic background */}
        {backgroundImageUrl && (
          <img src={backgroundImageUrl} alt="" style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.35,
          }} />
        )}
        {/* Dark gradient overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'linear-gradient(180deg, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0.5) 50%, rgba(10,10,10,0.85) 100%)',
        }} />
        {/* Golden particle glow at top */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '80%', height: 200,
          background: `radial-gradient(ellipse at center, ${p.accent}22 0%, transparent 70%)`,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, padding: '40px 48px 32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
            {/* PUBG MOBILE logo — top-left */}
            <div>
              <img
                src="/logo/PUBG_Mobile_Esports_Black@2048px.png"
                alt="PUBG MOBILE"
                style={{ height: 56, objectFit: 'contain', filter: 'invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
              />
            </div>

            {/* Title center */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <h1 style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 52, fontWeight: 900,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                margin: 0, lineHeight: 1,
                textShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 60px ${p.accent}33`,
              }}>Overall Rankings</h1>
            </div>

            {/* Stage + Match badge — top-right */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 16, fontWeight: 800,
                color: p.accent,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textShadow: `0 0 20px ${p.accent}44`,
              }}>{stageText}</span>
              <span style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 13, fontWeight: 800,
                color: p.badgeText,
                background: p.accent,
                padding: '5px 16px',
                borderRadius: 4,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>{matchText}</span>
            </div>
          </div>

          {/* Two-column table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 0 }}>
            {/* Left column (1 to mid) */}
            <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid rgba(255,255,255,0.08)` }}>
              <ColumnHeader />
              {leftCol.map((team, idx) => (
                <TeamRow key={team.rank} team={team} idx={idx} />
              ))}
            </div>

            {/* Spacer */}
            <div />

            {/* Right column (mid+1 to end) */}
            <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid rgba(255,255,255,0.08)` }}>
              <ColumnHeader />
              {rightCol.map((team, idx) => (
                <TeamRow key={team.rank} team={team} idx={idx} />
              ))}
            </div>
          </div>

          {/* CI logos — bottom-left */}
          <div style={{ marginTop: 24 }}>
            <img
              src="/logo/[General]Black.png"
              alt="KRAFTON / Level Infinite / Lightspeed Studios"
              style={{ height: 20, objectFit: 'contain', filter: 'invert(1)', opacity: 0.7 }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default OverallRankingSocialWidget;
