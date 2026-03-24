import { setRosterFromCloud } from './rosterStore';

/**
 * Match config fetched from cloud. Replaces the old roster_mapping.json approach.
 * This is the source of truth for team/player data during a match.
 */

export interface MatchTeam {
  team_id: string;
  slot_number: number;
  name: string;
  short_name: string;
  brand_color: string;
  logo_url: string | null;
  players: Array<{ player_open_id: string; display_name: string }>;
}

export interface MatchConfig {
  cloud_url: string;
  cloud_endpoint: string;
  cloud_api_key: string;
  tournament_id: string;
  tournament_name: string;
  tournament_format: string;
  stage_id: string;
  stage_name: string;
  match_id: string;
  match_ids: string[];
  match_name: string;
  match_map: string | null;
  point_system: { kill_points: number; placement_points: Record<string, number> };
  org: {
    name: string;
    brand_color: string;
    logo_url: string | null;
    sponsors: string[];
  };
  teams: MatchTeam[];
  player_index: Record<string, { team_id: string; display_name: string; slot_number: number }>;
}

let config: MatchConfig | null = null;

export function getMatchConfig(): MatchConfig | null {
  return config;
}

export function setMatchConfig(next: MatchConfig | null): void {
  config = next;

  if (next) {
    // Bridge to rosterStore — converts to the RosterMapping shape
    // This updates both rosterStore state (for getPointSystem/getRoster) and gameStore (for enrichment)
    setRosterFromCloud({
      version: 2,
      tournament_id: next.tournament_id,
      stage_id: next.stage_id,
      match_id: next.match_id,
      match_ids: next.match_ids,
      stage_name: next.stage_name,
      cloud_endpoint: next.cloud_endpoint,
      cloud_api_key: next.cloud_api_key,
      point_system: next.point_system,
      org: {
        id: '',
        name: next.org.name,
        brand_color: next.org.brand_color,
        logo_url: next.org.logo_url ?? undefined,
      },
      teams: next.teams.map(t => ({
        team_id: t.team_id,
        slot_number: t.slot_number,
        name: t.name,
        short_name: t.short_name,
        brand_color: t.brand_color,
        logo_url: t.logo_url ?? undefined,
        players: t.players,
      })),
      player_index: next.player_index,
    });

    console.log(`[MatchConfig] Loaded: ${next.tournament_name} / ${next.stage_name} / ${next.match_name} (${next.teams.length} teams)`);
  } else {
    setRosterFromCloud(null);
    console.log('[MatchConfig] Cleared');
  }
}

export function clearMatchConfig(): void {
  setMatchConfig(null);
}
