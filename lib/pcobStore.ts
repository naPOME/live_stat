export type MatchId = string;

export type PlayerState = {
  name: string;
  kills: number;
};

export type TeamState = {
  name: string;
  kills: number;
  placement?: number;
  alive?: boolean;
  players?: Record<string, PlayerState>;
  updatedAt: number;
};

export type MatchState = {
  matchId: MatchId;
  startedAt?: number;
  updatedAt: number;
  teams: Record<string, TeamState>;
};

export type LeaderboardTeam = {
  teamName: string;
  kills: number;
  placement?: number;
  alive?: boolean;
  placementPoints: number;
  totalPoints: number;
  updatedAt: number;
};

export type LeaderboardResponse = {
  matchId: string;
  serverTime: number;
  teams: LeaderboardTeam[];
};

export type PcobIngestPayload = {
  matchId?: string;
  timestamp?: number;
  teams?: Array<{
    name: string;
    kills?: number;
    placement?: number;
    alive?: boolean;
    players?: Array<{ name: string; kills?: number }>;
  }>;
  team?: {
    name: string;
    kills?: number;
    placement?: number;
    alive?: boolean;
    players?: Array<{ name: string; kills?: number }>;
  };
};

type PcobTotalMessagePayload = {
  TotalPlayerList?: Array<{
    uId: number | string;
    playerName: string;
    teamId: number;
    teamName: string;
    bHasDied?: boolean;
    liveState?: number;
    killNum?: number;
    rank?: number;
  }>;
  TeamInfoList?: Array<{
    teamId: number;
    teamName: string;
    killNum?: number;
    liveMemberNum?: number;
  }>;
  GameID?: string;
  CurrentTime?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function toTimestampMsFromPcobSecondsString(value: unknown): number | undefined {
  const seconds = toNumber(value);
  if (seconds === undefined) return undefined;
  if (seconds > 10_000_000_000) return seconds;
  return Math.floor(seconds * 1000);
}

export function upsertFromPcobRaw(raw: unknown): { matchId: string; changed: boolean; recognized: boolean } {
  if (!isObject(raw)) {
    return { matchId: "default", changed: false, recognized: false };
  }

  const maybeTotal = raw as PcobTotalMessagePayload;
  const hasTotalMessageShape = Array.isArray(maybeTotal.TotalPlayerList) || Array.isArray(maybeTotal.TeamInfoList);
  if (!hasTotalMessageShape) {
    return { matchId: "default", changed: false, recognized: false };
  }

  const matchId = (maybeTotal.GameID ?? "default").trim() || "default";
  const timestamp = toTimestampMsFromPcobSecondsString(maybeTotal.CurrentTime) ?? Date.now();

  const teamById = new Map<number, { name: string; kills?: number; alive?: boolean; placement?: number; players: Array<{ name: string; kills?: number }> }>();

  for (const t of maybeTotal.TeamInfoList ?? []) {
    if (!t || typeof t.teamId !== "number" || typeof t.teamName !== "string") continue;
    teamById.set(t.teamId, {
      name: t.teamName,
      kills: typeof t.killNum === "number" ? t.killNum : undefined,
      alive: typeof t.liveMemberNum === "number" ? t.liveMemberNum > 0 : undefined,
      placement: undefined,
      players: [],
    });
  }

  for (const p of maybeTotal.TotalPlayerList ?? []) {
    if (!p || typeof p.teamId !== "number" || typeof p.playerName !== "string") continue;
    const existing = teamById.get(p.teamId) ?? {
      name: p.teamName || `Team${p.teamId}`,
      players: [],
    };

    existing.players.push({
      name: p.playerName,
      kills: typeof p.killNum === "number" ? p.killNum : undefined,
    });

    const dead = p.bHasDied === true || p.liveState === 5;
    if (existing.alive === undefined) existing.alive = !dead;
    else existing.alive = existing.alive || !dead;

    if (typeof p.rank === "number" && p.rank > 0) {
      existing.placement = existing.placement ? Math.min(existing.placement, p.rank) : p.rank;
    }

    teamById.set(p.teamId, existing);
  }

  const teams = Array.from(teamById.values()).map((t) => ({
    name: t.name,
    kills: t.kills,
    placement: t.placement,
    alive: t.alive,
    players: t.players.length ? t.players : undefined,
  }));

  const payload: PcobIngestPayload = { matchId, timestamp, teams };
  const { changed } = upsertFromPayload(payload);
  return { matchId, changed, recognized: true };
}

const PLACEMENT_POINTS: Record<number, number> = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: 0,
  14: 0,
  15: 0,
  16: 0,
  17: 0,
  18: 0,
  19: 0,
  20: 0,
};

function placementToPoints(placement?: number): number {
  if (!placement || placement < 1) return 0;
  return PLACEMENT_POINTS[placement] ?? 0;
}

function normalizeTeamKey(teamName: string): string {
  return teamName.trim().toLowerCase();
}

type Subscriber = {
  matchId: string;
  send: (data: LeaderboardResponse) => void;
};

const globalStore = globalThis as unknown as {
  __pcobStore?: {
    matches: Map<string, MatchState>;
    subscribers: Set<Subscriber>;
  };
};

