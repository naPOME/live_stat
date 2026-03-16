// ─── Widget Visibility Store ──────────────────────────────────────────────────
// Controls which overlay widgets are visible during broadcast.
// Observer toggles from /controller page; overlays poll /api/widgets for state.

type WidgetKey =
  | 'leaderboard' | 'killfeed' | 'playercard' | 'elimination'
  | 'wwcd' | 'fraggers' | 'results' | 'pointtable'
  | 'teamlist' | 'matchinfo' | 'mvp' | 'schedule';

export const ALL_WIDGETS: { key: WidgetKey; label: string; hotkey: string; group: 'live' | 'post' | 'static' }[] = [
  { key: 'leaderboard',  label: 'Match Ranking',     hotkey: 'F1', group: 'live' },
  { key: 'killfeed',     label: 'Kill Feed',         hotkey: 'F2', group: 'live' },
  { key: 'playercard',   label: 'Player Card',       hotkey: 'F3', group: 'live' },
  { key: 'elimination',  label: 'Elimination Alert', hotkey: 'F4', group: 'live' },
  { key: 'wwcd',         label: 'WWCD',              hotkey: 'F5', group: 'post' },
  { key: 'fraggers',     label: 'Top Fraggers',      hotkey: 'F6', group: 'post' },
  { key: 'results',      label: 'After Match Score', hotkey: 'F7', group: 'post' },
  { key: 'mvp',          label: 'MVP',               hotkey: 'F8', group: 'post' },
  { key: 'pointtable',   label: 'Point Table',       hotkey: 'F9', group: 'static' },
  { key: 'teamlist',     label: 'Team List',         hotkey: 'F10', group: 'static' },
  { key: 'matchinfo',    label: 'Match Info',        hotkey: 'F11', group: 'static' },
  { key: 'schedule',     label: 'Schedule',          hotkey: 'F12', group: 'static' },
];

// State: all widgets start hidden except killfeed + playercard
const visibility: Record<WidgetKey, boolean> = {
  leaderboard: false,
  killfeed: true,
  playercard: true,
  elimination: true,
  wwcd: false,
  fraggers: false,
  results: false,
  pointtable: false,
  teamlist: false,
  matchinfo: false,
  mvp: false,
  schedule: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function getVisibility(): Record<string, boolean> {
  return { ...visibility };
}

export function isVisible(key: string): boolean {
  return visibility[key as WidgetKey] ?? false;
}

export function setVisible(key: string, visible: boolean): void {
  if (key in visibility) {
    visibility[key as WidgetKey] = visible;
    notify();
  }
}

export function toggle(key: string): boolean {
  if (key in visibility) {
    visibility[key as WidgetKey] = !visibility[key as WidgetKey];
    notify();
    return visibility[key as WidgetKey];
  }
  return false;
}

export function showOnly(key: string): void {
  for (const k of Object.keys(visibility)) {
    visibility[k as WidgetKey] = k === key;
  }
  // Always keep killfeed + playercard + elimination active
  visibility.killfeed = true;
  visibility.playercard = true;
  visibility.elimination = true;
  notify();
}

export function hideAll(): void {
  for (const k of Object.keys(visibility)) {
    visibility[k as WidgetKey] = false;
  }
  // Keep always-on widgets
  visibility.killfeed = true;
  visibility.playercard = true;
  visibility.elimination = true;
  notify();
}

export function subscribeWidgets(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Hydrate widget visibility from a remote state (used by sync).
 * Does NOT notify the sync hook to prevent echo loops.
 */
export function hydrateWidgets(state: Record<string, boolean>): void {
  for (const k of Object.keys(visibility)) {
    if (k in state) {
      visibility[k as WidgetKey] = state[k];
    }
  }
  notify();
}

// Sync hook — called on every local widget change so realtimeSync can broadcast
let syncHook: ((state: Record<string, boolean>) => void) | null = null;

export function setSyncHook(fn: ((state: Record<string, boolean>) => void) | null): void {
  syncHook = fn;
}

function notify() {
  for (const fn of listeners) { try { fn(); } catch { /* */ } }
  if (syncHook) { try { syncHook(getVisibility()); } catch { /* */ } }
}
