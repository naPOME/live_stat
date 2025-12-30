'use client';

import { useEffect, useRef, useState } from 'react';
import LiveLeaderboard from '@/components/LiveLeaderboard';
import type { LeaderboardResponse } from '@/lib/types';

export default function Home() {
  const [teams, setTeams] = useState<
    Array<{ rank: number; teamName: string; playerStatus: number[]; points: number; elims: number }>
  >([]);

  const [spotlight, setSpotlight] = useState<
    | {
        playerName: string;
        teamName: string;
        kills: number;
      }
    | undefined
  >(undefined);

  const [spotlightVisible, setSpotlightVisible] = useState(false);
  const spotlightTimeoutRef = useRef<number | null>(null);

  const [flashByTeam, setFlashByTeam] = useState<Record<string, 'kills' | 'points' | 'alive'>>({});
  const prevSnapshotRef = useRef<Record<string, { points: number; elims: number; aliveCount: number }>>({});
  const flashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as LeaderboardResponse;

        const nextSpotlight = data.spotlight;
        const prevKey = spotlight
          ? `${spotlight.playerName}|${spotlight.teamName}|${spotlight.kills}`
          : '';
        const nextKey = nextSpotlight
          ? `${nextSpotlight.playerName}|${nextSpotlight.teamName}|${nextSpotlight.kills}`
          : '';

        if (nextKey && nextKey !== prevKey) {
          setSpotlight(nextSpotlight);
          setSpotlightVisible(true);
          if (spotlightTimeoutRef.current !== null) {
            window.clearTimeout(spotlightTimeoutRef.current);
            spotlightTimeoutRef.current = null;
          }
          spotlightTimeoutRef.current = window.setTimeout(() => {
            setSpotlightVisible(false);
          }, 2000);
        } else {
          setSpotlight(nextSpotlight);
        }

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

        const nextSnapshot: Record<string, { points: number; elims: number; aliveCount: number }> = {};
        const nextFlash: Record<string, 'kills' | 'points' | 'alive'> = {};
        for (const t of mapped) {
          let aliveCount = 0;
          for (const s of t.playerStatus) {
            if (s === 2) aliveCount += 1;
          }
          nextSnapshot[t.teamName] = { points: t.points, elims: t.elims, aliveCount };

          const prev = prevSnapshotRef.current[t.teamName];
          if (!prev) continue;

          if (t.elims !== prev.elims) nextFlash[t.teamName] = 'kills';
          else if (t.points !== prev.points) nextFlash[t.teamName] = 'points';
          else if (aliveCount !== prev.aliveCount) nextFlash[t.teamName] = 'alive';
        }
        prevSnapshotRef.current = nextSnapshot;

        if (flashTimeoutRef.current !== null) {
          window.clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = null;
        }
        if (Object.keys(nextFlash).length) {
          setFlashByTeam(nextFlash);
          flashTimeoutRef.current = window.setTimeout(() => setFlashByTeam({}), 650);
        }

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
      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }

      if (spotlightTimeoutRef.current !== null) {
        window.clearTimeout(spotlightTimeoutRef.current);
        spotlightTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent font-sans">
      {spotlight && spotlightVisible ? (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#1e1f35]/95 border border-[#2e2f4f] shadow-2xl">
            <div className="relative">
              <svg
                className="gunIcon"
                width="28"
                height="18"
                viewBox="0 0 64 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M6 18c0-2 2-4 4-4h26c1.7 0 3 1.3 3 3v3h7v-3c0-2 1.6-4 4-4h8c2 0 4 2 4 4v6c0 2-2 4-4 4h-4v5c0 2-2 4-4 4H38c-2 0-4-2-4-4v-5H20v7c0 2-2 4-4 4h-2c-2 0-4-2-4-4v-7H10c-2 0-4-2-4-4v-5z"
                  fill="#00ffc3"
                  fillOpacity="0.95"
                />
                <path
                  d="M39 14h8c2 0 4 2 4 4v3h-4v-3c0-.7-.3-1-1-1h-7v-3z"
                  fill="#6d5efc"
                  fillOpacity="0.9"
                />
              </svg>
              <div className="muzzle" aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <div className="text-[#8b8da6] text-[10px] font-bold tracking-widest uppercase text-center">Spotlight</div>
              <div className="text-white text-sm font-semibold whitespace-nowrap">
                {spotlight.playerName}{' '}
                <span className="text-[#8b8da6]">({spotlight.teamName})</span>{' '}
                <span className="text-[#ff4e4e]">{spotlight.kills}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <LiveLeaderboard teams={teams} flashByTeam={flashByTeam} />
        </div>
      </div>

      <style jsx>{`
        .gunIcon {
          display: block;
          filter: drop-shadow(0 0 8px rgba(0, 255, 195, 0.25));
          transform-origin: 85% 50%;
          animation: gunRecoil 1.2s infinite;
        }

        .muzzle {
          position: absolute;
          right: -6px;
          top: 50%;
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          transform: translateY(-50%);
          background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 78, 78, 0.9) 45%, rgba(255, 78, 78, 0) 70%);
          opacity: 0;
          animation: muzzleFlash 1.2s infinite;
          filter: blur(0.1px);
        }

        @keyframes gunRecoil {
          0%,
          84%,
          100% {
            transform: translateX(0) rotate(0deg);
          }
          88% {
            transform: translateX(-2px) rotate(-8deg);
          }
          92% {
            transform: translateX(0) rotate(0deg);
          }
        }

        @keyframes muzzleFlash {
          0%,
          84%,
          100% {
            opacity: 0;
            transform: translateY(-50%) scale(0.6);
          }
          88% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          92% {
            opacity: 0;
            transform: translateY(-50%) scale(0.75);
          }
        }
      `}</style>
    </div>
  );
}
