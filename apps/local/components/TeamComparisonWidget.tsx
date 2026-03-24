'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export type TeamCompareStat = {
  name: string;
  logoUrl?: string;
  stats: {
    totalPoints: number;
    wwcd: number;
    avgElims: number;
    avgPlacement: number;
    highestDmg: number;
  };
};

interface TeamComparisonWidgetProps {
  teamA: TeamCompareStat;
  teamB: TeamCompareStat;
  stageText?: string;
  matchText?: string;
  palette?: ColorPalette;
  bannerImageUrl?: string;
}

export function TeamComparisonWidget({
  teamA,
  teamB,
  stageText = "GRAND FINALS",
  matchText = "TALE OF THE TAPE",
  palette = PALETTES[0],
  bannerImageUrl,
}: TeamComparisonWidgetProps) {
  const p = palette;

  // Render a comparative stat bar
  function StatRow({ label, valA, valB, format = (v: number) => v.toString() }: { label: string, valA: number, valB: number, format?: (v: number) => string }) {
    const total = valA + valB;
    const pctA = total === 0 ? 50 : (valA / total) * 100;
    const pctB = total === 0 ? 50 : (valB / total) * 100;
    const isAWinner = valA > valB;
    const isBWinner = valB > valA;
    // For avg placement, lower is better. We invert the highlight logic.
    const isAscendingStat = label.includes('Placement');
    const aBetter = isAscendingStat ? valA < valB : isAWinner;
    const bBetter = isAscendingStat ? valB < valA : isBWinner;

    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: aBetter ? p.accent : p.text, minWidth: 60 }}>{format(valA)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: bBetter ? p.accent : p.text, minWidth: 60, textAlign: 'right' }}>{format(valB)}</div>
        </div>
        
        {/* Double-sided Progress Bar */}
        <div style={{ display: 'flex', height: 8, background: p.barTrack, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: pctA + '%', background: aBetter ? p.accent : p.textMuted, borderRight: '2px solid ' + p.cardBg, transition: 'width 0.5s ease' }}></div>
          <div style={{ width: pctB + '%', background: bBetter ? p.accent : p.textMuted, transition: 'width 0.5s ease' }}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700;800&display=swap');
      `}} />

      <div style={{ background: p.bg, width: '100%', padding: '48px 24px 64px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, paddingBottom: 20, borderBottom: `2px solid ${p.separator}` }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: p.accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                TEAM VS TEAM
              </div>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, color: p.headerText, margin: 0, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                Head To Head
              </h1>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: p.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {stageText}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: p.badgeText, background: p.badgeBg, padding: '6px 16px', borderRadius: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {matchText}
              </span>
            </div>
          </div>

          {/* Comparison Card */}
          <div style={{ background: p.cardBg, borderRadius: 24, boxShadow: p.cardShadow, border: `1px solid ${p.separator}`, overflow: 'hidden' }}>
            
            {/* Top Logos & Names (Banner Area) */}
            <div style={{ position: 'relative', padding: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${p.separator}` }}>
              
              {/* Cinematic Background Banner */}
              {bannerImageUrl && (
                 <img src={bannerImageUrl} alt="Versus Banner" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, mixBlendMode: 'luminosity' }} />
              )}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `linear-gradient(180deg, transparent 0%, ${p.cardBg} 100%)` }}></div>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: `linear-gradient(90deg, ${p.cardBg} 0%, transparent 100%)` }}></div>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: `linear-gradient(270deg, ${p.cardBg} 0%, transparent 100%)` }}></div>

              {/* Team A */}
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                {teamA.logoUrl ? (
                  <img src={teamA.logoUrl} alt={teamA.name} style={{ width: 140, height: 140, objectFit: 'contain', marginBottom: 16, filter: `drop-shadow(0 10px 20px ${p.bg})` }} />
                ) : (
                  <div style={{ width: 120, height: 120, borderRadius: 24, background: `${p.accent}15`, border: `2px solid ${p.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 800, color: p.accent, marginBottom: 16, boxShadow: `0 10px 30px ${p.bg}` }}>
                    {teamA.name.substring(0,3).toUpperCase()}
                  </div>
                )}
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: p.text, textTransform: 'uppercase', textShadow: `0 4px 12px ${p.cardBg}` }}>{teamA.name}</div>
              </div>

              {/* VS Marker */}
              <div style={{ position: 'relative', zIndex: 10, paddingBottom: 60, fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 800, color: p.textMuted, opacity: 0.5, letterSpacing: '-0.05em', textShadow: `0 4px 12px ${p.cardBg}` }}>
                VS
              </div>

              {/* Team B */}
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                {teamB.logoUrl ? (
                  <img src={teamB.logoUrl} alt={teamB.name} style={{ width: 140, height: 140, objectFit: 'contain', marginBottom: 16, filter: `drop-shadow(0 10px 20px ${p.bg})` }} />
                ) : (
                  <div style={{ width: 120, height: 120, borderRadius: 24, background: `${p.accent}15`, border: `2px solid ${p.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 800, color: p.accent, marginBottom: 16, boxShadow: `0 10px 30px ${p.bg}` }}>
                    {teamB.name.substring(0,3).toUpperCase()}
                  </div>
                )}
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: p.text, textTransform: 'uppercase', textShadow: `0 4px 12px ${p.cardBg}` }}>{teamB.name}</div>
              </div>

            </div>

            {/* Stats Breakdown */}
            <div style={{ padding: '48px', paddingTop: 32 }}>
              <StatRow label="Total Points" valA={teamA.stats.totalPoints} valB={teamB.stats.totalPoints} />
              <StatRow label="Match Wins" valA={teamA.stats.wwcd} valB={teamB.stats.wwcd} />
              <StatRow label="Avg Eliminations" valA={teamA.stats.avgElims} valB={teamB.stats.avgElims} format={v => v.toFixed(1)} />
              <StatRow label="Avg Placement" valA={teamA.stats.avgPlacement} valB={teamB.stats.avgPlacement} format={v => v.toFixed(1)} />
              <StatRow label="Highest Squad Damage" valA={teamA.stats.highestDmg} valB={teamB.stats.highestDmg} />
            </div>

          </div>

        </div>
      </div>
    </>
  );
}

export default TeamComparisonWidget;
