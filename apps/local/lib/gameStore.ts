import type { RosterMapping } from './rosterStore';
import type {
  PlayerState, TeamState, KillEvent, GamePhase,
  CircleInfo, MatchTimestamps, PostMatchWeaponDetail,
} from '@shared/types';

// Re-export shared types so existing imports from '@/lib/gameStore' still work
export type { PlayerState, TeamState, KillEvent, GamePhase, CircleInfo, MatchTimestamps, PostMatchWeaponDetail };

// ─── Local-only types ────────────────────────────────────────────────────────

export interface GameState {
  gameId: string;
  players: Map<string, PlayerState>;
  uidToOpenId: Map<string, string>;
  openIdToUid: Map<string, string>;
  teams: Map<number, TeamState>;
  kills: KillEvent[];
  observingUid: string | null;
  phase: GamePhase;
  circle: CircleInfo | null;
  timestamps: MatchTimestamps;
  postMatchWeapons: PostMatchWeaponDetail[];
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
    openIdToUid: new Map(),
    teams: new Map(),
    kills: [],
    observingUid: null,
    phase: 'lobby',
    circle: null,
    timestamps: { gameStartTime: 0, fightingStartTime: 0, finishedStartTime: 0 },
    postMatchWeapons: [],
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

/** Reset state for next match. Called by lifecycle "Ready for Next Match" action. */
export function resetForNextMatch(): void {
  state = createEmpty('');
  notify('state', snapshot());
}

// ─── Handlers ──────────────────────────────────────────────────────────────────

export function handleTotalMessage(payload: {
  GameID: string;
  TotalPlayerList: Array<{
    uId: number; playerName: string; playerOpenId: string;
    teamId: number; teamName: string; health: number; healthMax: number;
    liveState: number; killNum: number; killNumBeforeDie: number;
    damage: number; inDamage: number; heal: number; headShotNum: number;
    assists: number; knockouts: number; rescueTimes: number;
    survivalTime: number; marchDistance: number; driveDistance: number;
    rank: number; bHasDied: boolean;
  }>;
  TeamInfoList: Array<{
    teamId: number; teamName: string; killNum: number; liveMemberNum: number;
  }>;
  GameStartTime: string;
  FightingStartTime: string;
  FinishedStartTime: string;
}): void {
  if (payload.GameID !== state.gameId) {
    state = createEmpty(payload.GameID);
  }

  // Update timestamps
  const gst = parseInt(payload.GameStartTime, 10) || 0;
  const fst = parseInt(payload.FightingStartTime, 10) || 0;
  const fnst = parseInt(payload.FinishedStartTime, 10) || 0;
  if (gst) state.timestamps.gameStartTime = gst;
  if (fst) state.timestamps.fightingStartTime = fst;
  if (fnst) state.timestamps.finishedStartTime = fnst;

  for (const p of payload.TotalPlayerList) {
    const uid = String(p.uId);
    const openId = p.playerOpenId || '';

    // Track uid↔openId mapping (only when openId is non-empty)
    if (openId) {
      state.uidToOpenId.set(uid, openId);
      state.openIdToUid.set(openId, uid);
    }

    // Use openId as key if available, otherwise fall back to uid.
    // This handles the first totalmessage where playerOpenId is empty.
    const key = openId || uid;

    // If we previously stored this player under uid (because openId was empty),
    // migrate to openId key now that we have it.
    if (openId && state.players.has(uid) && !state.players.has(openId)) {
      const old = state.players.get(uid)!;
      state.players.delete(uid);
      old.openId = openId;
      state.players.set(openId, old);
    }

    const rp = openId ? rosterRef?.player_index[openId] : undefined;

    state.players.set(key, {
      openId: openId || uid,
      uId: uid,
      playerName: p.playerName,
      teamSlot: p.teamId,
      teamName: p.teamName,
      health: p.health,
      healthMax: p.healthMax,
      liveState: p.liveState,
      killNum: p.killNum,
      killNumBeforeDie: p.killNumBeforeDie ?? 0,
      damage: p.damage,
      inDamage: p.inDamage ?? 0,
      heal: p.heal ?? 0,
      headShotNum: p.headShotNum ?? 0,
      assists: p.assists ?? 0,
      knockouts: p.knockouts ?? 0,
      rescueTimes: p.rescueTimes ?? 0,
      survivalTime: p.survivalTime ?? 0,
      marchDistance: p.marchDistance ?? 0,
      driveDistance: p.driveDistance ?? 0,
      rank: p.rank ?? 0,
      bHasDied: p.bHasDied,
      displayName: rp?.display_name,
      registeredTeamId: rp?.team_id,
    });
  }

  for (const t of payload.TeamInfoList) {
    const rt = rosterRef?.teams.find(r => r.slot_number === t.teamId) ?? null;
    state.teams.set(t.teamId, {
      slot: t.teamId,
      inGameName: t.teamName,
      killNum: t.killNum,
      liveMemberNum: t.liveMemberNum,
      rank: 0, // will be computed below
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
  ItemID?: string;
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
    weaponId: payload.ItemID,
    gameTime: payload.CurGameTime,
    distance: payload.Distance,
    timestamp: Date.now(),
  };

  state.kills.push(ev);
  if (state.kills.length > 20) state.kills = state.kills.slice(-20);
  notify('killfeed', ev);
}

export function handleObservingPlayer(uid: string): void {
  if (uid === state.observingUid) return; // Dedup: skip if already observing same player
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

export function handleCircleInfo(payload: {
  GameTime: string; CircleStatus: string; CircleIndex: string;
  Counter: string; MaxTime: string;
}): void {
  const gameTime = parseInt(payload.GameTime, 10) || 0;
  // Reject out-of-order circle updates
  if (state.circle && gameTime < state.circle.gameTime) return;
  state.circle = {
    gameTime,
    circleStatus: parseInt(payload.CircleStatus, 10) || 0,
    circleIndex: parseInt(payload.CircleIndex, 10) || 0,
    counter: parseInt(payload.Counter, 10) || 0,
    maxTime: parseInt(payload.MaxTime, 10) || 0,
  };
  notify('state', snapshot());
}

export function handlePostMatchWeapons(playerId: string, weapons: PostMatchWeaponDetail['weapons']): void {
  state.postMatchWeapons.push({ playerId, weapons });
  if (state.postMatchWeapons.length > 100) state.postMatchWeapons = state.postMatchWeapons.slice(-100);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function computeRanks(): void {
  // Use the game-provided rank from player data when available.
  const gameRankByTeam = new Map<number, number>();
  for (const p of state.players.values()) {
    if (p.rank > 0) {
      const current = gameRankByTeam.get(p.teamSlot) ?? 0;
      if (current === 0 || p.rank < current) {
        gameRankByTeam.set(p.teamSlot, p.rank);
      }
    }
  }

  // Apply game ranks to eliminated teams
  for (const [slot, rank] of gameRankByTeam) {
    const t = state.teams.get(slot);
    if (t) t.rank = rank;
  }

  // For alive teams (no game rank yet), compute live ranking
  const aliveTeams = Array.from(state.teams.values()).filter(t => gameRankByTeam.get(t.slot) == null);
  aliveTeams.sort((a, b) =>
    b.liveMemberNum !== a.liveMemberNum
      ? b.liveMemberNum - a.liveMemberNum
      : b.killNum !== a.killNum
        ? b.killNum - a.killNum
        : a.slot - b.slot // Stable tiebreaker by slot number
  );
  aliveTeams.forEach((t, i) => {
    const s = state.teams.get(t.slot);
    if (s) s.rank = i + 1;
  });
}

export interface GameSnapshot {
  gameId: string;
  phase: GamePhase;
  teams: TeamState[];
  players: PlayerState[];
  kills: KillEvent[];
  observingUid: string | null;
  circle: CircleInfo | null;
  timestamps: MatchTimestamps;
}

export function snapshot(): GameSnapshot {
  return {
    gameId: state.gameId,
    phase: state.phase,
    teams: Array.from(state.teams.values()),
    players: Array.from(state.players.values()),
    kills: state.kills.slice(-8),
    observingUid: state.observingUid,
    circle: state.circle,
    timestamps: state.timestamps,
  };
}

export function hydrateFromSnapshot(snap: GameSnapshot): void {
  state.gameId = snap.gameId;
  state.phase = snap.phase;
  state.observingUid = snap.observingUid;
  state.circle = snap.circle ?? null;
  if (snap.timestamps) state.timestamps = snap.timestamps;

  state.teams.clear();
  for (const t of snap.teams) {
    state.teams.set(t.slot, t);
  }

  state.players.clear();
  state.uidToOpenId.clear();
  state.openIdToUid.clear();
  for (const p of snap.players) {
    state.players.set(p.openId, p);
    state.uidToOpenId.set(p.uId, p.openId);
    state.openIdToUid.set(p.openId, p.uId);
  }

  state.kills = snap.kills;
  notify('state', snapshot());
}

export function ingestRemoteKill(ev: KillEvent): void {
  if (state.kills.some(k => k.id === ev.id)) return;
  state.kills.push(ev);
  if (state.kills.length > 20) state.kills = state.kills.slice(-20);
  notify('killfeed', ev);
}

export function ingestRemotePlayercard(data: { uid: string; openId: string; player: PlayerState | undefined; team: TeamState | undefined }): void {
  state.observingUid = data.uid;
  notify('playercard', data);
}
