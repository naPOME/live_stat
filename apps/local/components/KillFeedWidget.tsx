'use client';
import React from 'react';
import { ColorPalette, PALETTES } from './TopPlayersWidget';

export interface KillEvent {
  id: string;
  killer: string;
  killerTeamColor?: string; 
  victim: string;
  victimTeamColor?: string;
  weapon: string;
  isKnock: boolean; 
}

interface KillFeedWidgetProps {
  events: KillEvent[];
  palette?: ColorPalette;
}

// Simple helper icon generator for weapon types
function getWeaponIcon(weapon: string, color: string) {
  const isMelee = weapon.toLowerCase().includes('pan') || weapon.toLowerCase().includes('fist');
  const isExplosive = weapon.toLowerCase().includes('grenade') || weapon.toLowerCase().includes('molotov');
  
  if (isExplosive) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="6"></circle>
        <path d="M12 7v-2"></path>
        <path d="M14 5h-4"></path>
      </svg>
    );
  }
  if (isMelee) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 9.5 9.5 14.5"></path>
        <path d="M8 12a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path>
        <path d="M21 5a2.828 2.828 0 1 0-4-4 2.828 2.828 0 0 0 4 4z"></path>
      </svg>
    );
  }
  
  // Default Gun icon
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h11v2H3z"></path>
      <path d="M14 10l2-2h4l1 3-3 1"></path>
      <path d="M7 12v3h2v-3"></path>
      <path d="M14 12v4h3l1-4"></path>
    </svg>
  );
}

export function KillFeedWidget({
  events = [],
  palette = PALETTES[0],
}: KillFeedWidgetProps) {
  const p = palette;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700;800;900&display=swap');
      `}} />

      {/* Broadcast Killfeed typically sits Top Right below the match status */}
      <div style={{
        position: 'absolute',
        top: 100,
        right: 48,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: "'Space Grotesk', sans-serif",
        maxWidth: 400
      }}>
        
        {events.map((ev) => (
          <div key={ev.id} style={{
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 100%)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderLeft: `4px solid ${ev.killerTeamColor || p.accent}`,
            borderRadius: 4,
            padding: '6px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideInRight 0.3s ease-out forwards',
            // If it's a squad wipe or elimination, make it pop a little more
            opacity: ev.isKnock ? 0.9 : 1
          }}>
            
            {/* Killer */}
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {ev.killer}
            </span>

            {/* Action/Weapon Center block */}
            <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
              {getWeaponIcon(ev.weapon, ev.isKnock ? '#fbbf24' : '#ef4444')} {/* Yellow for knock, Red for Elim */}
              
              {!ev.isKnock && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                </svg> // Skull/Cross approximation
              )}
            </div>

            {/* Victim */}
            <span style={{ fontSize: 16, fontWeight: 700, color: ev.victimTeamColor || '#aaaaaa', letterSpacing: '0.05em', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {ev.victim}
            </span>

          </div>
        ))}
        
      </div>
    </>
  );
}

export default KillFeedWidget;
