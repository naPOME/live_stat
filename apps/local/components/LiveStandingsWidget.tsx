'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export interface LiveTeam {
  rank: number;
  rankChange: number; // Positive means rank up, negative down
  name: string;
  logoUrl?: string;
  points: number;
  isAlive: boolean;
}

interface LiveStandingsWidgetProps {
  teams: LiveTeam[];
  title?: string;
  palette?: ColorPalette;
}

export function LiveStandingsWidget({
  teams = [],
  title = "LIVE MATCH STANDINGS",
  palette = PALETTES[0],
}: LiveStandingsWidgetProps) {
  const p = palette;
  const topTeams = teams.slice(0, 5); // Usually only shows top 4-5

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
      `}} />

      {/* Broadcaster usually places this near the bottom center/left */}
      <div style={{
        position: 'absolute',
        bottom: 48,
        left: 48,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: "'Roboto', sans-serif"
      }}>
        
        {/* Title Block */}
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          background: p.cardBg,
          backdropFilter: 'blur(16px)',
          border: `1px solid ${p.separator}`,
          borderRadius: '12px 12px 0 0',
          padding: '8px 20px',
          boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
          borderBottom: 'none'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.accent, marginRight: 12, boxShadow: `0 0 8px ${p.accent}` }}></div>
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 800, color: p.text, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            {title}
          </span>
        </div>

        {/* Live Ticker / Cards */}
        <div style={{ display: 'flex', gap: 12 }}>
          {topTeams.map((team, idx) => {
            const isFirst = idx === 0;
            return (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'stretch',
                background: p.cardBg,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${p.separator}`,
                borderRadius: isFirst ? '0 12px 12px 12px' : 12,
                boxShadow: `0 8px 30px rgba(0,0,0,0.4)`,
                overflow: 'hidden',
                minWidth: isFirst ? 280 : 220,
                transition: 'all 0.3s ease',
                opacity: team.isAlive ? 1 : 0.6 // Dim eliminated teams
              }}>
                
                {/* Rank Core */}
                <div style={{ 
                  background: isFirst ? p.accent : `${p.accent}20`, 
                  padding: '12px 16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minWidth: 50,
                  borderRight: `1px solid ${p.separator}`
                }}>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 24, fontWeight: 900, color: isFirst ? p.cardBg : p.text, lineHeight: 1 }}>
                    {team.rank}
                  </div>
                  {/* Rank Change Arrow */}
                  {team.rankChange !== 0 && (
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', fontSize: 10, fontWeight: 800, color: team.rankChange > 0 ? '#10b981' : '#ef4444' }}>
                      {team.rankChange > 0 ? '▲' : '▼'}{Math.abs(team.rankChange)}
                    </div>
                  )}
                </div>

                {/* Team Info */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${p.text}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: p.text }}>
                      {team.name.substring(0,2).toUpperCase()}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 800, color: p.text, textTransform: 'uppercase', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                      {team.name}
                    </span>
                    {!team.isAlive && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', marginTop: 2 }}>ELIMINATED</span>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div style={{ 
                  background: `linear-gradient(90deg, ${p.bg} 0%, transparent 100%)`, 
                  padding: '12px 20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderLeft: `1px dashed ${p.separator}`
                }}>
                  <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 24, fontWeight: 900, color: isFirst ? p.accent : p.text, lineHeight: 1 }}>
                    {team.points}
                  </span>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}

export default LiveStandingsWidget;
