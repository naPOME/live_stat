'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export interface SidebarTeam {
  rank: number;
  name: string;
  logoUrl?: string;
  bannerUrl?: string; // Optional custom team banner
  playersAlive: number;
  matchKills: number;
  totalPoints: number;
}

interface MatchLeaderboardSidebarProps {
  teams: SidebarTeam[];
  title?: string;
  palette?: ColorPalette;
  matchBannerUrl?: string; // The overall cinematic banner
}

export function MatchLeaderboardSidebar({
  teams = [],
  title = "LIVE MATCH STANDINGS",
  palette = PALETTES[0],
  matchBannerUrl
}: MatchLeaderboardSidebarProps) {
  const p = palette;

  // Minimalist dots for alive players
  const renderAliveDots = (alive: number) => {
    return (
      <div style={{ display: 'flex', gap: 3 }}>
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            style={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%',
              background: i < alive ? p.accent : 'rgba(255,255,255,0.2)',
              boxShadow: i < alive ? `0 0 4px ${p.accent}` : 'none',
              opacity: i < alive ? 1 : 0.5
            }} 
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
      `}} />

      <div style={{
        position: 'absolute',
        bottom: 40,
        right: 48,
        width: 440,
        display: 'flex',
        flexDirection: 'column',
        gap: 2, // Very tight minimal gap
        fontFamily: "'Roboto', sans-serif"
      }}>
        
        {/* Minimalist Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 60px 40px 50px',
          padding: '8px 12px',
          background: p.cardBg,
          backdropFilter: 'blur(10px)',
          borderLeft: '4px solid ' + p.accent,
          borderTopRightRadius: 4,
          fontSize: 10,
          fontWeight: 800,
          color: p.textMuted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          border: '1px solid ' + p.separator,
          borderBottom: 'none'
        }}>
          <div style={{ textAlign: 'center' }}>RNK</div>
          <div style={{ color: p.accent }}>{title}</div>
          <div style={{ textAlign: 'center' }}>ALIVE</div>
          <div style={{ textAlign: 'center' }}>KIL</div>
          <div style={{ textAlign: 'center' }}>PTS</div>
        </div>

        {/* Minimalist Banner Rows (Light Theme Mapped) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {teams.map((team, idx) => {
            const isEliminated = team.playersAlive === 0;
            const bgImage = team.bannerUrl; // Do NOT fallback to matchBannerUrl, it makes it muddy

            return (
              <div 
                key={idx} 
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 60px 40px 50px',
                  alignItems: 'center',
                  height: 44, // Very tight, uniform height
                  background: bgImage ? 'url("' + bgImage + '") right center/cover no-repeat' : p.cardBg,
                  borderRadius: 2,
                  border: '1px solid ' + p.separator,
                  overflow: 'hidden',
                  opacity: isEliminated ? 0.6 : 1,
                  filter: isEliminated ? 'grayscale(100%)' : 'none',
                }}
              >
                {/* Overlay over the banner image to make text legible */}
                {bgImage && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'linear-gradient(90deg, ' + p.cardBg + ' 0%, transparent 100%)',
                    zIndex: 0
                  }} />
                )}

                {/* Rank */}
                <div style={{ 
                  position: 'relative', zIndex: 1,
                  fontFamily: "'Montserrat', sans-serif", 
                  fontSize: 18, 
                  fontWeight: 900, 
                  color: idx < 3 ? p.accent : p.textMuted,
                  textAlign: 'center'
                }}>
                  {team.rank}
                </div>

                {/* Team Info */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', overflow: 'hidden' }}>
                  {team.logoUrl && (
                    <img src={team.logoUrl} alt={team.name} style={{ width: 24, height: 24, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                  )}
                  {(!team.logoUrl) && (
                     <div style={{ width: 24, height: 24, background: p.bg, borderRadius: 2, border: '1px solid ' + p.separator, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: p.text }}>
                       {team.name.substring(0,2)}
                     </div>
                  )}
                  <span style={{ 
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 15, 
                    fontWeight: 800, 
                    color: p.text, 
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    textDecoration: isEliminated ? 'line-through' : 'none',
                    textDecorationColor: '#ef4444'
                  }}>
                    {team.name}
                  </span>
                </div>

                {/* Alive Indicator Bars */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center' }}>
                  {renderAliveDots(team.playersAlive)}
                </div>

                {/* Kills */}
                <div style={{ 
                  position: 'relative', zIndex: 1,
                  fontFamily: "'Montserrat', sans-serif", 
                  textAlign: 'center', 
                  fontSize: 16, 
                  fontWeight: 800, 
                  color: p.textMuted 
                }}>
                  {team.matchKills}
                </div>
                
                {/* Points */}
                <div style={{ 
                  position: 'relative', zIndex: 1,
                  fontFamily: "'Montserrat', sans-serif", 
                  textAlign: 'center', 
                  fontSize: 18, 
                  fontWeight: 900, 
                  color: idx < 3 ? p.text : p.accent
                }}>
                  {team.totalPoints}
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default MatchLeaderboardSidebar;