function getStore() {
  if (!globalStore.__pcobStore) {
    globalStore.__pcobStore = {
      matches: new Map<string, MatchState>(),
      subscribers: new Set<Subscriber>(),
    };
  }
  return globalStore.__pcobStore;
}

export function getOrCreateMatch(matchId: string): MatchState {
  const store = getStore();
  const existing = store.matches.get(matchId);
  if (existing) return existing;

  const now = Date.now();
  const created: MatchState = {
    matchId,
    startedAt: now,
    updatedAt: now,
    teams: {},
  };
  store.matches.set(matchId, created);
  return created;
}

export function upsertFromPayload(payload: PcobIngestPayload): { matchId: string; changed: boolean } {
  const matchId = (payload.matchId ?? "default").trim() || "default";
  const match = getOrCreateMatch(matchId);

  const now = Date.now();
  const eventTs = typeof payload.timestamp === "number" ? payload.timestamp : now;

  const teamsInput = payload.teams ?? (payload.team ? [payload.team] : []);

  let changed = false;

  for (const t of teamsInput) {
    if (!t?.name || typeof t.name !== "string") continue;
    const key = normalizeTeamKey(t.name);
    const prev = match.teams[key];

    const nextKills = typeof t.kills === "number" ? t.kills : prev?.kills ?? 0;
    const nextPlacement = typeof t.placement === "number" ? t.placement : prev?.placement;
    const nextAlive = typeof t.alive === "boolean" ? t.alive : prev?.alive;

    const nextPlayers: Record<string, PlayerState> | undefined = t.players
      ? t.players.reduce<Record<string, PlayerState>>((acc, p) => {
          if (!p?.name) return acc;
          const pk = p.name.trim().toLowerCase();
          const pkills = typeof p.kills === "number" ? p.kills : 0;
          acc[pk] = { name: p.name, kills: pkills };
          return acc;
        }, {})
      : prev?.players;

    const next: TeamState = {
      name: t.name,
      kills: nextKills,
      placement: nextPlacement,
      alive: nextAlive,
      players: nextPlayers,
      updatedAt: eventTs,
    };

    if (!prev) {
      match.teams[key] = next;
      changed = true;
      continue;
    }

    if (
      prev.name !== next.name ||
      prev.kills !== next.kills ||
      prev.placement !== next.placement ||
      prev.alive !== next.alive ||
      JSON.stringify(prev.players ?? null) !== JSON.stringify(next.players ?? null)
    ) {
      match.teams[key] = next;
      changed = true;
    }
  }

  if (changed) {
    match.updatedAt = Math.max(match.updatedAt, eventTs, now);
    notify(matchId);
  }

  return { matchId, changed };
}

export function getAllMatchIds(): string[] {
  const store = getStore();
  return Array.from(store.matches.keys());
}

export function computeLeaderboard(matchId: string): LeaderboardResponse {
  const match = getOrCreateMatch(matchId);

  const teams: LeaderboardTeam[] = Object.values(match.teams).map((t) => {
    const placementPoints = placementToPoints(t.placement);
    const totalPoints = (t.kills ?? 0) + placementPoints;
    return {
      teamName: t.name,
      kills: t.kills ?? 0,
      placement: t.placement,
      alive: t.alive,
      placementPoints,
      totalPoints,
      updatedAt: t.updatedAt,
    };
  });

  teams.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if ((b.kills ?? 0) !== (a.kills ?? 0)) return (b.kills ?? 0) - (a.kills ?? 0);
    const ap = a.placement ?? Number.POSITIVE_INFINITY;
    const bp = b.placement ?? Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;
    return b.updatedAt - a.updatedAt;
  });

  return {
    matchId,
    serverTime: Date.now(),
    teams,
  };
}

export function subscribe(matchId: string, send: (data: LeaderboardResponse) => void): () => void {
  const store = getStore();
  const sub: Subscriber = { matchId, send };
  store.subscribers.add(sub);

  return () => {
    store.subscribers.delete(sub);
  };
}

export function notify(matchId: string): void {
  const store = getStore();
  const data = computeLeaderboard(matchId);
  for (const sub of store.subscribers) {
    if (sub.matchId !== matchId) continue;
    try {
      sub.send(data);
    } catch {
      store.subscribers.delete(sub);
    }
  }
}

export function ingestMockTick(matchId: string): void {
  const match = getOrCreateMatch(matchId);
  const now = Date.now();

  const teamNames = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
  for (const name of teamNames) {
    const key = normalizeTeamKey(name);
    const prev = match.teams[key];
    const baseKills = prev?.kills ?? 0;
    const deltaKills = Math.random() < 0.35 ? 1 : 0;
    const alive = prev?.alive ?? true;
    const nextAlive = alive ? Math.random() < 0.03 ? false : true : false;

    const placement = nextAlive
      ? prev?.placement
      : prev?.placement ?? Math.max(1, Math.min(20, Math.floor(8 + Math.random() * 12)));

    match.teams[key] = {
      name,
      kills: baseKills + deltaKills,
      alive: nextAlive,
      placement,
      updatedAt: now,
    };
  }

  match.updatedAt = now;
  notify(matchId);
}
