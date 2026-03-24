'use client';
import React, { useState } from 'react';
import { MatchResultsWidget, type MatchPlayerStat } from '@/components/MatchResultsWidget';
import { PALETTES } from '@/components/TopPlayersWidget';

const mockRoster: MatchPlayerStat[] = [
  { name: "REVO", eliminations: 7, damage: 1450, assists: 3, imageUrl: "/player-sample.png" },
  { name: "MAFIA", eliminations: 5, damage: 1200, assists: 2, imageUrl: "/player-sample.png" },
  { name: "CARRILHO", eliminations: 4, damage: 1050, assists: 4, imageUrl: "/player-sample.png" },
  { name: "ROUK", eliminations: 2, damage: 820, assists: 5, imageUrl: "/player-sample.png" },
];

export default function MatchResultsPage() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div style={{ minHeight: '100vh', background: '#e8e8e8', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Palette Picker Bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#ffffff', borderBottom: '1px solid #e0e0e0',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 8 }}>
          Palette (Match Results):
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

      <MatchResultsWidget
        teamName="ALPHA 7 ESPORTS"
        matchTotalPoints={26}
        matchElims={18}
        matchDamage={4520}
        players={mockRoster}
        palette={PALETTES[activeIdx]}
        bannerImageUrl="https://d1lss44hh2trtw.cloudfront.net/resize?type=webp&url=https%3A%2F%2Fshacknews-www.s3.amazonaws.com%2Fassets%2Farticle%2F2024%2F04%2F24%2Fpubg-is-headed-back-to-its-very-first-map_feature.jpg&width=1032&sign=cbEcoiP8sAMcUuVQz6rXcH000OAz1lDQ3FnvMbJ82dg"
      />
    </div>
  );
}
