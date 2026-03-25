'use client';

import { PALETTES } from '@/components/TopPlayersWidget';
import { MatchResultsWidget, type MatchPlayerStat } from '@/components/MatchResultsWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { useLiveState } from '@/hooks/useLiveState';

export default function ResultsOverlay() {
  const themeIdx = useGlobalTheme();
  const live = useLiveState();
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
    </>
  );
}
