import fs from 'fs';
import path from 'path';
import { getState } from './gameStore';
import { getRoster } from './rosterStore';
import { calcTeamPoints } from './scorer';

interface PlayerResult {
  player_open_id: string;
  team_id: string;
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

interface MatchResult {
  tournament_id: string;
  stage_id: string;
  match_id: string;
  game_id: string;
  results: Array<{
    team_id: string;
    placement: number;
    kill_count: number;
    total_pts: number;
  }>;
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

  // Sort by rank to determine placement
  const sorted = [...teams].sort((a, b) => a.rank - b.rank);

  const results = sorted
    .filter(t => t.registeredTeamId)
    .map((t) => ({
      team_id: t.registeredTeamId!,
      placement: t.rank,
      kill_count: t.killNum,
      total_pts: calcTeamPoints(t.rank, t.killNum),
    }));

  // Collect per-player stats
  const teamIdBySlot = new Map(sorted.filter(t => t.registeredTeamId).map(t => [t.slot, t.registeredTeamId!]));
  const playerResults: PlayerResult[] = [];
  for (const p of gs.players.values()) {
    const teamId = teamIdBySlot.get(p.teamSlot);
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
  }

  const body: MatchResult = {
    tournament_id: roster.tournament_id,
    stage_id: roster.stage_id,
    match_id: roster.match_id,
    game_id: gs.gameId,
    results,
    player_results: playerResults,
  };

  return tryPost(roster.cloud_endpoint, roster.cloud_api_key, body, 1);
}
