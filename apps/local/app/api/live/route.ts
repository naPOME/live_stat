import { NextResponse } from 'next/server';
import { getState, getPhase } from '@/lib/gameStore';
import { calcTeamPoints } from '@/lib/scorer';

export const runtime = 'nodejs';

// Initialise rosterStore (file watch) on first request
import '@/lib/rosterStore';

export async function GET() {
  try {
    const gs = getState();
    const phase = getPhase();
    const teams = Array.from(gs.teams.values());

    const leaderboard = teams.map(t => {
      const kills = t.killNum;
      const placement = t.liveMemberNum === 0 ? t.rank : undefined;
      const placementPoints = calcTeamPoints(placement, 0);
      const totalPoints = calcTeamPoints(placement, kills);

      return {
        teamName: t.inGameName,
        displayName: t.displayName,
        shortName: t.shortName,
        brandColor: t.brandColor,
        logoPath: t.logoPath,
        kills,
        placement,
        alive: t.liveMemberNum > 0,
        liveMemberNum: t.liveMemberNum,
        placementPoints,
        totalPoints,
        updatedAt: Date.now(),
      };
    });

    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.kills !== a.kills) return b.kills - a.kills;
      return (a.placement ?? 99) - (b.placement ?? 99);
    });

    const players = Array.from(gs.players.values());
    let bestPlayer = players[0];
    for (const p of players) {
      if ((p.killNum ?? 0) > (bestPlayer?.killNum ?? 0)) bestPlayer = p;
    }
    const spotlight =
      bestPlayer?.killNum > 0
        ? {
            playerName: bestPlayer.playerName,
            displayName: bestPlayer.displayName,
            teamName: bestPlayer.teamName,
            kills: bestPlayer.killNum,
          }
        : undefined;

    return NextResponse.json({
      matchId: gs.gameId || 'default',
      serverTime: Date.now(),
      phase,
      spotlight,
      teams: leaderboard,
      players: players.map(p => ({
        playerName: p.playerName,
        displayName: p.displayName,
        teamName: p.teamName,
        kills: p.killNum,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Live API]', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
