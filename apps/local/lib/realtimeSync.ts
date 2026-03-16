/**
 * realtimeSync.ts — Multi-PC synchronization via Supabase Realtime.
 *
 * Modes:
 *   LEADER  — Receives PCOB data locally, publishes state snapshots
 *             to a Supabase Realtime broadcast channel.
 *   FOLLOWER — Subscribes to the channel, hydrates local gameStore
 *             from incoming snapshots. No PCOB needed.
 *
 * Both roles sync widget visibility bidirectionally.
 */

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import {
  snapshot,
  subscribe,
  hydrateFromSnapshot,
  ingestRemoteKill,
  ingestRemotePlayercard,
  type GameSnapshot,
  type KillEvent,
  type PlayerState,
  type TeamState,
} from './gameStore';
import {
  getVisibility,
  hydrateWidgets,
  setSyncHook,
} from './widgetStore';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SyncRole = 'leader' | 'follower' | 'standalone';

export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  matchId: string;
  role: SyncRole;
}

export interface SyncStatus {
  role: SyncRole;
  connected: boolean;
  matchId: string | null;
  peerCount: number;
  lastSyncAt: number | null;
  error: string | null;
}

type SyncListener = (status: SyncStatus) => void;

// ─── Message Types ──────────────────────────────────────────────────────────────

interface StateMessage {
  type: 'state';
  snapshot: GameSnapshot;
  ts: number;
}

interface KillMessage {
  type: 'kill';
  event: KillEvent;
  ts: number;
}

interface PlayercardMessage {
  type: 'playercard';
  data: { uid: string; openId: string; player: PlayerState | undefined; team: TeamState | undefined };
  ts: number;
}

interface WidgetMessage {
  type: 'widgets';
  visibility: Record<string, boolean>;
  sender: string;
  ts: number;
}

interface PresenceState {
  role: SyncRole;
  joinedAt: number;
}

type SyncMessage = StateMessage | KillMessage | PlayercardMessage | WidgetMessage;

