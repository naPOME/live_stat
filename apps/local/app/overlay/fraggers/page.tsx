'use client';

import { PALETTES, type PlayerStat } from '@/components/TopPlayersWidget';
import { TopPlayersWidget } from '@/components/TopPlayersWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { useLiveState } from '@/hooks/useLiveState';
import { useWallpaper } from '@/hooks/useWallpaper';

export default function FraggersOverlay() {
  const themeIdx = useGlobalTheme();
  const live = useLiveState();
  const wallpaperUrl = useWallpaper();

  const players: PlayerStat[] = (live.players || [])
    .filter((p) => p.kills > 0)
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5)
    .map((p) => ({
      name: p.displayName || p.playerName,
      eliminations: p.kills,
      damage: p.damage ?? 0,
      assists: p.assists ?? 0,
      survivalTime: p.survivalTime ? `${Math.floor(p.survivalTime / 60)}m` : '-',
    }));

  if (players.length === 0) return null;

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
          <TopPlayersWidget
            players={players}
            palette={PALETTES[themeIdx]}
            stageText="GRAND FINALS"
            matchText="TOP FRAGGERS"
          />
        </div>
      </div>
    </>
  );
}
