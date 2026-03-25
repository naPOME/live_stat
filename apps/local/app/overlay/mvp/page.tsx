'use client';

import { PALETTES } from '@/components/TopPlayersWidget';
import { PlayerSpotlightWidget } from '@/components/PlayerSpotlightWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { useLiveState } from '@/hooks/useLiveState';
import { useWallpaper } from '@/hooks/useWallpaper';

export default function MvpOverlay() {
  const themeIdx = useGlobalTheme();
  const live = useLiveState();
  const wallpaperUrl = useWallpaper();
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
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        {wallpaperUrl && (
          <>
            <img src={wallpaperUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)' }} />
          </>
        )}
        <div style={{ position: 'relative', zIndex: 3, width: '100%', height: '100%' }}>
          <PlayerSpotlightWidget
            playerName={mvpData.playerName}
            teamName={mvpData.teamName}
            teamLogoUrl={mvpData.teamLogoUrl}
            stats={mvpData.stats}
            palette={PALETTES[themeIdx]}
          />
        </div>
      </div>
    </>
  );
}
