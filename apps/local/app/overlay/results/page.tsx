'use client';

import { useEffect, useState } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { MatchResultsWidget, type MatchPlayerStat } from '@/components/MatchResultsWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

interface APIPlayer {
  playerName: string;
  displayName?: string;
  teamName: string;
  kills: number;
  damage?: number;
  assists?: number;
}

interface APITeam {
  teamName: string;
  displayName?: string;
  shortName?: string;
  logoPath?: string;
  kills: number;
  placementPoints: number;
  totalPoints: number;
}

interface LiveData {
  phase?: string;
  teams: APITeam[];
  players?: APIPlayer[];
}

export default function ResultsOverlay() {
  const [winner, setWinner] = useState<APITeam | null>(null);
  const [players, setPlayers] = useState<MatchPlayerStat[]>([]);
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      if (d.teams.length > 0) {
        const winTeam = d.teams[0];
        setWinner(winTeam);

        const teamPlayers = (d.players || [])
          .filter(p => p.teamName === winTeam.teamName)
          .sort((a, b) => b.kills - a.kills)
          .slice(0, 4)
          .map(p => ({
            name: p.displayName || p.playerName,
            eliminations: p.kills,
            damage: p.damage ?? 0,
            assists: p.assists ?? 0,
          } as MatchPlayerStat));
        setPlayers(teamPlayers);
      }
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

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
