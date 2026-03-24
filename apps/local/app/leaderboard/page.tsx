'use client';
import React, { useState } from 'react';
import { OverallLeaderboardWidget, type TeamStandings } from '@/components/OverallLeaderboardWidget';
import { PALETTES } from '@/components/TopPlayersWidget';

const mockTeams: TeamStandings[] = [
  { rank: 1, rankChange: 1, name: "Alpha 7 Esports", wwcd: 4, eliminations: 82, placement: 65, totalPoints: 147 },
  { rank: 2, rankChange: -1, name: "Stalwart Esports", wwcd: 3, eliminations: 78, placement: 60, totalPoints: 138 },
  { rank: 3, rankChange: 3, name: "Nova Esports", wwcd: 2, eliminations: 70, placement: 58, totalPoints: 128 },
  { rank: 4, rankChange: 0, name: "Vampire Esports", wwcd: 1, eliminations: 65, placement: 50, totalPoints: 115 },
  { rank: 5, rankChange: -2, name: "D'Xavier", wwcd: 2, eliminations: 55, placement: 55, totalPoints: 110 },
  { rank: 6, rankChange: 4, name: "Influence Chemin", wwcd: 1, eliminations: 60, placement: 45, totalPoints: 105 },
  { rank: 7, rankChange: -1, name: "Geekay Esports", wwcd: 0, eliminations: 58, placement: 44, totalPoints: 102 },
  { rank: 8, rankChange: 0, name: "DRS Gaming", wwcd: 1, eliminations: 45, placement: 50, totalPoints: 95 },
  { rank: 9, rankChange: 2, name: "Bigetron Red Aliens", wwcd: 1, eliminations: 48, placement: 42, totalPoints: 90 },
  { rank: 10, rankChange: -3, name: "4Merical Vibes", wwcd: 0, eliminations: 50, placement: 35, totalPoints: 85 },
  { rank: 11, rankChange: 1, name: "Ruh E-Sports", wwcd: 1, eliminations: 40, placement: 40, totalPoints: 80 },
  { rank: 12, rankChange: -3, name: "Fire Flux Esports", wwcd: 0, eliminations: 42, placement: 35, totalPoints: 77 },
  { rank: 13, rankChange: 0, name: "IHC Esports", wwcd: 0, eliminations: 38, placement: 30, totalPoints: 68 },
  { rank: 14, rankChange: 2, name: "Persija EVOS", wwcd: 0, eliminations: 35, placement: 28, totalPoints: 63 },
  { rank: 15, rankChange: -1, name: "Titan Gaming", wwcd: 0, eliminations: 30, placement: 25, totalPoints: 55 },
  { rank: 16, rankChange: -2, name: "Nigma Galaxy", wwcd: 0, eliminations: 25, placement: 22, totalPoints: 47 }
];

export default function LeaderboardPage() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div style={{ minHeight: '100vh', background: '#e8e8e8', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Palette Picker Bar (Reused from Top Players for easy testing) */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#ffffff', borderBottom: '1px solid #e0e0e0',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 8 }}>
          Palette (Leaderboard):
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

      {/* Widget Preview */}
      <OverallLeaderboardWidget
        stageText="PMGC GRAND FINALS"
        matchText="DAY 3 / MATCH 15"
        teams={mockTeams}
        palette={PALETTES[activeIdx]}
        headerImageUrl="https://d1lss44hh2trtw.cloudfront.net/resize?type=webp&url=https%3A%2F%2Fshacknews-www.s3.amazonaws.com%2Fassets%2Farticle%2F2024%2F04%2F24%2Fpubg-is-headed-back-to-its-very-first-map_feature.jpg&width=1032&sign=cbEcoiP8sAMcUuVQz6rXcH000OAz1lDQ3FnvMbJ82dg"
      />
    </div>
  );
}
