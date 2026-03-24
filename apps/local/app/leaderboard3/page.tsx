'use client';
import React from 'react';
import { OverallLeaderboardWidget3 } from '@/components/OverallLeaderboardWidget3';
import { type TeamStandings } from '@/components/OverallLeaderboardWidget';

const mockTeams: TeamStandings[] = [
  { rank: 1, rankChange: 1, name: "Alpha 7 Esports", wwcd: 4, eliminations: 82, placement: 65, totalPoints: 147 },
  { rank: 2, rankChange: -1, name: "Stalwart Esports", wwcd: 3, eliminations: 78, placement: 60, totalPoints: 138 },
  { rank: 3, rankChange: 3, name: "Nova Esports", wwcd: 2, eliminations: 70, placement: 58, totalPoints: 128 },
  { rank: 4, rankChange: 0, name: "Vampire Esports", wwcd: 1, eliminations: 65, placement: 50, totalPoints: 115 },
  { rank: 5, rankChange: -2, name: "D'Xavier", wwcd: 2, eliminations: 55, placement: 55, totalPoints: 110 },
  { rank: 6, rankChange: 4, name: "Influence Chemin", wwcd: 1, eliminations: 60, placement: 45, totalPoints: 105 },
  { rank: 7, rankChange: -1, name: "Geekay Esports", wwcd: 0, eliminations: 58, placement: 44, totalPoints: 102 },
  { rank: 8, rankChange: 0, name: "DRS Gaming", wwcd: 1, eliminations: 45, placement: 50, totalPoints: 95 },
  { rank: 9, rankChange: 2, name: "Bigetron RA", wwcd: 1, eliminations: 48, placement: 42, totalPoints: 90 },
  { rank: 10, rankChange: -3, name: "4Merical Vibes", wwcd: 0, eliminations: 50, placement: 35, totalPoints: 85 },
  { rank: 11, rankChange: 1, name: "Ruh E-Sports", wwcd: 1, eliminations: 40, placement: 40, totalPoints: 80 },
  { rank: 12, rankChange: -3, name: "Fire Flux", wwcd: 0, eliminations: 42, placement: 35, totalPoints: 77 },
  { rank: 13, rankChange: 0, name: "IHC Esports", wwcd: 0, eliminations: 38, placement: 30, totalPoints: 68 },
  { rank: 14, rankChange: 2, name: "Persija EVOS", wwcd: 0, eliminations: 35, placement: 28, totalPoints: 63 },
  { rank: 15, rankChange: -1, name: "Titan Gaming", wwcd: 0, eliminations: 30, placement: 25, totalPoints: 55 },
  { rank: 16, rankChange: -2, name: "Nigma Galaxy", wwcd: 0, eliminations: 25, placement: 22, totalPoints: 47 }
];

export default function Leaderboard3Page() {
  return (
    <div style={{ minHeight: '100vh', background: '#d4d4d8' }}>
      <OverallLeaderboardWidget3
        stageText="TOURNAMENT GRAND FINALS"
        matchText="DAY 3 / MATCH 16"
        teams={mockTeams}
      />
    </div>
  );
}
