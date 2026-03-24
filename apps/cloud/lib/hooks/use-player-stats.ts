'use client';

import { useQuery } from '@tanstack/react-query';

type PlayerStat = {
  rank: number;
  player_open_id: string;
  display_name: string;
  player_id: string | null;
  team: { id: string; name: string; short_name: string | null; logo_url: string | null } | null;
  total_kills: number;
  total_damage: number;
  matches_played: number;
  deaths: number;
  kd: number;
  avg_damage: number;
  survival_rate: number;
  top_fragger_count: number;
};

export function usePlayerStats(tournamentId?: string) {
  return useQuery({
    queryKey: ['player-stats', tournamentId ?? 'all'],
    queryFn: async () => {
      const qs = tournamentId ? `?tournamentId=${tournamentId}` : '';
      const res = await fetch(`/api/player-stats${qs}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      return {
        players: (data.players ?? []) as PlayerStat[],
        matchCount: (data.matchCount ?? 0) as number,
      };
    },
    enabled: false, // only fetch when explicitly triggered
  });
}
