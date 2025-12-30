'use client';

import { useEffect, useState } from 'react';
import LiveLeaderboard from '@/components/LiveLeaderboard';
import type { LeaderboardResponse } from '@/lib/types';

export default function Home() {
  const [teams, setTeams] = useState<
    Array<{ rank: number; teamName: string; playerStatus: number[]; points: number; elims: number }>
  >([]);

  useEffect(() => {
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as LeaderboardResponse;

        const mapped = (data.teams ?? []).slice(0, 16).map((t, idx) => {
          const aliveCount = Math.max(0, Math.min(4, t.liveMemberNum ?? 0));
          const playerStatus = Array.from({ length: 4 }, (_, i) => (i < aliveCount ? 2 : 0));

          return {
            rank: idx + 1,
            teamName: t.teamName ?? '—',
            playerStatus,
            points: t.totalPoints ?? 0,
            elims: t.kills ?? 0,
          };
        });

        if (!cancelled) setTeams(mapped);
      } catch {
        // ignore
      }
    };

    fetchLive();
    const id = window.setInterval(fetchLive, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent font-sans">
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <LiveLeaderboard teams={teams} />
        </div>
      </div>
    </div>
  );
}
