'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export interface EliminationData {
  teamName: string;
  teamShort?: string;
  teamLogoUrl?: string;
  teamColor?: string;
  placement: number;        // e.g. #12
  totalTeams: number;       // e.g. 16
  matchKills: number;
  matchPoints: number;
  eliminatedBy?: string;    // Team that got the final kill
}

interface EliminationAlertWidgetProps {
  data: EliminationData;
  palette?: ColorPalette;
  transparent?: boolean;
}

export function EliminationAlertWidget({
  data,
  palette = PALETTES[0],
  transparent = false,
}: EliminationAlertWidgetProps) {
  const p = palette;
  const color = data.teamColor || p.accent;
  const short = data.teamShort || data.teamName.substring(0, 3).toUpperCase();
  const panelBg = transparent ? 'rgba(22, 22, 22, 0.52)' : p.cardBg;
  const separator = transparent ? 'rgba(255, 255, 255, 0.12)' : p.separator;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
        @keyframes elimSlideIn {
          0% { opacity: 0; transform: translateY(-40px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes elimPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          50% { box-shadow: 0 0 0 12px rgba(239,68,68,0.15); }
        }
        @keyframes elimBarShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}} />

      {/* Centered popup — typically top-center of the broadcast */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        animation: 'elimSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: "'Roboto', sans-serif",
        zIndex: 50,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: 12,
          overflow: 'hidden',
          background: panelBg,
          border: '1px solid ' + separator,
          boxShadow: `0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px ${p.separator}`,
          animation: 'elimPulse 2s ease infinite',
          minWidth: 420,
        }}>
          {/* Left accent strip + Team logo */}
          <div style={{
            width: 80, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
            padding: '16px 0',
          }}>
            {data.teamLogoUrl ? (
              <img src={data.teamLogoUrl} alt="" style={{ width: 40, height: 40, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 16, fontWeight: 900, color: '#fff',
              }}>{short.substring(0, 2)}</div>
            )}
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 22, fontWeight: 900, color: '#fff',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}>#{data.placement}</div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Top label */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#ef4444', boxShadow: '0 0 8px #ef4444',
              }} />
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#ef4444',
                letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>TEAM ELIMINATED</span>
            </div>

            {/* Team name */}
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 26, fontWeight: 900, color: p.text,
              textTransform: 'uppercase', letterSpacing: '-0.01em',
              lineHeight: 1,
            }}>{data.teamName}</div>

            {/* Stats row */}
            <div style={{
              display: 'flex', gap: 20, marginTop: 12,
            }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: p.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>PLACEMENT</div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 900, color: p.text }}>#{data.placement}/{data.totalTeams}</div>
              </div>
              <div style={{ width: 1, background: p.separator }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: p.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>MATCH KILLS</div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 900, color: p.accent }}>{data.matchKills}</div>
              </div>
              <div style={{ width: 1, background: p.separator }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: p.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>MATCH PTS</div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 900, color: p.text }}>{data.matchPoints}</div>
              </div>
            </div>

            {data.eliminatedBy && (
              <div style={{ marginTop: 8, fontSize: 10, fontWeight: 600, color: p.textMuted }}>
                Finished by <span style={{ fontWeight: 800, color: p.text }}>{data.eliminatedBy}</span>
              </div>
            )}
          </div>
        </div>

        {/* Auto-dismiss progress bar */}
        <div style={{
          height: 3, borderRadius: '0 0 4px 4px', overflow: 'hidden',
          background: separator,
        }}>
          <div style={{
            height: '100%', background: '#ef4444',
            animation: 'elimBarShrink 5s linear forwards',
          }} />
        </div>
      </div>
    </>
  );
}

export default EliminationAlertWidget;
