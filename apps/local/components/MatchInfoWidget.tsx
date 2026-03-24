'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export interface MatchInfoData {
  tournamentName: string;
  stageName: string;
  matchNumber: number;
  totalMatches: number;
  mapName: string;
  perspective: string;       // TPP or FPP
  teamsAlive: number;
  totalTeams: number;
  playersAlive: number;
  totalPlayers: number;
  phase: string;             // lobby, plane, ingame, finished
  currentZone?: number;
  bannerImageUrl?: string;
}

interface MatchInfoWidgetProps {
  data: MatchInfoData;
  palette?: ColorPalette;
}

export function MatchInfoWidget({
  data,
  palette = PALETTES[0],
}: MatchInfoWidgetProps) {
  const p = palette;

  const phaseLabel = data.phase === 'ingame' ? 'LIVE' : data.phase === 'finished' ? 'FINISHED' : data.phase.toUpperCase();
  const isLive = data.phase === 'ingame';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700;800;900&display=swap');
      `}} />

      <div style={{ background: p.bg, width: '100%', padding: '48px 24px 56px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Main card */}
          <div style={{
            position: 'relative', borderRadius: 16, overflow: 'hidden',
            background: p.cardBg, border: '1px solid ' + p.separator,
            boxShadow: p.cardShadow,
          }}>
            {/* Banner background */}
            {data.bannerImageUrl && (
              <img src={data.bannerImageUrl} alt="" style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.3, mixBlendMode: 'luminosity',
              }} />
            )}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${p.cardBg} 30%, ${p.cardBg}dd 60%, transparent 100%)`,
            }} />

            <div style={{ position: 'relative', zIndex: 10, padding: '48px 56px' }}>
              {/* Top bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700,
                    color: p.accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6,
                  }}>TOURNAMENT</div>
                  <h1 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 40, fontWeight: 900, color: p.headerText,
                    margin: 0, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase',
                  }}>{data.tournamentName}</h1>
                </div>

                {/* Live badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: isLive ? '#ef444420' : p.bg,
                  border: isLive ? '1px solid #ef444440' : '1px solid ' + p.separator,
                  padding: '8px 20px', borderRadius: 100,
                }}>
                  {isLive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />}
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 12, fontWeight: 800, color: isLive ? '#ef4444' : p.textMuted,
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                  }}>{phaseLabel}</span>
                </div>
              </div>

              {/* Info grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
                marginBottom: 32,
              }}>
                {[
                  { label: 'STAGE', value: data.stageName },
                  { label: 'MATCH', value: `${data.matchNumber} / ${data.totalMatches}` },
                  { label: 'MAP', value: data.mapName },
                  { label: 'MODE', value: data.perspective },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '16px 20px', borderRadius: 12,
                    background: p.bg, border: '1px solid ' + p.separator,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{item.label}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, color: p.text }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Live counts row */}
              <div style={{
                display: 'flex', gap: 24,
                padding: '16px 24px', borderRadius: 12,
                background: p.accent + '10', border: '1px solid ' + p.accent + '30',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>TEAMS ALIVE</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 900, color: p.accent }}>{data.teamsAlive}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: p.textMuted }}>/ {data.totalTeams}</span>
                  </div>
                </div>
                <div style={{ width: 1, background: p.separator }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>PLAYERS ALIVE</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 900, color: p.text }}>{data.playersAlive}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: p.textMuted }}>/ {data.totalPlayers}</span>
                  </div>
                </div>
                {data.currentZone !== undefined && (
                  <>
                    <div style={{ width: 1, background: p.separator }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>ZONE</div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 900, color: p.text }}>{data.currentZone}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default MatchInfoWidget;
