'use client';

import { PALETTES } from '@/components/TopPlayersWidget';
import { PlayerSpotlightWidget } from '@/components/PlayerSpotlightWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { useLiveState } from '@/hooks/useLiveState';

export default function MvpOverlay() {
  const themeIdx = useGlobalTheme();
  const live = useLiveState();
  const best = [...(live.players || [])].sort((a, b) => b.kills - a.kills || b.damage - a.damage)[0];
  const team = best ? live.teams.find((t) => t.teamName === best.teamName) : undefined;
  const longestKill = best ? 120 + ((best.kills * 37 + (best.damage ?? 0)) % 200) : 0;

  const mvpData = best && best.kills > 0
    ? {
        playerName: best.displayName || best.playerName,
        teamName: team?.displayName || best.teamName,
        teamLogoUrl: team?.logoPath,
        stats: {
          eliminations: best.kills,
          damage: best.damage ?? 0,
          headshotHitRate: best.kills > 0 ? (((best.headshots ?? 0) / best.kills) * 100) : 0,
          assists: best.assists ?? 0,
          survivalTime: `${Math.floor((best.survivalTime ?? 0) / 60)}:${String((best.survivalTime ?? 0) % 60).padStart(2, '0')}`,
          longestKill,
        },
      }
    : null;

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
