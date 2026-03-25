'use client';

import { PALETTES } from '@/components/TopPlayersWidget';
import { OverallLeaderboardWidget, type TeamStandings } from '@/components/OverallLeaderboardWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { useLiveState } from '@/hooks/useLiveState';
import { useWallpaper } from '@/hooks/useWallpaper';

export default function LeaderboardOverlay() {
  const themeIdx = useGlobalTheme();
  const live = useLiveState();
  const wallpaperUrl = useWallpaper();

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
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        {wallpaperUrl && (
          <>
            <img src={wallpaperUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)' }} />
          </>
        )}
        <div style={{ position: 'relative', zIndex: 3, width: '100%', height: '100%' }}>
          <OverallLeaderboardWidget
            teams={teams}
            palette={PALETTES[themeIdx]}
            stageText="GRAND FINALS"
            matchText="OVERALL STANDINGS"
          />
        </div>
      </div>
    </>
  );
}
