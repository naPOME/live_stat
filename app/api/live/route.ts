import { NextResponse } from "next/server";
import { startParser } from "@/lib/parser";
import type { LeaderboardResponse } from "@/lib/types";

export const runtime = "nodejs";

let inMemoryStarted = false;
let latestParsedEvent: any | null = null;

function getLogFilePath(): string {
  return (
    process.env.LIVE_LOG_PATH ||
    'C:\\Users\\natnaelb\\Downloads\\Telegram Desktop\\log-20251220 (3).txt'
  );
}

function ensureInMemoryParserRunning(): void {
  if (inMemoryStarted) return;

  const filePath = getLogFilePath();
  startParser({
    filePath,
    pollIntervalMs: 500,
    onEvent: (data: any) => {
      latestParsedEvent = data;
    },
    onError: () => {
      // ignore
    },
  });

  inMemoryStarted = true;
}

function placementToPoints(placement?: number): number {
  if (!placement || placement < 1) return 0;
  const points: Record<number, number> = {
    1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1,
    9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0,
    17: 0, 18: 0, 19: 0, 20: 0,
  };
  return points[placement] ?? 0;
}

export async function GET() {
  try {
    ensureInMemoryParserRunning();

    const latestEvent = latestParsedEvent;
    if (!latestEvent || !latestEvent.TeamInfoList) {
      return NextResponse.json({
        matchId: "default",
        serverTime: Date.now(),
        spotlight: undefined,
        teams: []
      });
    }

    const spotlight = (() => {
      const players: Array<{ playerName: string; teamName: string; killNum: number }> =
        (latestEvent.TotalPlayerList as any[]) ?? [];

      if (!players.length) return undefined;

      let best = players[0];
      for (const p of players) {
        if ((p.killNum ?? 0) > (best.killNum ?? 0)) best = p;
      }

      const kills = best.killNum ?? 0;
      if (!best.playerName || !best.teamName) return undefined;
      return {
        playerName: best.playerName,
        teamName: best.teamName,
        kills,
      };
    })();

    // Convert to leaderboard format
    const teams = latestEvent.TeamInfoList.map((team: any) => {
      const liveMemberNum = team.liveMemberNum || 0;
      const placementPoints = 0;
      const totalPoints = (team.killNum || 0) + placementPoints;
      const alive = liveMemberNum > 0;
      
      return {
        teamName: team.teamName,
        kills: team.killNum || 0,
        placement: undefined,
        alive: alive,
        liveMemberNum,
        placementPoints,
        totalPoints,
        updatedAt: Date.now(),
      };
    });

    // Sort by total points
    teams.sort((a: any, b: any) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.kills !== a.kills) return b.kills - a.kills;
      return (a.placement ?? Number.POSITIVE_INFINITY) - (b.placement ?? Number.POSITIVE_INFINITY);
    });

    return NextResponse.json({
      matchId: latestEvent.GameID || "default",
      serverTime: Date.now(),
      spotlight,
      teams,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Live API] error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
