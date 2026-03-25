import { getState, getPhase, snapshot } from './gameStore';
import { getRoster } from './rosterStore';
import { calcTeamPoints } from './scorer';
import type { LeaderboardPlayer, LeaderboardResponse, LeaderboardTeam, LiveState } from '@shared/types';

function buildTeams(): LeaderboardTeam[] {
  const gs = getState();
  const roster = getRoster();
  const teams = Array.from(gs.teams.values());

  let leaderboard = teams.map((t) => {
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
      logoUrl: t.logoUrl,
      kills,
      placement,
      alive,
      liveMemberNum: t.liveMemberNum,
      placementPoints,
      totalPoints,
      updatedAt: Date.now(),
    };
  });

  if (leaderboard.length === 0 && roster?.teams?.length) {
    leaderboard = roster.teams
      .slice()
      .sort((a, b) => a.slot_number - b.slot_number)
      .map((t) => ({
        teamName: t.name,
        displayName: t.name,
        shortName: t.short_name,
        brandColor: t.brand_color,
        logoPath: t.logo_path,
        logoUrl: t.logo_url,
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

  return leaderboard;
}

function buildPlayers(): LeaderboardPlayer[] {
  const gs = getState();
  return Array.from(gs.players.values()).map((p) => ({
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
}

function buildObserving(): LiveState['observing'] {
  const gs = getState();
  if (!gs.observingUid) return null;

  const openId = gs.uidToOpenId.get(gs.observingUid) ?? gs.observingUid;
  const player = gs.players.get(openId) ?? null;
  const team = player ? gs.teams.get(player.teamSlot) ?? null : null;
  return { uid: gs.observingUid, player, team };
}

function buildSpotlight(players: LeaderboardPlayer[]): LiveState['spotlight'] {
  const best = [...players].sort((a, b) => b.kills - a.kills || b.damage - a.damage)[0];
  if (!best || best.kills <= 0) return null;
  return {
    playerName: best.playerName,
    displayName: best.displayName,
    teamName: best.teamName,
    kills: best.kills,
  };
}

export function buildLiveState(): LiveState {
  const gs = getState();
  const snap = snapshot();
  const players = buildPlayers();
  return {
    matchId: gs.gameId || 'default',
    phase: getPhase(),
    serverTime: Date.now(),
    timestamps: snap.timestamps,
    circle: snap.circle,
    teams: buildTeams(),
    players,
    kills: snap.kills,
    observing: buildObserving(),
    spotlight: buildSpotlight(players),
  };
}

export function buildLegacyLiveState(): LeaderboardResponse {
  const state = buildLiveState();
  return {
    matchId: state.matchId,
    serverTime: state.serverTime,
    phase: state.phase,
    spotlight: state.spotlight ?? undefined,
    teams: state.teams,
    players: state.players,
  };
}
