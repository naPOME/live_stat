'use client';

import { useEffect, useState } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { OverallRankingSocialWidget } from '@/components/OverallRankingSocialWidget';
import type { TeamStandings } from '@/components/OverallLeaderboardWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

interface APITeam {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  kills: number;
  placement?: number;
  alive: boolean;
  liveMemberNum: number;
  placementPoints: number;
  totalPoints: number;
}

interface LiveData {
  phase?: string;
  teams: APITeam[];
}

export default function RankingsSocialOverlay() {
  const [teams, setTeams] = useState<TeamStandings[]>([]);
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      const mapped: TeamStandings[] = d.teams.map((t, i) => ({
        rank: i + 1,
        name: t.displayName || t.teamName,
        logoUrl: t.logoPath,
        wwcd: 0,
        eliminations: t.kills,
        placement: t.placementPoints,
        totalPoints: t.totalPoints,
      }));
      setTeams(mapped);
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (teams.length === 0) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `body { background: transparent !important; margin: 0; overflow: hidden; }` }} />
      <OverallRankingSocialWidget
        teams={teams}
        palette={PALETTES[themeIdx]}
        stageText="GRAND FINAL"
        matchText="DAY 1  MATCH 6"
      />
    </>
  );
}
