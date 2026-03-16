/**
 * Map pool configuration for PUBG Mobile / BR tournaments.
 *
 * Edit this file to add new maps, change weights, or adjust
 * the default finals rotation. All map-related UI and logic
 * across the app reads from here.
 */

export type GameMap = {
  /** Internal key, lowercase, no spaces */
  id: string;
  /** Display name shown in UI */
  name: string;
  /** Grid size label (optional) */
  size?: string;
  /** Hex color used for badges / UI accents */
  color: string;
  /** Default weight in random rotation (higher = more frequent) */
  weight: number;
  /** Whether this map is available in the competitive pool */
  competitive: boolean;
};

export const GAME_MAPS: GameMap[] = [
  { id: 'erangel',  name: 'Erangel',  size: '8×8',  color: '#3b82f6', weight: 3, competitive: true },
  { id: 'miramar',  name: 'Miramar',  size: '8×8',  color: '#f59e0b', weight: 2, competitive: true },
  { id: 'vikendi',  name: 'Vikendi',  size: '6×6',  color: '#8b5cf6', weight: 1, competitive: true },
  { id: 'sanhok',   name: 'Sanhok',   size: '4×4',  color: '#22c55e', weight: 1, competitive: true },
  { id: 'rondo',    name: 'Rondo',    size: '8×8',  color: '#ef4444', weight: 2, competitive: true },
  { id: 'deston',   name: 'Deston',   size: '8×8',  color: '#06b6d4', weight: 1, competitive: true },
  { id: 'nusa',     name: 'Nusa',     size: '1×1',  color: '#14b8a6', weight: 0, competitive: false },
  { id: 'taego',    name: 'Taego',    size: '8×8',  color: '#a3e635', weight: 1, competitive: false },
];

/** Quick lookup: id → GameMap */
export const MAP_BY_ID = Object.fromEntries(GAME_MAPS.map((m) => [m.id, m])) as Record<string, GameMap>;

/** All map names for UI selectors (competitive first) */
export const MAP_NAMES = GAME_MAPS
  .filter((m) => m.competitive)
  .map((m) => m.name)
  .concat(GAME_MAPS.filter((m) => !m.competitive).map((m) => m.name));

/** Name → id helper */
export function mapNameToId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

/** id → display name */
export function mapIdToName(id: string): string {
  return MAP_BY_ID[id]?.name ?? id;
}

/**
 * Default finals rotation (6-map set).
 * Used when auto-generating matches for finals stages.
 */
export const DEFAULT_FINALS_ROTATION = ['Erangel', 'Erangel', 'Erangel', 'Rondo', 'Miramar', 'Miramar'];

/**
 * Generate a weighted random rotation of `count` maps
 * from the given pool (defaults to all competitive maps).
 */
export function generateRotation(count: number, pool?: GameMap[]): string[] {
  const maps = pool ?? GAME_MAPS.filter((m) => m.competitive && m.weight > 0);
  const weighted: string[] = [];
  for (const m of maps) {
    for (let i = 0; i < m.weight; i++) weighted.push(m.name);
  }
  if (weighted.length === 0) return [];

  const result: string[] = [];
  let lastPicked = '';
  for (let i = 0; i < count; i++) {
    // Avoid repeating same map back-to-back when possible
    const candidates = weighted.length > 1
      ? weighted.filter((n) => n !== lastPicked)
      : weighted;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    result.push(pick);
    lastPicked = pick;
  }
  return result;
}
