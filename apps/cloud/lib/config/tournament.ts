
import type { Stage } from '@/lib/types';


export type StagePreset = {
  id: string;
  label: string;
  stages: { name: string; type: Stage['stage_type'] }[];
};

export const STAGE_PRESETS: StagePreset[] = [
  {
    id: 'groups_semis_finals',
    label: 'Groups → Semi-Finals → Grand Finals',
    stages: [
      { name: 'Groups', type: 'group' },
      { name: 'Semi-Finals', type: 'group' },
      { name: 'Grand Finals', type: 'finals' },
    ],
  },
  {
    id: 'groups_finals',
    label: 'Groups → Grand Finals',
    stages: [
      { name: 'Groups', type: 'group' },
      { name: 'Grand Finals', type: 'finals' },
    ],
  },
  {
    id: 'swiss_playoffs',
    label: 'Swiss → Playoffs',
    stages: [
      { name: 'Swiss', type: 'group' },
      { name: 'Playoffs', type: 'finals' },
    ],
  },
  {
    id: 'round_robin',
    label: 'Round Robin (single stage)',
    stages: [
      { name: 'Round Robin', type: 'group' },
    ],
  },
];

export const STAGE_PRESET_MAP = Object.fromEntries(
  STAGE_PRESETS.map((p) => [p.id, p]),
) as Record<string, StagePreset>;

// ── Point system defaults ────────────────────────────────────────

export type PointSystemPreset = {
  id: string;
  name: string;
  kill_points: number;
  placement_points: Record<string, number>;
};

/** PUBG Mobile Global Championship standard */
export const PMGC_POINTS: PointSystemPreset = {
  id: 'pmgc',
  name: 'PMGC Standard',
  kill_points: 1,
  placement_points: {
    '1': 10, '2': 6, '3': 5, '4': 4, '5': 3,
    '6': 2, '7': 1, '8': 1, '9': 0, '10': 0,
    '11': 0, '12': 0, '13': 0, '14': 0, '15': 0, '16': 0,
  },
};

export const PMSL_POINTS: PointSystemPreset = {
  id: 'pmsl',
  name: 'PMSL Standard',
  kill_points: 1,
  placement_points: {
    '1': 15, '2': 12, '3': 10, '4': 8, '5': 6,
    '6': 4, '7': 2, '8': 1, '9': 0, '10': 0,
    '11': 0, '12': 0, '13': 0, '14': 0, '15': 0, '16': 0,
  },
};

export const POINT_SYSTEM_PRESETS: PointSystemPreset[] = [PMGC_POINTS, PMSL_POINTS];

export const MAX_TEAMS_PER_MATCH = 22;

/** Maximum players per team */
export const MAX_PLAYERS_PER_TEAM = 6;

// ── Default slot colors (22 distinct, visually separated) ────────
// These are the default colors assigned per lobby slot.
// The manager can override per-slot via the match page.

export const SLOT_COLORS: string[] = [
  '#ff4e4e', // 01 — red
  '#3b82f6', // 02 — blue
  '#22c55e', // 03 — green
  '#f59e0b', // 04 — amber
  '#8b5cf6', // 05 — violet
  '#06b6d4', // 06 — cyan
  '#ec4899', // 07 — pink
  '#f97316', // 08 — orange
  '#14b8a6', // 09 — teal
  '#a855f7', // 10 — purple
  '#eab308', // 11 — yellow
  '#ef4444', // 12 — rose
  '#0ea5e9', // 13 — sky
  '#84cc16', // 14 — lime
  '#d946ef', // 15 — fuchsia
  '#fb923c', // 16 — light-orange
  '#2dd4bf', // 17 — aqua
  '#818cf8', // 18 — indigo
  '#fbbf24', // 19 — gold
  '#f43f5e', // 20 — crimson
  '#38bdf8', // 21 — light-blue
  '#a3e635', // 22 — chartreuse
];

/** Get default color for a slot number (1-based). */
export function getSlotColor(slotNumber: number): string {
  return SLOT_COLORS[(slotNumber - 1) % SLOT_COLORS.length] ?? '#ffffff';
}

// ── Registration modes ───────────────────────────────────────────

export const REGISTRATION_MODES = [
  { id: 'open', label: 'Open', desc: 'Anyone can register, no cap' },
  { id: 'cap', label: 'Capped', desc: 'First N teams auto-accepted' },
  { id: 'pick_first', label: 'Manual Pick', desc: 'Admin reviews and accepts' },
] as const;

// ── Stage types ──────────────────────────────────────────────────

export const STAGE_TYPES = [
  { id: 'group', label: 'Group Stage', desc: 'Teams split into groups' },
  { id: 'elimination', label: 'Elimination', desc: 'Single/double elimination bracket' },
  { id: 'finals', label: 'Finals', desc: 'All teams play every match' },
] as const;
