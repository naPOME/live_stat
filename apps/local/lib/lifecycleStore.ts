import { subscribe as gameSubscribe, type GameSnapshot } from './gameStore';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type LifecyclePhase = 'idle' | 'ready' | 'warmup' | 'live' | 'finished' | 'synced';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
  dismissed: boolean;
}

export interface LifecycleState {
  phase: LifecyclePhase;
  rosterLoaded: boolean;
  gameClientConnected: boolean;
  lastTelemetryAt: number | null;
  syncResult: 'pending' | 'success' | 'failed' | null;
  syncError: string | null;
  notifications: Notification[];
  matchNumber: number;
  matchId: string | null;
  /** True while collecting late post-match data (30s window after Finished) */
  postMatchCollecting: boolean;
  /** Timestamp when post-match collection window ends */
  postMatchDeadline: number | null;
}

type Subscriber = (state: LifecycleState) => void;

// ─── Module State ───────────────────────────────────────────────────────────────

let state: LifecycleState = {
  phase: 'idle',
  rosterLoaded: false,
  gameClientConnected: false,
  lastTelemetryAt: null,
  syncResult: null,
  syncError: null,
  notifications: [],
  matchNumber: 1,
  matchId: null,
  postMatchCollecting: false,
  postMatchDeadline: null,
};

const subs = new Set<Subscriber>();
let previousTeamAlive = new Map<number, number>();
let initialized = false;
let notifCounter = 0;

