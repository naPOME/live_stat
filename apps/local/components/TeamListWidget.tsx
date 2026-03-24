'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export interface TeamEntry {
  name: string;
  shortName?: string;
  logoUrl?: string;
  brandColor?: string;
  players?: { name: string; role?: string }[];
}

interface TeamListWidgetProps {
  teams: TeamEntry[];
  stageText?: string;
  palette?: ColorPalette;
}

export function TeamListWidget({
  teams = [],
  stageText = "PARTICIPATING TEAMS",
  palette = PALETTES[0],
}: TeamListWidgetProps) {
  const p = palette;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700;800;900&display=swap');
      `}} />

      <div style={{ background: p.bg, width: '100%', padding: '48px 24px 56px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 40, paddingBottom: 20, borderBottom: '2px solid ' + p.separator }}>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700,
              color: p.accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6,
            }}>TOURNAMENT</div>
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, color: p.headerText,
              margin: 0, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase',
            }}>{stageText}</h1>
          </div>

          {/* Grid of team cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {teams.map((team, idx) => {
              const color = team.brandColor || p.accent;
              const short = team.shortName || team.name.substring(0, 3).toUpperCase();
              return (
                <div key={idx} style={{
                  background: p.cardBg, borderRadius: 12,
                  border: '1px solid ' + p.separator,
                  overflow: 'hidden',
                  boxShadow: p.cardShadow,
                }}>
                  {/* Team header with color accent */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '16px 20px',
                    borderBottom: '1px solid ' + p.separator,
                    background: color + '08',
                  }}>
                    <div style={{ borderLeft: '4px solid ' + color, height: 32 }} />
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6 }} />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: 6,
                        background: color + '20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 14, fontWeight: 900, color,
                      }}>{short.substring(0, 2)}</div>
                    )}
                    <div>
                      <div style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 16, fontWeight: 800, color: p.text,
                        textTransform: 'uppercase', letterSpacing: '-0.01em',
                      }}>{team.name}</div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: p.textMuted,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                      }}>{short}</div>
                    </div>
                  </div>

                  {/* Players roster */}
                  <div style={{ padding: '12px 20px' }}>
                    {(team.players || []).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {team.players!.map((pl, pi) => (
                          <div key={pi} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            fontSize: 12, fontWeight: 600, color: p.text,
                          }}>
                            <span>{pl.name}</span>
                            {pl.role && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, color: p.textMuted,
                                background: p.bg, padding: '2px 8px', borderRadius: 4,
                                letterSpacing: '0.05em', textTransform: 'uppercase',
                              }}>{pl.role}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic' }}>4 players</div>
                    )}
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

export default TeamListWidget;
