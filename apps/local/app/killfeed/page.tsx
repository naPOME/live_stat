'use client';
import React, { useState, useEffect } from 'react';
import { KillFeedWidget, type KillEvent } from '@/components/KillFeedWidget';
import { PALETTES } from '@/components/TopPlayersWidget';

const allMockEvents: KillEvent[] = [
  { id: '1', killer: 'A7•Revo', killerTeamColor: '#3b82f6', victim: 'NV•Paraboy', victimTeamColor: '#a855f7', weapon: 'M416', isKnock: true },
  { id: '2', killer: 'A7•Mafia', killerTeamColor: '#3b82f6', victim: 'NV•Jimmy', victimTeamColor: '#a855f7', weapon: 'Grenade', isKnock: true },
  { id: '3', killer: 'A7•Revo', killerTeamColor: '#3b82f6', victim: 'NV•Paraboy', victimTeamColor: '#a855f7', weapon: 'M416', isKnock: false },
  { id: '4', killer: 'STW•Action', killerTeamColor: '#f59e0b', victim: 'VPE•Stoned', victimTeamColor: '#ef4444', weapon: 'AWM', isKnock: true },
  { id: '5', killer: 'INF•Federal', killerTeamColor: '#10b981', victim: 'DX•Rabiz', victimTeamColor: '#eab308', weapon: 'Pan', isKnock: false },
];

export default function KillFeedPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visibleEvents, setVisibleEvents] = useState<KillEvent[]>([]);

  // Simulate live feed by popping events in one by one
  useEffect(() => {
    setVisibleEvents([]);
    let timerId: NodeJS.Timeout;
    let delay = 500;
    
    allMockEvents.forEach((ev, idx) => {
      timerId = setTimeout(() => {
        setVisibleEvents(prev => [...prev, ev]);
      }, delay);
      delay += 1200; // Next kill comes in 1.2s later
    });

    return () => clearTimeout(timerId);
  }, [activeIdx]); // Re-run animation if they change palette to see it again

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'url("https://d1lss44hh2trtw.cloudfront.net/resize?type=webp&url=https%3A%2F%2Fshacknews-www.s3.amazonaws.com%2Fassets%2Farticle%2F2024%2F04%2F24%2Fpubg-is-headed-back-to-its-very-first-map_feature.jpg&width=1032&sign=cbEcoiP8sAMcUuVQz6rXcH000OAz1lDQ3FnvMbJ82dg") no-repeat center center/cover', 
      fontFamily: "'Inter', sans-serif",
      position: 'relative'
    }}>
      
      {/* Palette Picker Bar - Positioned at bottom so top right is free */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.8)', borderTop: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 8 }}>
          KillFeed Theme Mode:
        </span>
        {PALETTES.map((pal, i) => (
          <button
            key={pal.name}
            onClick={() => setActiveIdx(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8,
              border: activeIdx === i ? `2px solid ${pal.accent}` : '2px solid transparent',
              background: activeIdx === i ? `${pal.accent}30` : 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: pal.accent, flexShrink: 0 }}></div>
            <span style={{ fontSize: 13, fontWeight: 600, color: activeIdx === i ? pal.accent : '#fff' }}>
              {pal.name}
            </span>
          </button>
        ))}
      </div>

      <KillFeedWidget
        events={visibleEvents}
        palette={PALETTES[activeIdx]}
      />
    </div>
  );
}
