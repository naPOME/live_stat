'use client';
import React, { useState } from 'react';
import { LiveStandingsWidget, type LiveTeam } from '@/components/LiveStandingsWidget';
import { PALETTES } from '@/components/TopPlayersWidget';

const mockLiveTeams: LiveTeam[] = [
  { rank: 1, rankChange: 1, name: "Alpha 7 Esports", points: 155, isAlive: true, logoUrl: "https://cdn.escharts.com/uploads/public/664/306/a20/664306a20d6de019442036.png" },
  { rank: 2, rankChange: -1, name: "Stalwart", points: 142, isAlive: false },
  { rank: 3, rankChange: 2, name: "Nova Esports", points: 136, isAlive: true, logoUrl: "https://upload.wikimedia.org/wikipedia/en/d/de/Nova_Esports_logo.png" },
  { rank: 4, rankChange: 0, name: "Vampire", points: 120, isAlive: true },
  { rank: 5, rankChange: 3, name: "D'Xavier", points: 114, isAlive: false },
];

export default function LiveStandingsPage() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div style={{ 
      minHeight: '100vh', 
      /* Simulated game background video/image */
      background: 'url("https://d1lss44hh2trtw.cloudfront.net/resize?type=webp&url=https%3A%2F%2Fshacknews-www.s3.amazonaws.com%2Fassets%2Farticle%2F2024%2F04%2F24%2Fpubg-is-headed-back-to-its-very-first-map_feature.jpg&width=1032&sign=cbEcoiP8sAMcUuVQz6rXcH000OAz1lDQ3FnvMbJ82dg") no-repeat center center/cover', 
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Dark overlay to simulate game feed dimming slightly if needed, or just let it raw */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)' }}></div>

      {/* Palette Picker Bar - Positioned at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 8 }}>
          Live Standings Overlay Mode:
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

      <LiveStandingsWidget
        teams={mockLiveTeams}
        palette={PALETTES[activeIdx]}
      />
    </div>
  );
}
