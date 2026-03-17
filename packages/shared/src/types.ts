// ─── API Response Envelope ────────────────────────────────────────────────────

export type ApiOk<T> = { ok: true; data: T; ts: number };
export type ApiErr = { ok: false; error: string; ts: number };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

// ─── Game Client Payload Types ────────────────────────────────────────────────

export interface GamePlayer {
  uId: number;
  playerName: string;
  playerOpenId: string;
  teamId: number; // lobby slot number (1-25)
  teamName: string;
  health: number;
  healthMax: number;
  liveState: number; // 0 = alive, 5 = dead
  killNum: number;
  killNumBeforeDie: number;
  isFiring: boolean;
  rank: number;
  damage: number;
  inDamage: number;
  heal: number;
  headShotNum: number;
  assists: number;
  knockouts: number;
  rescueTimes: number;
  survivalTime: number;
  marchDistance: number;
  driveDistance: number;
  AIKillNum: number;
  bHasDied: boolean;
}

export interface GameTeamInfo {
  teamId: number;
  teamName: string;
  killNum: number;
  liveMemberNum: number;
}

export interface TotalMessagePayload {
  TotalPlayerList: GamePlayer[];
  TeamInfoList: GameTeamInfo[];
  GameID: string;
  GameStartTime: string;
  FightingStartTime: string;
  FinishedStartTime: string;
  CurrentTime: string;
}

export interface KillInfoPayload {
  CauserName: string;
  VictimName: string;
  CauserUID: string;
  VictimUID: string;
  ItemID: string;
  ResultHealthStatus: string;
  CurGameTime: string;
  Distance: number;
}

export interface ObservingPlayerPayload {
  '0': string; // uId as string
  GunADS: string; // 'true' | 'false'
}

export interface TeamBackpackItem {
  MainWeapon1ID: number;
  MainWeapon1AmmoNuminClip: number;
  MainWeapon2ID: number;
  MainWeapon2AmmoNuminClip: number;
  PlayerKey: number;
  TeamID: number;
}

export interface TeamBackpackPayload {
  TeamBackPackList: TeamBackpackItem[];
}

export interface CircleInfoPayload {
  GameTime: string;
  CircleStatus: string;
  CircleIndex: string;
  Counter: string;
  MaxTime: string;
}

export interface TdmResultPayload {
  Team1: { TeamID: number; [key: string]: unknown };
  Team2: { TeamID: number; [key: string]: unknown };
}

// ─── Game Store State (runtime) ──────────────────────────────────────────────

export interface PlayerState {
  openId: string;
  uId: string;
  playerName: string;
  teamSlot: number; // teamId from game = lobby slot
  teamName: string; // in-game team name
  health: number;
  healthMax: number;
  liveState: number;
  killNum: number;
  killNumBeforeDie: number;
  damage: number;
  inDamage: number;
  heal: number;
  headShotNum: number;
  assists: number;
  knockouts: number;
  rescueTimes: number;
  survivalTime: number;
  marchDistance: number;
  driveDistance: number;
  rank: number; // game-provided placement (0 = not placed yet)
  bHasDied: boolean;
  // enriched from roster
  displayName?: string;
  registeredTeamId?: string;
}

export interface TeamState {
  slot: number;
  inGameName: string;
  killNum: number;
  liveMemberNum: number;
  rank: number;
  // enriched from roster
  registeredTeamId?: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  logoPath64?: string;
}

export interface KillEvent {
  id: string;
  causerName: string;
  victimName: string;
  causerTeamSlot: number;
  victimTeamSlot: number;
  causerTeamColor?: string;
  victimTeamColor?: string;
  weaponId?: string;
  weaponName?: string;
  gameTime: string;
  distance: number;
  timestamp: number;
}

export interface WeaponState {
  weapon1Id: number;
  weapon1Ammo: number;
  weapon2Id: number;
  weapon2Ammo: number;
}

export type GamePhase = 'lobby' | 'ingame' | 'finished';

// ─── Circle / Zone ───────────────────────────────────────────────────────────

export interface CircleInfo {
  gameTime: number;
  circleStatus: number; // 0=waiting, 1=shrinking, 2=paused, 3=pre-game
  circleIndex: number;
  counter: number;
  maxTime: number;
}

// ─── Match Timestamps ────────────────────────────────────────────────────────

export interface MatchTimestamps {
  gameStartTime: number;
  fightingStartTime: number;
  finishedStartTime: number;
}

// ─── Post-Match Data ─────────────────────────────────────────────────────────

export interface PostMatchWeaponDetail {
  playerId: string;
  weapons: Array<{
    avatarId: number;
    totalDamage: number;
    killCount: number;
    headShootCount: number;
    bodyShootCount: number;
    limbsShootCount: number;
    uniqueHitCount: number;
    totalUseTime: number;
  }>;
}

// ─── Roster Mapping Types ────────────────────────────────────────────────────

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
  show_player_cards?: boolean;
  kill_feed_position?: string;
  logo_position?: string;
}

export interface RosterOrg {
  id: string;
  name: string;
  brand_color: string;
  logo_path?: string;
  theme?: OverlayTheme;
}

export interface PlayerIndex {
  team_id: string;
  display_name: string;
  slot_number: number;
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
  org: RosterOrg;
  teams: RosterTeam[];
  player_index: Record<string, PlayerIndex>;
}

// ─── Leaderboard API Types ───────────────────────────────────────────────────

export interface LeaderboardTeam {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  kills: number;
  placement?: number;
  alive: boolean;
  liveMemberNum: number;
  placementPoints: number;
  totalPoints: number;
  updatedAt: number;
}

export interface LeaderboardPlayer {
  playerName: string;
  displayName?: string;
  teamName: string;
  kills: number;
  damage: number;
  headshots: number;
  assists: number;
  knockouts: number;
  survived: boolean;
}

export interface LeaderboardResponse {
  matchId: string;
  serverTime: number;
  phase: GamePhase;
  spotlight?: {
    playerName: string;
    displayName?: string;
    teamName: string;
    kills: number;
  };
  teams: LeaderboardTeam[];
  players?: LeaderboardPlayer[];
}

// ─── Unified Live State (dashboard endpoint) ─────────────────────────────────

export interface LiveState {
  matchId: string;
  phase: GamePhase;
  serverTime: number;
  timestamps: MatchTimestamps;
  circle: CircleInfo | null;
  teams: LeaderboardTeam[];
  players: LeaderboardPlayer[];
  kills: KillEvent[];
  observing: {
    uid: string;
    player: PlayerState | null;
    team: TeamState | null;
  } | null;
  spotlight: {
    playerName: string;
    displayName?: string;
    teamName: string;
    kills: number;
  } | null;
}

// ─── SSE Event Types ─────────────────────────────────────────────────────────

export type SSEEventType = 'state' | 'kill' | 'playercard' | 'circle' | 'phase';

export interface SSEEvent<T = unknown> {
  event: SSEEventType;
  data: T;
  ts: number;
}
