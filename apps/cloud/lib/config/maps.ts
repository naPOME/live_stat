

export type GameMap = {

  id: string;
  name: string;
  size?: string;
  color: string;
  weight: number;
  competitive: boolean;
};

export const GAME_MAPS: GameMap[] = [
  { id: 'erangel',  name: 'Erangel',  size: '8×8',  color: '#3b82f6', weight: 3, competitive: true },
  { id: 'miramar',  name: 'Miramar',  size: '8×8',  color: '#f59e0b', weight: 2, competitive: true },
  { id: 'vikendi',  name: 'Vikendi',  size: '6×6',  color: '#2F6B3F', weight: 1, competitive: true },
  { id: 'sanhok',   name: 'Sanhok',   size: '4×4',  color: '#22c55e', weight: 1, competitive: true },
  { id: 'rondo',    name: 'Rondo',    size: '8×8',  color: '#ef4444', weight: 2, competitive: true },
  { id: 'deston',   name: 'Deston',   size: '8×8',  color: '#06b6d4', weight: 1, competitive: true },
  { id: 'nusa',     name: 'Nusa',     size: '1×1',  color: '#14b8a6', weight: 0, competitive: false },
  { id: 'taego',    name: 'Taego',    size: '8×8',  color: '#a3e635', weight: 1, competitive: false },
];


export const MAP_BY_ID = Object.fromEntries(GAME_MAPS.map((m) => [m.id, m])) as Record<string, GameMap>;

export const MAP_NAMES = GAME_MAPS
  .filter((m) => m.competitive)
  .map((m) => m.name)
  .concat(GAME_MAPS.filter((m) => !m.competitive).map((m) => m.name));

export function mapNameToId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

export function mapIdToName(id: string): string {
  return MAP_BY_ID[id]?.name ?? id;
}


export const DEFAULT_FINALS_ROTATION = ['Erangel', 'Erangel', 'Erangel', 'Rondo', 'Miramar', 'Miramar'];


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
