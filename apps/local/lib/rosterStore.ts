import { setRoster } from './gameStore';
import { onRosterLoaded, onRosterCleared } from './lifecycleStore';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RosterPlayer {
  player_open_id: string;
  display_name: string;
}

export interface RosterTeam {
  team_id: string;
  slot_number: number;
  name: string;
  short_name: string;
  brand_color: string;
  logo_path?: string;
  logo_url?: string;
  players: RosterPlayer[];
}

export interface PointSystem {
  kill_points: number;
  placement_points: Record<string, number>;
}

export interface RosterMapping {
  version: number;
  tournament_id: string;
  stage_id: string;
  match_id: string;
  match_ids?: string[];
  stage_name?: string;
  group_id?: string;
  group_name?: string;
  cloud_endpoint?: string;
  cloud_api_key?: string;
  point_system: PointSystem;
  org: {
    id: string;
    name: string;
    brand_color: string;
    logo_path?: string;
    logo_url?: string;
    sponsors?: string[];
  };
  teams: RosterTeam[];
  player_index: Record<string, { team_id: string; display_name: string; slot_number: number }>;
}

// ─── Module State ──────────────────────────────────────────────────────────────

let roster: RosterMapping | null = null;

// ─── Accessors ─────────────────────────────────────────────────────────────────

export function getRoster(): RosterMapping | null {
  return roster;
}

export function setRosterFromCloud(next: RosterMapping | null): void {
  roster = next;
  setRoster(next);
  if (next) onRosterLoaded(); else onRosterCleared();
}

export function getPointSystem(): PointSystem {
  return roster?.point_system ?? {
    kill_points: 1,
    placement_points: {
      '1': 10, '2': 6, '3': 5, '4': 4, '5': 3,
      '6': 2, '7': 1, '8': 1,
    },
  };
}

export function getOrgBrandColor(): string {
  return roster?.org.brand_color ?? '#2F6B3F';
}

export function getSponsors(): string[] {
  return (roster?.org.sponsors ?? []).filter(Boolean) as string[];
}
