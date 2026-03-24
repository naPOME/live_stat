'use client';
import React, { useState } from 'react';
import { PlayerSpotlightWidget } from '@/components/PlayerSpotlightWidget';
import { PALETTES } from '@/components/TopPlayersWidget';

const mockMvpParams = {
  playerName: "REVO",
  teamName: "Alpha 7 Esports",
  teamLogoUrl: "https://cdn.escharts.com/uploads/public/664/306/a20/664306a20d6de019442036.png",
  playerImageUrl: "/player-sample.png", // Assuming this is available locally since previous widgets use it
  stats: {
    eliminations: 9,
    damage: 1450,
    headshotHitRate: 34.2,
    assists: 4,
    survivalTime: "28:45",
    longestKill: 342,
  },
  bannerImageUrl: "https://d1lss44hh2trtw.cloudfront.net/resize?type=webp&url=https%3A%2F%2Fshacknews-www.s3.amazonaws.com%2Fassets%2Farticle%2F2024%2F04%2F24%2Fpubg-is-headed-back-to-its-very-first-map_feature.jpg&width=1032&sign=cbEcoiP8sAMcUuVQz6rXcH000OAz1lDQ3FnvMbJ82dg"
};

export default function MVPSpotlightPage() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div style={{ minHeight: '100vh', background: '#d4d4d8' }}>
      
      {/* Palette Picker Bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#ffffff', borderBottom: '1px solid #e0e0e0',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 8 }}>
          Palette (MVP Spotlight):
        </span>
        {PALETTES.map((pal, i) => (
          <button
            key={pal.name}
            onClick={() => setActiveIdx(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8,
              border: activeIdx === i ? `2px solid ${pal.accent}` : '2px solid transparent',
              background: activeIdx === i ? `${pal.accent}10` : '#f5f5f5',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: pal.accent, flexShrink: 0 }}></div>
            <span style={{ fontSize: 13, fontWeight: 600, color: activeIdx === i ? pal.accent : '#555' }}>
              {pal.name}
            </span>
          </button>
        ))}
      </div>

      <PlayerSpotlightWidget
        {...mockMvpParams}
        palette={PALETTES[activeIdx]}
      />
    </div>
  );
}
