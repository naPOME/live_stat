import fs from 'fs';
import path from 'path';
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
  logo_path_64?: string;
  players: RosterPlayer[];
}

export interface PointSystem {
  kill_points: number;
  placement_points: Record<string, number>;
}

export interface OverlayTheme {
  bg_color: string;
  accent_color: string;
  font: string;
  leaderboard_position?: string;
  logo_position?: string;
}

export interface RosterMapping {
  version: number;
  tournament_id: string;
  stage_id: string;
  match_id: string;
  /** All match IDs when exported at stage/group level (first is match_id) */
  match_ids?: string[];
  /** Stage/group metadata from stage/group exports */
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
    theme?: OverlayTheme;
  };
  teams: RosterTeam[];
  player_index: Record<string, { team_id: string; display_name: string; slot_number: number }>;
}

// ─── Module State ──────────────────────────────────────────────────────────────

export type RosterSource = 'file' | 'cloud' | 'none';

let roster: RosterMapping | null = null;
let rosterPathOverride: string | null = null;
let watchedPath: string | null = null;
let lastRosterError: string | null = null;
let rosterSource: RosterSource = 'none';
let fileMode = true;

function getRosterPath(): string | null {
  return rosterPathOverride ?? process.env.ROSTER_MAPPING_PATH ?? null;
}

function load(): void {
  if (!fileMode) return;
  const filePath = getRosterPath();
  if (!filePath) return;

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    roster = JSON.parse(raw) as RosterMapping;
    setRoster(roster);
    lastRosterError = null;
    rosterSource = 'file';
    onRosterLoaded();
    console.log('[RosterStore] Loaded roster:', filePath);
  } catch (err) {
    lastRosterError = err instanceof Error ? err.message : String(err);
    console.error('[RosterStore] Failed to load roster:', err);
  }
}

function watch(filePath?: string | null): void {
  if (!fileMode) return;
  const nextPath = filePath ?? getRosterPath();
  if (!nextPath) return;
  if (watchedPath === nextPath) return;
  if (watchedPath) fs.unwatchFile(watchedPath);

  watchedPath = nextPath;
  fs.watchFile(nextPath, { interval: 2000 }, () => {
    console.log('[RosterStore] Roster file changed, reloading...');
    load();
  });
}

// Load on import (server startup)
if (typeof window === 'undefined') {
  load();
  watch();
}

// ─── Accessors ─────────────────────────────────────────────────────────────────

export function getRoster(): RosterMapping | null {
  return roster;
}

export function getRosterSource(): RosterSource {
  return rosterSource;
}

export function getRosterPathValue(): string | null {
  if (!fileMode) return null;
  return getRosterPath();
}

export function reloadRoster(): RosterMapping | null {
  if (fileMode) load();
  return roster;
}

export function getRosterError(): string | null {
  return lastRosterError;
}

export function setRosterPathOverride(nextPath: string | null): string | null {
  fileMode = true;
  rosterPathOverride = nextPath?.trim() || null;
  load();
  watch(rosterPathOverride);
  if (!roster) {
    rosterSource = 'none';
  }
  return rosterPathOverride;
}

export function setRosterFromCloud(next: RosterMapping | null): void {
  fileMode = false;
  if (watchedPath) {
    fs.unwatchFile(watchedPath);
    watchedPath = null;
  }
  roster = next;
  setRoster(next);
  lastRosterError = null;
  rosterSource = next ? 'cloud' : 'none';
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

export function getTheme(): OverlayTheme {
  return roster?.org.theme ?? {
    bg_color: '#0a0a1a',
    accent_color: '#9b8afb',
    font: 'Inter',
  };
}

export function getOrgBrandColor(): string {
  return roster?.org.brand_color ?? '#9b8afb';
}
