'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export type MatchPlayerStat = {
  name: string;
  eliminations: number;
  damage: number;
  assists: number;
  imageUrl?: string;
};

interface MatchResultsWidgetProps {
  teamName: string;
  teamLogo?: string;
  matchTotalPoints: number;
  matchElims: number;
  matchDamage: number;
  players: MatchPlayerStat[];
  stageText?: string;
  matchText?: string;
  palette?: ColorPalette;
  bannerImageUrl?: string;
  transparent?: boolean;
}

export function MatchResultsWidget({
  teamName = "ALPHA 7 ESPORTS",
  teamLogo,
  matchTotalPoints = 28,
  matchElims = 18,
  matchDamage = 4520,
  players = [],
  stageText = "GRAND FINALS",
  matchText = "MATCH 1 WINNER",
  palette = PALETTES[0],
  bannerImageUrl,
  transparent = false,
}: MatchResultsWidgetProps) {
  const p = palette;
  const shellBg = transparent ? 'rgba(14, 14, 14, 0.18)' : p.bg;
  const cardBg = transparent ? 'rgba(22, 22, 22, 0.48)' : p.cardBg;
  const separator = transparent ? 'rgba(255, 255, 255, 0.12)' : p.separator;
  const cardShadow = transparent ? '0 10px 36px rgba(0,0,0,0.22)' : p.cardShadow;
  const displayPlayers = players.length > 0 ? players : Array(4).fill({});

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
      `}} />

      <div style={{ background: shellBg, width: '100%', padding: '48px 24px 64px', fontFamily: "'Roboto', sans-serif" }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, paddingBottom: 20, borderBottom: `2px solid ${p.separator}` }}>
            <div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 700, color: '#eab308', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                WINNER WINNER CHICKEN DINNER
              </div>
              <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, color: p.headerText, margin: 0, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                Match Results
              </h1>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: 800, color: p.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {stageText}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: p.badgeText, background: p.badgeBg, padding: '6px 16px', borderRadius: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {matchText}
              </span>
            </div>
          </div>

          {/* Main Winner Card */}
          <div style={{ background: cardBg, borderRadius: 24, boxShadow: cardShadow, border: `1px solid ${separator}`, overflow: 'hidden' }}>
            
            {/* Top Section: Team & Overall Stats */}
            <div style={{ position: 'relative', overflow: 'hidden', padding: '48px 40px', display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${separator}` }}>
              
              {/* Cinematic Background Banner */}
              {bannerImageUrl && (
                 <img src={bannerImageUrl} alt="WWCD Banner" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, mixBlendMode: 'luminosity' }} />
              )}
               <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: transparent ? `linear-gradient(135deg, rgba(22,22,22,0.62) 20%, rgba(22,22,22,0.36) 60%, transparent 100%)` : `linear-gradient(135deg, ${p.cardBg} 20%, ${p.cardBg}dd 60%, transparent 100%)` }}></div>
               <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: transparent ? 'linear-gradient(270deg, rgba(22,22,22,0.50) 0%, transparent 100%)' : `linear-gradient(270deg, ${p.cardBg}cc 0%, transparent 100%)` }}></div>

              {/* Added accent glow from the original design */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `linear-gradient(135deg, ${p.accent}20 0%, transparent 100%)` }}></div>
              
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: 24 }}>
                {teamLogo ? (
                  <img src={teamLogo} alt={teamName} style={{ width: 120, height: 120, objectFit: 'contain', background: 'white', borderRadius: 20, padding: 12, border: `2px solid ${p.separator}` }} />
                ) : (
                  <div style={{ width: 120, height: 120, borderRadius: 20, background: `${p.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${p.accent}40`, fontFamily: "'Montserrat', sans-serif", fontSize: 48, fontWeight: 800, color: p.accent }}>
                    {teamName.substring(0,2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 700, color: p.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
                    CHAMPIONS
                  </div>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 48, fontWeight: 800, color: p.text, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                    {teamName}
                  </div>
                </div>
              </div>

              <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: 32 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase', textShadow: `0 2px 8px ${p.cardBg}` }}>Match Elims</div>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 40, fontWeight: 800, color: p.text, lineHeight: 1, textShadow: `0 4px 12px ${p.cardBg}` }}>{matchElims}</div>
                </div>
                <div style={{ width: 2, background: p.separator, opacity: 0.5 }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase', textShadow: `0 2px 8px ${p.cardBg}` }}>Match Dmg</div>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 40, fontWeight: 800, color: p.text, lineHeight: 1, textShadow: `0 4px 12px ${p.cardBg}` }}>{matchDamage}</div>
                </div>
                <div style={{ width: 2, background: p.separator, opacity: 0.5 }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: p.accent, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase', textShadow: `0 2px 8px ${p.cardBg}` }}>Total Pts</div>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 48, fontWeight: 800, color: p.accent, lineHeight: 1, textShadow: `0 4px 12px ${p.cardBg}` }}>+{matchTotalPoints}</div>
                </div>
              </div>

            </div>

            {/* Bottom Section: Roster Breakdown */}
            <div style={{ padding: '40px', background: cardBg }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 14, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24 }}>
                Squad Performance
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
                {displayPlayers.map((player, idx) => (
                      <div key={idx} style={{ background: shellBg, borderRadius: 16, border: `1px solid ${separator}`, overflow: 'hidden' }}>
                    
                    {/* Player Image Strip */}
                        <div style={{ width: '100%', height: 160, background: `linear-gradient(135deg, ${p.accent}15 0%, ${p.accent}05 100%)`, position: 'relative' }}>
                      {player.imageUrl ? (
                        <img src={player.imageUrl} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={p.separator} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                      )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: `linear-gradient(to top, ${shellBg} 0%, transparent 100%)` }}></div>
                      
                      <div style={{ position: 'absolute', bottom: 12, left: 16, fontFamily: "'Montserrat', sans-serif", fontSize: 20, fontWeight: 800, color: p.text, textTransform: 'uppercase', letterSpacing: '0.02em', textShadow: `0 2px 8px ${p.bg}` }}>
                        {player.name || `Player ${idx + 1}`}
                      </div>
                    </div>

                    {/* Player Stats */}
                    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div style={{ background: cardBg, padding: '10px 0', borderRadius: 8, border: `1px solid ${separator}`, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>ELIMS</div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 800, color: p.text }}>{player.eliminations ?? '-'}</div>
                      </div>
                      <div style={{ background: cardBg, padding: '10px 0', borderRadius: 8, border: `1px solid ${separator}`, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>DMG</div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 800, color: p.text }}>{player.damage ?? '-'}</div>
                      </div>
                      <div style={{ background: cardBg, padding: '10px 0', borderRadius: 8, border: `1px solid ${separator}`, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>ASTS</div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 800, color: p.text }}>{player.assists ?? '-'}</div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default MatchResultsWidget;
