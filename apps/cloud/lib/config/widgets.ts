
export type WidgetDef = {
  key: string;
  label: string;
  hotkey: string;
  group: 'live' | 'post' | 'static';
  description: string;
};

export const WIDGETS: WidgetDef[] = [
  { key: 'leaderboard',  label: 'Match Ranking',     hotkey: 'F1',  group: 'live',   description: 'Live leaderboard with teams, player status, points and eliminations' },
  { key: 'killfeed',     label: 'Kill Feed',         hotkey: 'F2',  group: 'live',   description: 'Real-time kill notifications with fade-out' },
  { key: 'playercard',   label: 'Player Card',       hotkey: 'F3',  group: 'live',   description: 'Currently observed player stats overlay' },
  { key: 'elimination',  label: 'Elimination Alert', hotkey: 'F4',  group: 'live',   description: 'Popup when a team is fully eliminated' },
  { key: 'wwcd',         label: 'WWCD',              hotkey: 'F5',  group: 'post',   description: 'Winner chicken dinner screen with team stats' },
  { key: 'fraggers',     label: 'Top Fraggers',      hotkey: 'F6',  group: 'post',   description: 'Top 5 players by eliminations with MVP badge' },
  { key: 'results',      label: 'After Match Score', hotkey: 'F7',  group: 'post',   description: 'Two-column match results table ranked by points' },
  { key: 'mvp',          label: 'MVP',               hotkey: 'F8',  group: 'post',   description: 'Match MVP with detailed player statistics' },
  { key: 'pointtable',   label: 'Point Table',       hotkey: 'F9',  group: 'static', description: 'PUBG Mobile point system display' },
  { key: 'teamlist',     label: 'Team List',         hotkey: 'F10', group: 'static', description: 'Grid of all teams with logos' },
  { key: 'matchinfo',    label: 'Match Info',        hotkey: 'F11', group: 'static', description: 'Match start notification with stage, game, map' },
  { key: 'schedule',     label: 'Schedule',          hotkey: 'F12', group: 'static', description: 'Bottom bar with match schedule and status' },
];

export const WIDGET_GROUPS = [
  { id: 'live',   label: 'Live Widgets',       color: '#ff4e4e', desc: 'Active during gameplay' },
  { id: 'post',   label: 'Post-Match',         color: '#00ffc3', desc: 'Show after match ends' },
  { id: 'static', label: 'Static / Pre-Match', color: '#2F6B3F', desc: 'Info overlays' },
] as const;

/** Quick lookup: key → WidgetDef */
export const WIDGET_BY_KEY = Object.fromEntries(
  WIDGETS.map((w) => [w.key, w]),
) as Record<string, WidgetDef>;

/** All widget keys */
export const WIDGET_KEYS = WIDGETS.map((w) => w.key);
