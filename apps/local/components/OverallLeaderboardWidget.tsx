'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export type TeamStandings = {
  rank: number;
  name: string;
  logoUrl?: string;
  wwcd: number; // Chicken Dinners / Wins
  eliminations: number;
  placement: number;
  totalPoints: number;
  rankChange?: number; // E.g., 2 (up 2 spots), -1 (down 1 spot), 0 (no change)
};

interface OverallLeaderboardWidgetProps {
  teams: TeamStandings[];
  stageText?: string;
  matchText?: string;
  palette?: ColorPalette;
  headerImageUrl?: string;
}

export function OverallLeaderboardWidget({
  teams = [],
  stageText = "GRAND FINALS",
  matchText = "OVERALL STANDINGS",
  palette = PALETTES[0],
  headerImageUrl,
}: OverallLeaderboardWidgetProps) {
  const p = palette;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700;800&display=swap');
      `}} />

      <div style={{ background: p.bg, width: '100%', padding: '48px 24px 56px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* Header Area (Banner) */}
          <div style={{ 
            position: 'relative', 
            borderRadius: 16, 
            overflow: 'hidden', 
            marginBottom: 40, 
            background: p.cardBg, 
            boxShadow: p.cardShadow,
            border: `1px solid ${p.separator}`,
            minHeight: 180,
            display: 'flex'
          }}>
            {/* Background Image & Gradient Masks */}
            {headerImageUrl && (
               <img src={headerImageUrl} alt="Tournament Banner" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6, mixBlendMode: 'luminosity' }} />
            )}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `linear-gradient(90deg, ${p.cardBg} 25%, ${p.cardBg}dd 50%, transparent 100%)` }}></div>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: `linear-gradient(270deg, ${p.cardBg}cc 0%, transparent 100%)` }}></div>

            {/* Content Content */}
            <div style={{ position: 'relative', zIndex: 10, padding: '32px 48px', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: p.accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                  TOURNAMENT
                </div>
                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, color: p.headerText, margin: 0, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', textShadow: `0 4px 12px ${p.bg}` }}>
                  Leaderboard
                </h1>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: p.text, letterSpacing: '0.05em', textTransform: 'uppercase', textShadow: `0 2px 8px ${p.bg}` }}>
                  {stageText}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: p.badgeText, background: p.badgeBg, padding: '6px 16px', borderRadius: 4, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: `0 2px 8px ${p.bg}` }}>
                  {matchText}
                </span>
              </div>
            </div>
          </div>

          {/* Leaderboard Table Container */}
          <div style={{ background: p.cardBg, borderRadius: 16, boxShadow: p.cardShadow, overflow: 'hidden', border: `1px solid ${p.separator}` }}>
            
            {/* Table Header Row */}
            <div style={{ 
              display: 'grid', gridTemplateColumns: '60px 40px 1fr 100px 100px 120px 140px', 
              background: `${p.accent}10`, padding: '16px 24px', borderBottom: `2px solid ${p.separator}`,
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: p.textMuted,
              letterSpacing: '0.15em', textTransform: 'uppercase', alignItems: 'center'
            }}>
              <div style={{ textAlign: 'center' }}>Rank</div>
              <div></div> {/* Spacer for Rank Change */}
              <div style={{ paddingLeft: 12 }}>Team</div>
              <div style={{ textAlign: 'center' }}>WWCD</div>
              <div style={{ textAlign: 'center' }}>Elims</div>
              <div style={{ textAlign: 'center' }}>Placement</div>
              <div style={{ textAlign: 'center', color: p.accentDark }}>Total Pts</div>
            </div>

            {/* Table Body */}
            <div>
              {teams.map((team, idx) => {
                const isEven = idx % 2 === 0;
                const isTop3 = team.rank <= 3;
                
                return (
                  <div key={idx} style={{ 
                    display: 'grid', gridTemplateColumns: '60px 40px 1fr 100px 100px 120px 140px', 
                    padding: '14px 24px', alignItems: 'center',
                    background: isEven ? 'transparent' : `${p.separator}40`,
                    borderBottom: idx === teams.length - 1 ? 'none' : `1px solid ${p.separator}`,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${p.accent}08`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isEven ? 'transparent' : `${p.separator}40`; }}
                  >
                    
                    {/* Rank Number */}
                    <div style={{ 
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, textAlign: 'center',
                      color: isTop3 ? p.accent : p.textMuted 
                    }}>
                      #{team.rank}
                    </div>

                    {/* Rank Change Arrow */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {team.rankChange && team.rankChange > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#16a34a', fontSize: 12, fontWeight: 700 }}>
                          <span style={{ fontSize: 14 }}>▲</span>{team.rankChange}
                        </div>
                      ) : team.rankChange && team.rankChange < 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#dc2626', fontSize: 12, fontWeight: 700 }}>
                          <span style={{ fontSize: 14 }}>▼</span>{Math.abs(team.rankChange)}
                        </div>
                      ) : (
                        <div style={{ color: p.textMuted, fontSize: 14, fontWeight: 700 }}>-</div>
                      )}
                    </div>

                    {/* Team Name and Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 12 }}>
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} style={{ width: 44, height: 44, objectFit: 'contain', background: 'white', borderRadius: 8, padding: 4, border: `1px solid ${p.separator}` }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: `${p.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${p.accent}40`, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: p.accent }}>
                          {team.name.substring(0,2).toUpperCase()}
                        </div>
                      )}
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: p.text, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        {team.name}
                      </div>
                    </div>

                    {/* WWCD */}
                    <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: team.wwcd > 0 ? p.accent : p.textMuted }}>
                      {team.wwcd > 0 ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>🐔</span>{team.wwcd}
                        </div>
                      ) : '-'}
                    </div>

                    {/* Eliminations */}
                    <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: p.textMuted }}>
                      {team.eliminations}
                    </div>

                    {/* Placement Points */}
                    <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: p.textMuted }}>
                      {team.placement}
                    </div>

                    {/* Total Points (Highlighted) */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ 
                        background: isTop3 ? p.accent : `${p.accent}15`, 
                        color: isTop3 ? p.cardBg : p.accentDark,
                        padding: '6px 16px', borderRadius: 8,
                        fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, minWidth: 80, textAlign: 'center',
                        boxShadow: isTop3 ? `0 4px 12px ${p.accent}40` : 'none'
                      }}>
                        {team.totalPoints}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

          {/* Footer or minor sponsors could go here */}
        </div>
      </div>
    </>
  );
}

export default OverallLeaderboardWidget;
