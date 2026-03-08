import type { RosterMapping } from './rosterStore';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerState {
  openId: string;
  uId: string;
  playerName: string;
  teamSlot: number;
  teamName: string;
  health: number;
  healthMax: number;
  liveState: number; // 0=alive, 5=dead
  killNum: number;
  damage: number;
  bHasDied: boolean;
  displayName?: string;
  registeredTeamId?: string;
}

export interface TeamState {
  slot: number;
  inGameName: string;
  killNum: number;
  liveMemberNum: number;
  rank: number;
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
  gameTime: string;
  distance: number;
  timestamp: number;
}

export type GamePhase = 'lobby' | 'ingame' | 'finished';

export interface GameState {
  gameId: string;
  players: Map<string, PlayerState>;
  uidToOpenId: Map<string, string>;
  teams: Map<number, TeamState>;
  kills: KillEvent[];
  observingUid: string | null;
  phase: GamePhase;
}

type Subscriber = (data: unknown) => void;
export type Channel = 'state' | 'killfeed' | 'playercard';

// ─── Module State ──────────────────────────────────────────────────────────────

let state: GameState = createEmpty('');
let rosterRef: RosterMapping | null = null;

const subs: Record<Channel, Set<Subscriber>> = {
  state: new Set(),
  killfeed: new Set(),
  playercard: new Set(),
};

function createEmpty(gameId: string): GameState {
  return {
    gameId,
    players: new Map(),
    uidToOpenId: new Map(),
    teams: new Map(),
    kills: [],
    observingUid: null,
    phase: 'lobby',
  };
}

function notify(ch: Channel, data: unknown) {
  for (const fn of subs[ch]) { try { fn(data); } catch { /* ignore */ } }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

export function setRoster(roster: RosterMapping | null) {
  rosterRef = roster;
}

export function subscribe(ch: Channel, fn: Subscriber): () => void {
  subs[ch].add(fn);
  return () => subs[ch].delete(fn);
}

export function getState(): GameState { return state; }
export function getPhase(): GamePhase { return state.phase; }

// ─── Handlers ──────────────────────────────────────────────────────────────────

export function handleTotalMessage(payload: {
  GameID: string;
  TotalPlayerList: Array<{
    uId: number; playerName: string; playerOpenId: string;
    teamId: number; teamName: string; health: number; healthMax: number;
    liveState: number; killNum: number; damage: number; bHasDied: boolean;
  }>;
  TeamInfoList: Array<{
    teamId: number; teamName: string; killNum: number; liveMemberNum: number;
  }>;
  FightingStartTime: string;
}): void {
  if (payload.GameID !== state.gameId) {
    state = createEmpty(payload.GameID);
  }

  for (const p of payload.TotalPlayerList) {
    const uid = String(p.uId);
    state.uidToOpenId.set(uid, p.playerOpenId);

    const rp = rosterRef?.player_index[p.playerOpenId];
    const rt = rp ? rosterRef?.teams.find(t => t.team_id === rp.team_id) : null;

    state.players.set(p.playerOpenId, {
      openId: p.playerOpenId,
      uId: uid,
      playerName: p.playerName,
      teamSlot: p.teamId,
      teamName: p.teamName,
      health: p.health,
      healthMax: p.healthMax,
      liveState: p.liveState,
      killNum: p.killNum,
      damage: p.damage,
      bHasDied: p.bHasDied,
      displayName: rp?.display_name,
      registeredTeamId: rp?.team_id,
    });
  }

  for (const t of payload.TeamInfoList) {
    const rt = rosterRef?.teams.find(r => r.slot_number === t.teamId) ?? null;
    const existing = state.teams.get(t.teamId);
    state.teams.set(t.teamId, {
      slot: t.teamId,
      inGameName: t.teamName,
      killNum: t.killNum,
      liveMemberNum: t.liveMemberNum,
      rank: existing?.rank ?? 99,
      registeredTeamId: rt?.team_id,
      displayName: rt?.name,
      shortName: rt?.short_name,
      brandColor: rt?.brand_color,
      logoPath: rt?.logo_path,
      logoPath64: rt?.logo_path_64,
    });
  }

  computeRanks();

  if (state.phase === 'lobby' && payload.FightingStartTime !== '0') {
    state.phase = 'ingame';
  }

  notify('state', snapshot());
}

export function handleKillInfo(payload: {
  CauserName: string; VictimName: string;
  CauserUID: string; VictimUID: string;
  CurGameTime: string; Distance: number;
}): void {
  const causerOpenId = state.uidToOpenId.get(payload.CauserUID) ?? payload.CauserUID;
  const victimOpenId = state.uidToOpenId.get(payload.VictimUID) ?? payload.VictimUID;
  const causerPlayer = state.players.get(causerOpenId);
  const victimPlayer = state.players.get(victimOpenId);

  const ev: KillEvent = {
    id: `${Date.now()}-${Math.random()}`,
    causerName: causerPlayer?.displayName ?? payload.CauserName,
    victimName: victimPlayer?.displayName ?? payload.VictimName,
    causerTeamSlot: causerPlayer?.teamSlot ?? 0,
    victimTeamSlot: victimPlayer?.teamSlot ?? 0,
    causerTeamColor: causerPlayer ? state.teams.get(causerPlayer.teamSlot)?.brandColor : undefined,
    victimTeamColor: victimPlayer ? state.teams.get(victimPlayer.teamSlot)?.brandColor : undefined,
    gameTime: payload.CurGameTime,
    distance: payload.Distance,
    timestamp: Date.now(),
  };

  state.kills.push(ev);
  if (state.kills.length > 20) state.kills = state.kills.slice(-20);
  notify('killfeed', ev);
}

export function handleObservingPlayer(uid: string): void {
  state.observingUid = uid;
  const openId = state.uidToOpenId.get(uid) ?? uid;
  const player = state.players.get(openId);
  const team = player ? state.teams.get(player.teamSlot) : undefined;
  notify('playercard', { uid, openId, player, team });
}

export function handleMatchPhase(phase: 'InGame' | 'Finished'): void {
  state.phase = phase === 'Finished' ? 'finished' : 'ingame';
  notify('state', snapshot());
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function computeRanks(): void {
  const sorted = Array.from(state.teams.values()).sort((a, b) =>
    b.liveMemberNum !== a.liveMemberNum
      ? b.liveMemberNum - a.liveMemberNum
      : b.killNum - a.killNum
  );
  sorted.forEach((t, i) => {
    const s = state.teams.get(t.slot);
    if (s) s.rank = i + 1;
  });
}

export function snapshot() {
  return {
    gameId: state.gameId,
    phase: state.phase,
    teams: Array.from(state.teams.values()),
    players: Array.from(state.players.values()),
    kills: state.kills.slice(-8),
    observingUid: state.observingUid,
  };
}