function notify() {
  const snap = getLifecycleState();
  for (const fn of subs) {
    try { fn(snap); } catch { /* ignore */ }
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

export function getLifecycleState(): LifecycleState {
  return { ...state, notifications: [...state.notifications] };
}

export function subscribeLifecycle(fn: Subscriber): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

/**
 * Called by every telemetry route handler to record that the game client is alive.
 */
export function recordTelemetry(): void {
  const wasConnected = state.gameClientConnected;
  state.gameClientConnected = true;
  state.lastTelemetryAt = Date.now();

  if (!wasConnected) {
    addNotification('info', 'Game client connected');
    // If roster loaded but we were in ready, move to warmup
    if (state.phase === 'ready') {
      state.phase = 'warmup';
      notify();
      return;
    }
  }
  // Don't notify on every telemetry — too noisy
}

/**
 * Called when roster is loaded/reloaded.
 */
export function onRosterLoaded(): void {
  state.rosterLoaded = true;
  if (state.phase === 'idle') {
    state.phase = 'ready';
    addNotification('success', 'Roster loaded');
    notify();
  }
}

/**
 * Called when roster is cleared or fails to load.
 */
export function onRosterCleared(): void {
  state.rosterLoaded = false;
  if (state.phase === 'ready' || state.phase === 'warmup') {
    state.phase = 'idle';
    notify();
  }
}

/**
 * Transition to live phase (fighting started).
 */
export function goLive(): void {
  if (state.phase === 'warmup' || state.phase === 'ready') {
    state.phase = 'live';
    addNotification('info', 'Match started — fighting phase');
    notify();
  }
}

/** Callback set by setisingame route to trigger cloud sync after collection window */
let onPostMatchReady: (() => void) | null = null;

/**
 * Register a callback that fires when the 30s post-match collection window ends.
 * The setisingame route uses this to trigger cloud sync at the right time.
 */
export function setPostMatchCallback(cb: () => void): void {
  onPostMatchReady = cb;
}

/** Post-match collection window duration (ms). PCOB guideline: host must stay 30s. */
const POST_MATCH_WINDOW_MS = 30_000;

/**
 * Transition to finished phase.
 * Opens a 30s collection window for late post-match data (final totalmessage,
 * weapon details, etc.) before triggering cloud sync.
 */
export function goFinished(): void {
  if (state.phase === 'finished') return; // Guard: already finished, don't fire twice
  if (state.phase === 'live' || state.phase === 'warmup') {
    state.phase = 'finished';
    state.syncResult = null;
    state.syncError = null;
    state.postMatchCollecting = true;
    state.postMatchDeadline = Date.now() + POST_MATCH_WINDOW_MS;
    addNotification('info', 'Match finished — collecting post-match data (30s)');
    notify();

    // After 30s, end collection and trigger sync
    setTimeout(() => {
      state.postMatchCollecting = false;
      state.postMatchDeadline = null;
      addNotification('info', 'Post-match data collection complete');
      notify();
      if (onPostMatchReady) {
        onPostMatchReady();
        onPostMatchReady = null;
      }
    }, POST_MATCH_WINDOW_MS);
  }
}

/**
 * Mark cloud sync as pending (about to start).
 */
export function syncPending(): void {
  state.syncResult = 'pending';
  notify();
}

/**
 * Mark cloud sync result.
 */
export function syncDone(ok: boolean, error?: string): void {
  state.syncResult = ok ? 'success' : 'failed';
  state.syncError = error ?? null;
  if (ok) {
    state.phase = 'synced';
    addNotification('success', 'Results synced to cloud');
  } else {
    addNotification('error', `Cloud sync failed: ${error || 'Unknown error'}`);
  }
  notify();
}

/**
 * Reset for next match — clears game state, goes back to ready/idle.
 */
export function resetForNextMatch(): void {
  // Keep rosterLoaded as-is — rosterStore manages that via onRosterLoaded/onRosterCleared
  state.phase = state.rosterLoaded ? 'ready' : 'idle';
  state.gameClientConnected = false;
  state.lastTelemetryAt = null;
  state.syncResult = null;
  state.syncError = null;
  state.postMatchCollecting = false;
  state.postMatchDeadline = null;
  state.matchNumber += 1;
  state.matchId = null;
  state.notifications = [];
  previousTeamAlive.clear();
  onPostMatchReady = null;
  addNotification('info', `Ready for match #${state.matchNumber}`);
  notify();
}

/**
 * Add a notification.
 */
export function addNotification(type: Notification['type'], message: string): void {
  state.notifications.push({
    id: `${Date.now()}-${++notifCounter}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
    timestamp: Date.now(),
    dismissed: false,
  });
  // Keep max 20
  if (state.notifications.length > 20) {
    state.notifications = state.notifications.slice(-20);
  }
  notify();
}

/**
 * Dismiss a notification.
 */
export function dismissNotification(id: string): void {
  const n = state.notifications.find(n => n.id === id);
  if (n) {
    n.dismissed = true;
    notify();
  }
}

// ─── Game State Observer ────────────────────────────────────────────────────────

function onGameStateChange(snapshot: unknown): void {
  const snap = snapshot as GameSnapshot;
  if (!snap) return;

  // Track match ID
  if (snap.gameId && snap.gameId !== state.matchId) {
    // New match detected
    if (state.matchId && (state.phase === 'finished' || state.phase === 'synced')) {
      // Auto-reset for new match
      state.matchNumber += 1;
      state.syncResult = null;
      state.syncError = null;
      state.notifications = [];
      previousTeamAlive.clear();
    }
    state.matchId = snap.gameId;
  }

  // Phase transitions based on game data
  if (snap.phase === 'ingame' && snap.timestamps.fightingStartTime > 0 && state.phase === 'warmup') {
    goLive();
  }

  if (snap.phase === 'ingame' && (state.phase === 'idle' || state.phase === 'ready')) {
    // Game started but we skipped warmup (e.g. app restarted mid-match)
    state.phase = 'live';
    state.gameClientConnected = true;
    // rosterLoaded is managed by rosterStore via onRosterLoaded/onRosterCleared
    notify();
  }

  // Team elimination detection (only during live phase)
  if (state.phase === 'live' && snap.teams.length > 0) {
    for (const team of snap.teams) {
      const prev = previousTeamAlive.get(team.slot);
      if (prev !== undefined && prev > 0 && team.liveMemberNum === 0) {
        const name = team.displayName || team.shortName || team.inGameName;
        const rank = team.rank > 0 ? ` (#${team.rank})` : '';
        addNotification('warning', `${name} eliminated${rank}`);
      }
      previousTeamAlive.set(team.slot, team.liveMemberNum);
    }
  }
}

/**
 * Initialize lifecycle store — subscribes to gameStore changes.
 * Safe to call multiple times (idempotent).
 */
export function initLifecycle(): void {
  if (initialized) return;
  initialized = true;

  // Roster state is set by rosterStore calling onRosterLoaded() when it loads.
  // No need to check here — rosterStore loads on import and will call us.

  // Subscribe to game state changes
  gameSubscribe('state', onGameStateChange);
}

// Auto-init on import
initLifecycle();
