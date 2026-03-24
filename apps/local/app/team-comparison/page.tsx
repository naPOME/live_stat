'use client';
import React, { useState } from 'react';
import { TeamComparisonWidget } from '@/components/TeamComparisonWidget';
import { PALETTES } from '@/components/TopPlayersWidget';

const teamAData = {
  name: "Alpha 7 Esports",
  logoUrl: "https://cdn.escharts.com/uploads/public/664/306/a20/664306a20d6de019442036.png",
  stats: {
    totalPoints: 147,
    wwcd: 4,
    avgElims: 5.5,
    avgPlacement: 4.1,
    highestDmg: 4520
  }
};

const teamBData = {
  name: "Nova Esports",
  logoUrl: "https://upload.wikimedia.org/wikipedia/en/d/de/Nova_Esports_logo.png",
  stats: {
    totalPoints: 128,
    wwcd: 2,
    avgElims: 4.6,
    avgPlacement: 3.8,
    highestDmg: 3900
  }
};

export default function TeamComparisonPage() {
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
          Palette (Head-to-Head):
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

      <TeamComparisonWidget
        teamA={teamAData}
        teamB={teamBData}
        palette={PALETTES[activeIdx]}
        bannerImageUrl="https://d1lss44hh2trtw.cloudfront.net/resize?type=webp&url=https%3A%2F%2Fshacknews-www.s3.amazonaws.com%2Fassets%2Farticle%2F2024%2F04%2F24%2Fpubg-is-headed-back-to-its-very-first-map_feature.jpg&width=1032&sign=cbEcoiP8sAMcUuVQz6rXcH000OAz1lDQ3FnvMbJ82dg"
      />
    </div>
  );
}
