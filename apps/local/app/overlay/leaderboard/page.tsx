'use client';

import { PALETTES } from '@/components/TopPlayersWidget';
import { OverallLeaderboardWidget, type TeamStandings } from '@/components/OverallLeaderboardWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { useLiveState } from '@/hooks/useLiveState';

export default function LeaderboardOverlay() {
  const themeIdx = useGlobalTheme();
  const live = useLiveState();

  const teams: TeamStandings[] = live.teams.map((t, i) => ({
    rank: i + 1,
    name: t.displayName || t.teamName,
    logoUrl: t.logoPath,
    wwcd: 0,
    eliminations: t.kills,
    placement: t.placementPoints,
    totalPoints: t.totalPoints,
  }));

  if (teams.length === 0) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `body { background: transparent !important; margin: 0; overflow: hidden; }` }} />
      <OverallLeaderboardWidget
        teams={teams}
        palette={PALETTES[themeIdx]}
        stageText="GRAND FINALS"
        matchText="OVERALL STANDINGS"
      />
    </>
  );
}
