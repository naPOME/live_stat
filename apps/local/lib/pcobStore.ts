/**
 * pcobStore — PCOB (external data source) ingestion layer.
 * Bridges external match payloads into the main gameStore.
 */

import { handleTotalMessage, getState } from './gameStore';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface PcobTeam {
  name: string;
  kills?: number;
  placement?: number;
  alive?: boolean;
  players?: { name: string; kills?: number }[];
}

export interface PcobIngestPayload {
  matchId?: string;
  timestamp?: number;
  teams?: PcobTeam[];
  team?: PcobTeam;
}

// ─── Functions ──────────────────────────────────────────────────────────────────

/**
 * Ingest a structured payload (teams array or single team).
 * Maps each team/player into a totalMessage-style update so the main
 * gameStore stays the single source of truth.
 */
export function upsertFromPayload(payload: PcobIngestPayload): { matchId: string; changed: boolean } {
  const matchId = payload.matchId?.trim() || 'default';
  const teams = payload.teams ?? (payload.team ? [payload.team] : []);

  if (teams.length === 0) return { matchId, changed: false };

  const TeamInfoList = teams.map((t, idx) => ({
    teamId: idx + 1,
    teamName: t.name,
    killNum: t.kills ?? 0,
    liveMemberNum: t.alive === false ? 0 : (t.players?.length ?? 4),
  }));

  const TotalPlayerList = teams.flatMap((t, tIdx) =>
    (t.players ?? []).map((p, pIdx) => ({
      uId: tIdx * 100 + pIdx,
      playerOpenId: `pcob-${tIdx}-${pIdx}`,
      playerName: p.name,
      teamId: tIdx + 1,
      teamName: t.name,
      killNum: p.kills ?? 0,
      killNumBeforeDie: 0,
      health: 100,
      healthMax: 100,
      liveState: 0,
      damage: 0,
      inDamage: 0,
      heal: 0,
      headShotNum: 0,
      assists: 0,
      knockouts: 0,
      rescueTimes: 0,
      survivalTime: 0,
      marchDistance: 0,
      driveDistance: 0,
      rank: 0,
      bHasDied: false,
    })),
  );

  handleTotalMessage({
    GameID: matchId,
    TeamInfoList,
    TotalPlayerList,
    GameStartTime: '0',
    FightingStartTime: '',
    FinishedStartTime: '0',
  });

  return { matchId, changed: true };
}

/**
 * Try to recognise a raw PCOB-format payload (non-validated).
 * Returns { recognized: true, matchId, changed } if it looks like PCOB data,
 * otherwise { recognized: false }.
 */
export function upsertFromPcobRaw(
  body: unknown,
): { recognized: true; matchId: string; changed: boolean } | { recognized: false } {
  if (typeof body !== 'object' || body === null) return { recognized: false };

  const obj = body as Record<string, unknown>;

  // Check for PCOB-style fields
  if (!('teams' in obj) && !('team' in obj)) return { recognized: false };

  try {
    const result = upsertFromPayload(obj as PcobIngestPayload);
    return { recognized: true, ...result };
  } catch {
    return { recognized: false };
  }
}

/**
 * Generate a mock tick for testing — increments kills on existing teams
 * or creates a minimal demo state.
 */
