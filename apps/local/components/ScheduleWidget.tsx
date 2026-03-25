'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export interface ScheduleMatch {
  matchNumber: number;
  mapName: string;
  status: 'upcoming' | 'live' | 'completed';
  startTime?: string;      // e.g. "14:00"
  winnerTeam?: string;
}

interface ScheduleWidgetProps {
  matches: ScheduleMatch[];
  tournamentName?: string;
  dayLabel?: string;
  palette?: ColorPalette;
  transparent?: boolean;
}

export function ScheduleWidget({
  matches = [],
  tournamentName = "PUBG MOBILE TOURNAMENT",
  dayLabel = "DAY 1",
  palette = PALETTES[0],
  transparent = false,
}: ScheduleWidgetProps) {
  const p = palette;
  const shellBg = transparent ? 'rgba(14, 14, 14, 0.18)' : p.bg;
  const cardBg = transparent ? 'rgba(22, 22, 22, 0.48)' : p.cardBg;
  const separator = transparent ? 'rgba(255, 255, 255, 0.12)' : p.separator;
  const cardShadow = transparent ? '0 10px 36px rgba(0,0,0,0.22)' : p.cardShadow;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
      `}} />

      <div style={{ background: shellBg, width: '100%', padding: '48px 24px 56px', fontFamily: "'Roboto', sans-serif" }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 40, paddingBottom: 20, borderBottom: '2px solid ' + separator }}>
            <div style={{
              fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 700,
              color: p.accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6,
            }}>{tournamentName}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h1 style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, color: p.headerText,
                margin: 0, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase',
              }}>Match Schedule</h1>
              <span style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 20, fontWeight: 800, color: p.text,
                background: shellBg, border: '1px solid ' + separator,
                padding: '8px 20px', borderRadius: 8,
              }}>{dayLabel}</span>
            </div>
          </div>

          {/* Match list */}
          <div style={{
            background: cardBg, borderRadius: 16,
            border: '1px solid ' + separator,
            boxShadow: cardShadow,
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px 140px',
              padding: '14px 24px',
              background: p.accent + '10',
              borderBottom: '2px solid ' + separator,
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 11, fontWeight: 700, color: p.textMuted,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              <div style={{ textAlign: 'center' }}>#</div>
              <div>Map</div>
              <div style={{ textAlign: 'center' }}>Time</div>
              <div style={{ textAlign: 'center' }}>Status</div>
              <div>Winner</div>
            </div>

            {matches.map((match, idx) => {
              const isLive = match.status === 'live';
              const isDone = match.status === 'completed';

              return (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px 140px',
                  padding: '14px 24px', alignItems: 'center',
                  borderBottom: idx < matches.length - 1 ? '1px solid ' + separator : 'none',
                  background: isLive ? p.accent + '08' : 'transparent',
                }}>
                  {/* Match # */}
                  <div style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 18, fontWeight: 900, textAlign: 'center',
                    color: isLive ? p.accent : p.textMuted,
                  }}>{match.matchNumber}</div>

                  {/* Map */}
                  <div style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 16, fontWeight: 700, color: p.text,
                    textTransform: 'uppercase',
                  }}>{match.mapName}</div>

                  {/* Time */}
                  <div style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 14, fontWeight: 600, textAlign: 'center',
                    color: p.textMuted,
                  }}>{match.startTime || '-'}</div>

                  {/* Status */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 12px', borderRadius: 100,
                      background: isLive ? '#ef444420' : isDone ? p.accent + '15' : shellBg,
                      border: isLive ? '1px solid #ef444440' : '1px solid ' + separator,
                    }}>
                      {isLive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />}
                      <span style={{
                        fontSize: 10, fontWeight: 800,
                        color: isLive ? '#ef4444' : isDone ? p.accent : p.textMuted,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>{isLive ? 'LIVE' : isDone ? 'DONE' : 'UPCOMING'}</span>
                    </div>
                  </div>

                  {/* Winner */}
                  <div style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 13, fontWeight: 700, color: isDone ? p.text : p.textMuted,
                    textTransform: 'uppercase',
                  }}>
                    {isDone && match.winnerTeam ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>🐔</span> {match.winnerTeam}
                      </span>
                    ) : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default ScheduleWidget;
