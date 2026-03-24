'use client';
import React, { useState } from 'react';
import { MatchLeaderboardSidebar, type SidebarTeam } from '@/components/MatchLeaderboardSidebar';
import { PALETTES } from '@/components/TopPlayersWidget';

// Example: Passing a custom bannerUrl for Alpha 7 specifically.
const mockFullSidebarTeams: SidebarTeam[] = [
  { rank: 1, name: "Alpha 7", playersAlive: 4, matchKills: 8, totalPoints: 155, logoUrl: "https://cdn.escharts.com/uploads/public/664/306/a20/664306a20d6de019442036.png", bannerUrl: "https://pubglite.rocomassports.com/wp-content/uploads/2021/08/alpha7-esports-pubg-mobile.jpg" },
  { rank: 2, name: "Stalwart ES", playersAlive: 2, matchKills: 5, totalPoints: 142 },
  { rank: 3, name: "Nova Esports", playersAlive: 4, matchKills: 3, totalPoints: 136, logoUrl: "https://upload.wikimedia.org/wikipedia/en/d/de/Nova_Esports_logo.png" },
  { rank: 4, name: "Vampire", playersAlive: 0, matchKills: 12, totalPoints: 120 },
  { rank: 5, name: "D'Xavier", playersAlive: 1, matchKills: 2, totalPoints: 114 },
  { rank: 6, name: "Geekay", playersAlive: 4, matchKills: 0, totalPoints: 102 },
  { rank: 7, name: "IHC Esports", playersAlive: 3, matchKills: 4, totalPoints: 98 },
  { rank: 8, name: "INFLUENCE", playersAlive: 0, matchKills: 6, totalPoints: 92 },
  { rank: 9, name: "Fire Flux", playersAlive: 4, matchKills: 1, totalPoints: 85 },
  { rank: 10, name: "DRS Gaming", playersAlive: 2, matchKills: 3, totalPoints: 78 },
  { rank: 11, name: "Bigetron RA", playersAlive: 0, matchKills: 5, totalPoints: 72 },
  { rank: 12, name: "Ruh ES", playersAlive: 0, matchKills: 2, totalPoints: 68 },
  { rank: 13, name: "4Merical", playersAlive: 1, matchKills: 1, totalPoints: 62 },
  { rank: 14, name: "Nigma Galaxy", playersAlive: 0, matchKills: 0, totalPoints: 50 },
  { rank: 15, name: "Titan Gaming", playersAlive: 2, matchKills: 0, totalPoints: 42 },
  { rank: 16, name: "Persija EVOS", playersAlive: 0, matchKills: 1, totalPoints: 30 },
];

import { useGlobalTheme } from '@/hooks/useGlobalTheme';

export default function MatchSidebarPage() {
  const themeIdx = useGlobalTheme();

  // General fallback banner for rows that don't have a custom team banner
  const cinematicBannerStr = "https://d1lss44hh2trtw.cloudfront.net/resize?type=webp&url=https%3A%2F%2Fshacknews-www.s3.amazonaws.com%2Fassets%2Farticle%2F2024%2F04%2F24%2Fpubg-is-headed-back-to-its-very-first-map_feature.jpg&width=1032&sign=cbEcoiP8sAMcUuVQz6rXcH000OAz1lDQ3FnvMbJ82dg";

  return (
    <div style={{ 
      minHeight: '100vh', 
      /* Simulated game background video/image */
      background: 'url("' + cinematicBannerStr + '") no-repeat center center/cover', 
      fontFamily: "'Inter', sans-serif",
      position: 'relative'
    }}>
      
      {/* Dark overlay to simulate game feed dimming slightly if needed */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.1)' }}></div>

      {/* Render the Sidebar Overlay driven by Global Engine */}
      <MatchLeaderboardSidebar
        teams={mockFullSidebarTeams}
        palette={PALETTES[themeIdx]}
        matchBannerUrl={cinematicBannerStr}
      />
    </div>
  );
}
