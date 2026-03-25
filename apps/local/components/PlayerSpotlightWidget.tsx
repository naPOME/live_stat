'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

interface PlayerSpotlightWidgetProps {
  playerName: string;
  teamName: string;
  teamLogoUrl?: string;
  playerImageUrl?: string;
  stats: {
    eliminations: number;
    damage: number;
    headshotHitRate: number;
    assists: number;
    survivalTime: string;
    longestKill: number;
  };
  palette?: ColorPalette;
  bannerImageUrl?: string;
  transparent?: boolean;
}

export function PlayerSpotlightWidget({
  playerName,
  teamName,
  teamLogoUrl,
  playerImageUrl,
  stats,
  palette = PALETTES[0],
  bannerImageUrl,
  transparent = false,
}: PlayerSpotlightWidgetProps) {
  const p = palette;
  const shellBg = transparent ? 'rgba(14, 14, 14, 0.18)' : p.bg;
  const cardBg = transparent ? 'rgba(22, 22, 22, 0.48)' : p.cardBg;
  const separator = transparent ? 'rgba(255, 255, 255, 0.12)' : p.separator;
  const cardShadow = transparent ? '0 10px 36px rgba(0,0,0,0.22)' : p.cardShadow;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
      `}} />

      <div style={{ background: shellBg, width: '100%', padding: '64px 24px', fontFamily: "'Roboto', sans-serif" }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Main Card Container */}
          <div style={{ position: 'relative', background: cardBg, borderRadius: 24, boxShadow: cardShadow, border: `1px solid ${separator}`, overflow: 'hidden' }}>
            
            {/* Cinematic Background Banner */}
            {bannerImageUrl && (
               <img src={bannerImageUrl} alt="MVP Banner" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3, mixBlendMode: 'luminosity' }} />
            )}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: transparent ? 'linear-gradient(90deg, rgba(22,22,22,0.66) 0%, rgba(22,22,22,0.42) 30%, rgba(22,22,22,0.16) 80%)' : `linear-gradient(90deg, ${p.cardBg}f0%, ${p.cardBg}cc 30%, ${p.cardBg} 80%)` }}></div>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: transparent ? 'linear-gradient(270deg, rgba(22,22,22,0.46) 40%, transparent 100%)' : `linear-gradient(270deg, ${p.cardBg} 40%, transparent 100%)` }}></div>

            <div style={{ position: 'relative', zIndex: 10, display: 'flex', minHeight: 460 }}>
              
              {/* Left Side: Player Image */}
              <div style={{ width: 400, position: 'relative', borderRight: `2px solid ${separator}`, background: `linear-gradient(180deg, ${p.accent}20 0%, transparent 100%)` }}>
                {playerImageUrl ? (
                  <img src={playerImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} alt={playerName} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={p.separator} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 160, background: `linear-gradient(0deg, ${cardBg} 0%, transparent 100%)` }}></div>
              </div>

              {/* Right Side: Data */}
              <div style={{ flex: 1, padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                
                {/* Headers */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 700, color: p.cardBg, background: p.accent, padding: '4px 12px', borderRadius: 4, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        MVP SPOTLIGHT
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>MATCH 15</span>
                    </div>
                    <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 56, fontWeight: 900, color: p.headerText, margin: 0, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', textShadow: `0 4px 12px ${p.bg}` }}>
                      {playerName}
                    </h1>
                    <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 28, fontWeight: 700, color: p.text, margin: 0, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {teamName}
                    </h2>
                  </div>
                  
                  {/* Team Logo Overlay (Top Right of Card) */}
                  {teamLogoUrl && (
                    <img src={teamLogoUrl} alt={teamName} style={{ width: 100, height: 100, objectFit: 'contain', filter: `drop-shadow(0 4px 12px ${p.bg})` }} />
                  )}
                </div>

                {/* Stat Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 32px' }}>
                  
                  {/* Main Primary Stats */}
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: 32, paddingBottom: 24, borderBottom: `1px solid ${p.separator}` }}>
                     <div style={{ flex: 1 }}>
                       <div style={{ fontSize: 12, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>Eliminations</div>
                       <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 48, fontWeight: 900, color: p.accent, lineHeight: 1 }}>{stats.eliminations}</div>
                     </div>
                     <div style={{ width: 2, background: p.separator, opacity: 0.5 }}></div>
                     <div style={{ flex: 1 }}>
                       <div style={{ fontSize: 12, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>Damage Dealt</div>
                       <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 48, fontWeight: 900, color: p.text, lineHeight: 1 }}>{stats.damage}</div>
                     </div>
                  </div>
                  
                  {/* Assists */}
                  <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 24, borderBottom: `1px solid ${p.separator}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>Assists</div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 32, fontWeight: 800, color: p.text, lineHeight: 1 }}>{stats.assists}</div>
                  </div>

                  {/* Secondary Stats Row */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>Headshot %</div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 28, fontWeight: 800, color: p.text, lineHeight: 1 }}>{stats.headshotHitRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>Longest Kill</div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 28, fontWeight: 800, color: p.text, lineHeight: 1 }}>{stats.longestKill}m</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>Survival Time</div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 28, fontWeight: 800, color: p.text, lineHeight: 1 }}>{stats.survivalTime}</div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PlayerSpotlightWidget;
