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
      health: 100,
      healthMax: 100,
      liveState: 0,
      damage: 0,
      bHasDied: false,
    })),
  );

  handleTotalMessage({
    GameID: matchId,
    TeamInfoList,
    TotalPlayerList,
    FightingStartTime: '',
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

  if (existingTeams.length > 0) {
    const idx = Math.floor(Math.random() * existingTeams.length);
    const t = existingTeams[idx];
    const TeamInfoList = existingTeams.map((et) => ({
      teamId: et.slot,
      teamName: et.inGameName,
      killNum: et === t ? et.killNum + 1 : et.killNum,
      liveMemberNum: et.liveMemberNum,
    }));
    handleTotalMessage({ GameID: matchId, TeamInfoList, TotalPlayerList: [], FightingStartTime: '' });
    return;
  }

  // Create demo teams
  const demoTeams = ['Alpha', 'Bravo', 'Charlie', 'Delta'].map((name, i) => ({
    teamId: i + 1,
    teamName: name,
    killNum: Math.floor(Math.random() * 5),
    liveMemberNum: Math.floor(Math.random() * 4) + 1,
  }));

  handleTotalMessage({ GameID: matchId, TeamInfoList: demoTeams, TotalPlayerList: [], FightingStartTime: '' });
}
