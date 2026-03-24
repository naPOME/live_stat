import { NextResponse } from 'next/server';
import { getState, getPhase, snapshot } from '@/lib/gameStore';
import { getRoster } from '@/lib/rosterStore';
import { calcTeamPoints } from '@/lib/scorer';
import { ok, err } from '@shared/api';
import type { LiveState, LeaderboardTeam, LeaderboardPlayer } from '@shared/types';

export const runtime = 'nodejs';

// Initialise rosterStore (file watch) on first request
import '@/lib/rosterStore';

/**
 * GET /api/state — Unified live state endpoint.
 * Returns everything a dashboard needs in one call:
 * teams, players, kills, circle, timestamps, observing, spotlight.
 *
 * Wrapped in the standard { ok, data, ts } envelope.
 */
export async function GET() {
  try {
    const gs = getState();
    const phase = getPhase();
    const snap = snapshot();
    const teams = Array.from(gs.teams.values());
    const roster = getRoster();

    // Build leaderboard teams
    let leaderboard: LeaderboardTeam[] = teams.map(t => {
      const kills = t.killNum;
      const alive = t.liveMemberNum > 0;
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
    if (leaderboard.length === 0 && roster?.teams?.length) {
      leaderboard = roster.teams
        .slice()
        .sort((a, b) => a.slot_number - b.slot_number)
        .map(t => ({
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

    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.kills !== a.kills) return b.kills - a.kills;
      return (a.placement ?? 99) - (b.placement ?? 99);
    });

    // Build player list with full stats
    const players: LeaderboardPlayer[] = Array.from(gs.players.values()).map(p => ({
      playerName: p.playerName,
      displayName: p.displayName,
      teamName: p.teamName,
      teamSlot: p.teamSlot,
      kills: p.killNum,
      damage: p.damage,
      damageTaken: p.inDamage ?? 0,
      heal: p.heal ?? 0,
      headshots: p.headShotNum ?? 0,
      assists: p.assists ?? 0,
      knockouts: p.knockouts ?? 0,
      rescues: p.rescueTimes ?? 0,
      survivalTime: p.survivalTime ?? 0,
      survived: !p.bHasDied,
    }));

    // Spotlight (MVP so far)
    const allPlayers = Array.from(gs.players.values());
    let bestPlayer = allPlayers[0];
    for (const p of allPlayers) {
      if ((p.killNum ?? 0) > (bestPlayer?.killNum ?? 0)) bestPlayer = p;
    }
    const spotlight = bestPlayer?.killNum > 0
      ? { playerName: bestPlayer.playerName, displayName: bestPlayer.displayName, teamName: bestPlayer.teamName, kills: bestPlayer.killNum }
      : null;

    // Observing player
    let observing: LiveState['observing'] = null;
    if (gs.observingUid) {
      const openId = gs.uidToOpenId.get(gs.observingUid) ?? gs.observingUid;
      const player = gs.players.get(openId) ?? null;
      const team = player ? gs.teams.get(player.teamSlot) ?? null : null;
      observing = { uid: gs.observingUid, player, team };
    }

    const data: LiveState = {
      matchId: gs.gameId || 'default',
      phase,
      serverTime: Date.now(),
      timestamps: snap.timestamps,
      circle: snap.circle,
      teams: leaderboard,
      players,
      kills: snap.kills,
      observing,
      spotlight,
    };

    return NextResponse.json(ok(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[/api/state]', e);
    return NextResponse.json(err(message), { status: 500 });
  }
}
