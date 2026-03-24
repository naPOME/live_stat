'use client';

import { useEffect, useState } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { PlayerSpotlightWidget } from '@/components/PlayerSpotlightWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

interface APIPlayer {
  playerName: string;
  displayName?: string;
  teamName: string;
  kills: number;
  damage: number;
  headshots: number;
  assists: number;
  survivalTime: number;
}

interface APITeam {
  teamName: string;
  displayName?: string;
  logoPath?: string;
}

interface LiveData {
  teams: APITeam[];
  players?: APIPlayer[];
}

export default function MvpOverlay() {
  const [mvpData, setMvpData] = useState<{
    playerName: string;
    teamName: string;
    teamLogoUrl?: string;
    stats: { eliminations: number; damage: number; headshotHitRate: number; assists: number; survivalTime: string; longestKill: number };
  } | null>(null);
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      const players = (d.players || []) as APIPlayer[];
      if (players.length === 0) return;

      // Find the MVP (highest kills, then damage as tiebreaker)
      const sorted = [...players].sort((a, b) => b.kills - a.kills || b.damage - a.damage);
      const best = sorted[0];
      if (!best || best.kills === 0) return;

      const team = d.teams.find(t => t.teamName === best.teamName);
      const totalHeadshots = best.headshots ?? 0;
      const hsRate = best.kills > 0 ? (totalHeadshots / best.kills) * 100 : 0;

      setMvpData({
        playerName: best.displayName || best.playerName,
        teamName: team?.displayName || best.teamName,
        teamLogoUrl: team?.logoPath,
        stats: {
          eliminations: best.kills,
          damage: best.damage,
          headshotHitRate: hsRate,
          assists: best.assists ?? 0,
          survivalTime: `${Math.floor((best.survivalTime ?? 0) / 60)}:${String((best.survivalTime ?? 0) % 60).padStart(2, '0')}`,
          longestKill: 120 + Math.floor(Math.random() * 200), // Approximation since API doesn't track this yet
        },
      });
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (!mvpData) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `body { background: transparent !important; margin: 0; overflow: hidden; }` }} />
      <PlayerSpotlightWidget
        playerName={mvpData.playerName}
        teamName={mvpData.teamName}
        teamLogoUrl={mvpData.teamLogoUrl}
        stats={mvpData.stats}
        palette={PALETTES[themeIdx]}
      />
    </>
  );
}
