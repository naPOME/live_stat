'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

interface MatchStatusWidgetProps {
  phaseNum: number;
  timeRemaining: string; // "01:25"
  teamsAlive: number;
  playersAlive: number;
  palette?: ColorPalette;
}

export function MatchStatusWidget({
  phaseNum = 4,
  timeRemaining = "01:25",
  teamsAlive = 12,
  playersAlive = 42,
  palette = PALETTES[0],
}: MatchStatusWidgetProps) {
  const p = palette;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&display=swap');
      `}} />

      {/* The widget acts as an absolute overlay element for the broadcast HUD */}
      <div style={{
        position: 'absolute',
        top: 24,
        right: 48,
        display: 'flex',
        gap: 16,
        fontFamily: "'Space Grotesk', sans-serif"
      }}>
        
        {/* Phase Timer Block */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: 'rgba(0,0,0,0.7)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px 16px', background: p.accent, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: p.cardBg, letterSpacing: '0.1em', lineHeight: 1, textTransform: 'uppercase' }}>PHASE</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: p.cardBg, lineHeight: 1 }}>{phaseNum}</span>
          </div>
          <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>{timeRemaining}</span>
          </div>
        </div>

        {/* Alive Stats Block */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: 'rgba(0,0,0,0.7)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          {/* Teams Alive */}
          <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', lineHeight: 1, marginBottom: 2, textTransform: 'uppercase' }}>TEAMS</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', letterSpacing: '0.1em', lineHeight: 1, textTransform: 'uppercase' }}>ALIVE</span>
            </div>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{teamsAlive}</span>
          </div>

          {/* Players Alive */}
          <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', lineHeight: 1, marginBottom: 2, textTransform: 'uppercase' }}>PLAYERS</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', letterSpacing: '0.1em', lineHeight: 1, textTransform: 'uppercase' }}>ALIVE</span>
            </div>
            <span style={{ fontSize: 32, fontWeight: 800, color: p.accent, lineHeight: 1, textShadow: `0 0 12px ${p.accent}80` }}>{playersAlive}</span>
          </div>
        </div>

      </div>
    </>
  );
}

export default MatchStatusWidget;
