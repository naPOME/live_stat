import fs from 'fs';
import path from 'path';
import { getState } from './gameStore';
import { getRoster } from './rosterStore';
import { calcTeamPoints } from './scorer';
import { getLifecycleState } from './lifecycleStore';

interface PlayerResult {
  player_open_id: string;
  team_id?: string;
  in_game_name?: string;
  kills: number;
  damage: number;
  damage_taken: number;
  heal: number;
  headshots: number;
  assists: number;
  knockouts: number;
  rescues: number;
  survival_time: number;
  survived: boolean;
}

interface TeamResult {
  team_id?: string;
  slot_number?: number;
  in_game_team_name?: string;
  placement: number;
  kill_count: number;
  total_pts: number;
}

interface MatchResult {
  tournament_id: string;
  stage_id: string;
  match_id: string;
  game_id: string;
  results: TeamResult[];
  player_results?: PlayerResult[];
}

interface SyncResult {
  ok: boolean;
  error?: string;
}

async function tryPost(url: string, apiKey: string, body: MatchResult, attempt: number): Promise<SyncResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log('[CloudSync] Match result synced successfully.');
    return { ok: true };
  } catch (err) {
    if (attempt < 3) {
      console.warn(`[CloudSync] Attempt ${attempt} failed, retrying in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      return tryPost(url, apiKey, body, attempt + 1);
    }

    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CloudSync] All retries failed. Logging to failed_syncs.json');
    const logPath = path.join(process.cwd(), 'failed_syncs.json');
    let existing: MatchResult[] = [];
    try { existing = JSON.parse(fs.readFileSync(logPath, 'utf-8')); } catch { /* empty */ }
    existing.push(body);
    fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
    return { ok: false, error: errorMsg };
  }
}

export async function pushMatchResult(): Promise<SyncResult> {
  const roster = getRoster();
  if (!roster?.cloud_endpoint || !roster?.cloud_api_key) {
    console.log('[CloudSync] No cloud_endpoint configured, skipping sync.');
    return { ok: true }; // Not an error — just no config
  }

  const gs = getState();
  const teams = Array.from(gs.teams.values());
  const sorted = [...teams].sort((a, b) => a.rank - b.rank);

  // Check if any teams have registered IDs (tournament mode) or not (quick stream)
  const hasRegisteredTeams = sorted.some(t => t.registeredTeamId);

  const results: TeamResult[] = sorted.map((t) => {
    if (hasRegisteredTeams && t.registeredTeamId) {
      return {
        team_id: t.registeredTeamId,
        placement: t.rank,
        kill_count: t.killNum,
        total_pts: calcTeamPoints(t.rank, t.killNum),
      };
    }
    // Quick Stream mode: send slot + in-game name
    return {
      slot_number: t.slot,
      in_game_team_name: t.inGameName || t.displayName || `Team ${t.slot}`,
      placement: t.rank,
      kill_count: t.killNum,
      total_pts: calcTeamPoints(t.rank, t.killNum),
    };
  });

  // Filter out registered-only results in tournament mode (keep all in quick stream)
  const filteredResults = hasRegisteredTeams
    ? results.filter(r => r.team_id)
    : results;

  // Collect per-player stats
  const teamIdBySlot = hasRegisteredTeams
    ? new Map(sorted.filter(t => t.registeredTeamId).map(t => [t.slot, t.registeredTeamId!]))
    : null;

  const playerResults: PlayerResult[] = [];
  for (const p of gs.players.values()) {
    if (hasRegisteredTeams) {
      const teamId = teamIdBySlot?.get(p.teamSlot);
      if (!teamId) continue;
      playerResults.push({
        player_open_id: p.openId,
        team_id: teamId,
        kills: p.killNum,
        damage: p.damage,
        damage_taken: p.inDamage ?? 0,
        heal: p.heal ?? 0,
        headshots: p.headShotNum ?? 0,
        assists: p.assists ?? 0,
        knockouts: p.knockouts ?? 0,
        rescues: p.rescueTimes ?? 0,
        survival_time: p.survivalTime ?? 0,
        survived: !p.bHasDied,
      });
    } else {
      // Quick Stream: include all players with in-game name
      playerResults.push({
        player_open_id: p.openId || p.uId || `unknown_${p.teamSlot}`,
        in_game_name: p.playerName || p.displayName || undefined,
        kills: p.killNum,
        damage: p.damage,
        damage_taken: p.inDamage ?? 0,
        heal: p.heal ?? 0,
        headshots: p.headShotNum ?? 0,
        assists: p.assists ?? 0,
        knockouts: p.knockouts ?? 0,
        rescues: p.rescueTimes ?? 0,
        survival_time: p.survivalTime ?? 0,
        survived: !p.bHasDied,
      });
    }
  }

  // Resolve match_id: cycle through match_ids for multi-match sessions
  const lifecycle = getLifecycleState();
  const matchIds = roster.match_ids;
  if (matchIds && lifecycle.matchNumber > matchIds.length) {
    console.error(`[CloudSync] Match #${lifecycle.matchNumber} exceeds available match_ids (${matchIds.length}). Skipping sync.`);
    return { ok: false, error: `No match_id for match #${lifecycle.matchNumber} (only ${matchIds.length} configured)` };
  }
  const matchId = matchIds?.[lifecycle.matchNumber - 1] ?? roster.match_id;

  const body: MatchResult = {
    tournament_id: roster.tournament_id,
    stage_id: roster.stage_id,
    match_id: matchId,
    game_id: gs.gameId,
    results: filteredResults,
    player_results: playerResults,
  };

  return tryPost(roster.cloud_endpoint, roster.cloud_api_key, body, 1);
}
