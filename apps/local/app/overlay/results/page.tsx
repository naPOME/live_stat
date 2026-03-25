'use client';

import { PALETTES } from '@/components/TopPlayersWidget';
import { MatchResultsWidget, type MatchPlayerStat } from '@/components/MatchResultsWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { useLiveState } from '@/hooks/useLiveState';
import { useWallpaper } from '@/hooks/useWallpaper';

export default function ResultsOverlay() {
  const themeIdx = useGlobalTheme();
  const live = useLiveState();
  const wallpaperUrl = useWallpaper();
  const winner = live.teams[0];

  const players: MatchPlayerStat[] = winner
    ? (live.players || [])
        .filter((p) => p.teamName === winner.teamName)
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 4)
        .map((p) => ({
          name: p.displayName || p.playerName,
          eliminations: p.kills,
          damage: p.damage ?? 0,
          assists: p.assists ?? 0,
        }))
    : [];

  if (!winner) return null;

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
          <MatchResultsWidget
            teamName={winner.displayName || winner.teamName}
            teamLogo={winner.logoPath}
            matchTotalPoints={winner.totalPoints}
            matchElims={winner.kills}
            matchDamage={players.reduce((s, p) => s + p.damage, 0)}
            players={players}
            palette={PALETTES[themeIdx]}
            stageText="GRAND FINALS"
            matchText="MATCH WINNER"
          />
        </div>
      </div>
    </>
  );
}