export function ingestMockTick(matchId: string): void {
  const gs = getState();
  const existingTeams = Array.from(gs.teams.values());
  const existingPlayers = Array.from(gs.players.values());

  if (existingTeams.length > 0) {
    const idx = Math.floor(Math.random() * existingTeams.length);
    const t = existingTeams[idx];
    const TeamInfoList = existingTeams.map((et) => ({
      teamId: et.slot,
      teamName: et.inGameName,
      killNum: et === t ? et.killNum + 1 : et.killNum,
      liveMemberNum: et.liveMemberNum,
    }));
    // Bump a random player's kills/damage
    const teamPlayers = existingPlayers.filter(p => p.teamSlot === t.slot);
    const luckyPlayer = teamPlayers.length > 0 ? teamPlayers[Math.floor(Math.random() * teamPlayers.length)] : null;
    const TotalPlayerList = existingPlayers.map((p) => ({
      uId: Number(p.uId) || 0, playerName: p.playerName, playerOpenId: p.openId || p.playerName,
      teamId: p.teamSlot, teamName: p.teamName, health: p.bHasDied ? 0 : 80, healthMax: 100,
      liveState: p.bHasDied ? 2 : 0, killNum: p === luckyPlayer ? p.killNum + 1 : p.killNum, killNumBeforeDie: 0,
      damage: p === luckyPlayer ? p.damage + Math.floor(Math.random() * 200 + 50) : p.damage,
      inDamage: p.inDamage ?? 0, heal: p.heal ?? 0, headShotNum: p.headShotNum ?? 0,
      assists: p.assists ?? 0, knockouts: p.knockouts ?? 0, rescueTimes: p.rescueTimes ?? 0,
      survivalTime: p.survivalTime ?? 0, marchDistance: p.marchDistance ?? 0, driveDistance: p.driveDistance ?? 0,
      rank: p.rank ?? 0, bHasDied: p.bHasDied ?? false,
    }));
    handleTotalMessage({ GameID: matchId, TeamInfoList, TotalPlayerList, GameStartTime: '0', FightingStartTime: '', FinishedStartTime: '0' });
    return;
  }

  // Create demo teams + players
  const DEMO_NAMES: Record<string, string[]> = {
    'Alpha Esports': ['Ace', 'Blaze', 'Clutch', 'Drift'],
    'Bravo Gaming': ['Echo', 'Frost', 'Ghost', 'Haze'],
    'Charlie FC': ['Ink', 'Jinx', 'Kade', 'Lynx'],
    'Delta Squad': ['Mako', 'Nyx', 'Onyx', 'Pike'],
    'Eagle Eye': ['Rift', 'Sage', 'Thorn', 'Vex'],
    'Falcon Rise': ['Wolf', 'Xenon', 'Yuki', 'Zane'],
    'Ghost Riders': ['Arko', 'Bliss', 'Crow', 'Dusk'],
    'Havoc Unit': ['Edge', 'Fyre', 'Grit', 'Hawk'],
  };
  const teamNames = Object.keys(DEMO_NAMES);
  const demoTeams = teamNames.map((name, i) => ({
    teamId: i + 1,
    teamName: name,
    killNum: Math.floor(Math.random() * 8),
    liveMemberNum: Math.floor(Math.random() * 3) + 2,
  }));
  const TotalPlayerList = teamNames.flatMap((tName, ti) => {
    const players = DEMO_NAMES[tName];
    const teamKills = demoTeams[ti].killNum;
    return players.map((pName, pi) => {
      const kills = pi === 0 ? Math.ceil(teamKills * 0.5) : Math.floor(Math.random() * Math.max(1, teamKills * 0.3));
      return {
        uId: ti * 100 + pi + 1, playerName: pName, playerOpenId: `demo_${tName}_${pName}`,
        teamId: ti + 1, teamName: tName, health: 80 + Math.floor(Math.random() * 20), healthMax: 100,
        liveState: 0, killNum: kills, killNumBeforeDie: 0,
        damage: kills * (200 + Math.floor(Math.random() * 300)) + Math.floor(Math.random() * 400),
        inDamage: Math.floor(Math.random() * 200), heal: Math.floor(Math.random() * 100),
        headShotNum: Math.floor(kills * 0.3), assists: Math.floor(Math.random() * 3),
        knockouts: Math.floor(Math.random() * 2), rescueTimes: Math.floor(Math.random() * 2),
        survivalTime: 0, marchDistance: 0, driveDistance: 0, rank: 0, bHasDied: false,
      };
    });
  });

  handleTotalMessage({ GameID: matchId, TeamInfoList: demoTeams, TotalPlayerList, GameStartTime: '0', FightingStartTime: String(Date.now()), FinishedStartTime: '0' });
}
