'use client';

import { useEffect, useState } from 'react';
import { PALETTES, type PlayerStat } from '@/components/TopPlayersWidget';
import { TopPlayersWidget } from '@/components/TopPlayersWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

interface APIPlayer {
  playerName: string;
  displayName?: string;
  teamName: string;
  kills: number;
  damage?: number;
  assists?: number;
  survivalTime?: number;
}

interface APITeam {
  teamName: string;
  displayName?: string;
  brandColor?: string;
}

interface LiveData {
  teams: APITeam[];
  players?: APIPlayer[];
}

export default function FraggersOverlay() {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as LiveData;
      const sorted = (d.players || [])
        .filter(p => p.kills > 0)
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 5)
        .map(p => ({
          name: p.displayName || p.playerName,
          eliminations: p.kills,
          damage: p.damage ?? 0,
          assists: p.assists ?? 0,
          survivalTime: p.survivalTime ? `${Math.floor(p.survivalTime / 60)}m` : '-',
        } as PlayerStat));
      setPlayers(sorted);
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (players.length === 0) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `body { background: transparent !important; margin: 0; overflow: hidden; }` }} />
      <TopPlayersWidget
        players={players}
        palette={PALETTES[themeIdx]}
        stageText="GRAND FINALS"
        matchText="TOP FRAGGERS"
      />
    </>
  );
}