// ─── Module State ───────────────────────────────────────────────────────────────

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let role: SyncRole = 'standalone';
let matchId: string | null = null;
let connected = false;
let peerCount = 0;
let lastSyncAt: number | null = null;
let syncError: string | null = null;
let publishInterval: ReturnType<typeof setInterval> | null = null;
const instanceId = `pc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const statusListeners = new Set<SyncListener>();

// Unsub handles
let unsubState: (() => void) | null = null;
let unsubKillfeed: (() => void) | null = null;
let unsubPlayercard: (() => void) | null = null;

// ─── Status ─────────────────────────────────────────────────────────────────────

function getStatus(): SyncStatus {
  return { role, connected, matchId, peerCount, lastSyncAt, error: syncError };
}

function notifyStatus() {
  const s = getStatus();
  for (const fn of statusListeners) { try { fn(s); } catch { /* */ } }
}

export function subscribeStatus(fn: SyncListener): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

export function getSyncStatus(): SyncStatus {
  return getStatus();
}

// ─── Start / Stop ───────────────────────────────────────────────────────────────

export function startSync(config: SyncConfig): void {
  // Clean up previous
  stopSync();

  if (config.role === 'standalone') {
    role = 'standalone';
    notifyStatus();
    return;
  }

  role = config.role;
  matchId = config.matchId;
  syncError = null;

  try {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });
  } catch (err) {
    syncError = err instanceof Error ? err.message : 'Failed to create Supabase client';
    notifyStatus();
    return;
  }

  const channelName = `match:${config.matchId}`;
  channel = client.channel(channelName, {
    config: { broadcast: { self: false } },
  });

  // ── Broadcast listener (both roles receive) ──
  channel.on('broadcast', { event: 'sync' }, ({ payload }: { payload: SyncMessage }) => {
    handleIncoming(payload);
  });

  // ── Presence for peer counting ──
  channel.on('presence', { event: 'sync' }, () => {
    const presenceState = channel?.presenceState<PresenceState>() ?? {};
    peerCount = Object.keys(presenceState).length;
    notifyStatus();
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      connected = true;
      syncError = null;

      // Track presence
      await channel?.track({ role, joinedAt: Date.now() } as PresenceState);

      if (role === 'leader') {
        setupLeader();
      } else {
        setupFollower();
      }

      notifyStatus();
      console.log(`[RealtimeSync] Connected as ${role} to ${channelName}`);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      connected = false;
      syncError = `Channel ${status.toLowerCase()}`;
      notifyStatus();
      console.error(`[RealtimeSync] ${status}`);
    } else if (status === 'CLOSED') {
      connected = false;
      notifyStatus();
    }
  });
}

export function stopSync(): void {
  // Cleanup leader intervals
  if (publishInterval) {
    clearInterval(publishInterval);
    publishInterval = null;
  }

  // Cleanup subscriptions
  if (unsubState) { unsubState(); unsubState = null; }
  if (unsubKillfeed) { unsubKillfeed(); unsubKillfeed = null; }
  if (unsubPlayercard) { unsubPlayercard(); unsubPlayercard = null; }

  // Remove widget sync hook
  setSyncHook(null);

  // Disconnect channel
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }

  if (client) {
    client.removeAllChannels();
    client = null;
  }

  connected = false;
  peerCount = 0;
  role = 'standalone';
  matchId = null;
  lastSyncAt = null;
  syncError = null;
  notifyStatus();
}

export function getRole(): SyncRole {
  return role;
}

// ─── Leader Setup ───────────────────────────────────────────────────────────────

function setupLeader(): void {
  // Publish full state snapshot every 500ms
  publishInterval = setInterval(() => {
    broadcastMessage({
      type: 'state',
      snapshot: snapshot(),
      ts: Date.now(),
    });
    lastSyncAt = Date.now();
  }, 500);

  // Subscribe to gameStore kill events to broadcast immediately
  unsubKillfeed = subscribe('killfeed', (data) => {
    broadcastMessage({
      type: 'kill',
      event: data as KillEvent,
      ts: Date.now(),
    });
  });

  // Subscribe to playercard updates to broadcast immediately
  unsubPlayercard = subscribe('playercard', (data) => {
    broadcastMessage({
      type: 'playercard',
      data: data as PlayercardMessage['data'],
      ts: Date.now(),
    });
  });

  // Sync widget changes to other PCs
  setSyncHook((vis) => {
    broadcastMessage({
      type: 'widgets',
      visibility: vis,
      sender: instanceId,
      ts: Date.now(),
    });
  });
}

// ─── Follower Setup ─────────────────────────────────────────────────────────────

function setupFollower(): void {
  // Sync widget changes to other PCs (bidirectional)
  setSyncHook((vis) => {
    broadcastMessage({
      type: 'widgets',
      visibility: vis,
      sender: instanceId,
      ts: Date.now(),
    });
  });
}

// ─── Message Handling ───────────────────────────────────────────────────────────

function handleIncoming(msg: SyncMessage): void {
  switch (msg.type) {
    case 'state':
      if (role === 'follower') {
        hydrateFromSnapshot(msg.snapshot);
        lastSyncAt = Date.now();
        notifyStatus();
      }
      break;

    case 'kill':
      if (role === 'follower') {
        ingestRemoteKill(msg.event);
      }
      break;

    case 'playercard':
      if (role === 'follower') {
        ingestRemotePlayercard(msg.data);
      }
      break;

    case 'widgets':
      // Only apply if from a different PC
      if (msg.sender !== instanceId) {
        // Temporarily remove hook to prevent echo
        setSyncHook(null);
        hydrateWidgets(msg.visibility);
        // Re-attach hook
        setSyncHook((vis) => {
          broadcastMessage({
            type: 'widgets',
            visibility: vis,
            sender: instanceId,
            ts: Date.now(),
          });
        });
      }
      break;
  }
}

// ─── Broadcast Helper ───────────────────────────────────────────────────────────

function broadcastMessage(msg: SyncMessage): void {
  if (!channel || !connected) return;
  channel.send({
    type: 'broadcast',
    event: 'sync',
    payload: msg,
  }).catch(() => {
    // Swallow send errors silently
  });
}
