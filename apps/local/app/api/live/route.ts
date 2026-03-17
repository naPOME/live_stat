import { NextResponse } from 'next/server';
import { getState, getPhase } from '@/lib/gameStore';
import { getRoster } from '@/lib/rosterStore';
import { calcTeamPoints } from '@/lib/scorer';

export const runtime = 'nodejs';

// Initialise rosterStore (file watch) on first request
import '@/lib/rosterStore';

export async function GET() {
  try {
    const gs = getState();
    const phase = getPhase();
    const teams = Array.from(gs.teams.values());

    let leaderboard = teams.map(t => {
      const kills = t.killNum;
      const alive = t.liveMemberNum > 0;
      // Use game-assigned rank for eliminated teams. Alive teams have no placement yet.
      const placement = !alive && t.rank > 0 ? t.rank : undefined;
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
        alive,
        liveMemberNum: t.liveMemberNum,
        placementPoints,
        totalPoints,
        updatedAt: Date.now(),
      };
    });

    // Fallback to roster teams when no live data yet
    if (leaderboard.length === 0) {
      const roster = getRoster();
      if (roster?.teams?.length) {
        leaderboard = roster.teams
          .slice()
          .sort((a, b) => a.slot_number - b.slot_number)
          .map((t) => ({
            teamName: t.name,
            displayName: t.name,
            shortName: t.short_name,
            brandColor: t.brand_color,
            logoPath: t.logo_path,
            kills: 0,
            placement: undefined,
            alive: true,
            liveMemberNum: t.players?.length ?? 4,
            placementPoints: 0,
            totalPoints: 0,
            updatedAt: Date.now(),
          }));
      }
    }

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
