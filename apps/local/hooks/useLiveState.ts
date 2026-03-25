'use client';

import { useEffect, useState } from 'react';

export interface LiveTeam {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  logoUrl?: string;
  kills: number;
  placement?: number;
  alive: boolean;
  liveMemberNum: number;
  placementPoints: number;
  totalPoints: number;
}

export interface LivePlayer {
  playerName: string;
  displayName?: string;
  teamName: string;
  teamSlot?: number;
  kills: number;
  damage: number;
  headshots?: number;
  assists?: number;
  survivalTime?: number;
}

export interface LiveStateClient {
  matchId: string;
  serverTime: number;
  phase?: string;
  teams: LiveTeam[];
  players: LivePlayer[];
}

const EMPTY_STATE: LiveStateClient = {
  matchId: 'default',
  serverTime: 0,
  phase: 'lobby',
  teams: [],
  players: [],
};

function normalize(raw: unknown): LiveStateClient {
  if (!raw || typeof raw !== 'object') return EMPTY_STATE;
  const data = raw as Partial<LiveStateClient>;
  return {
    matchId: data.matchId ?? 'default',
    serverTime: data.serverTime ?? Date.now(),
    phase: data.phase ?? 'lobby',
    teams: data.teams ?? [],
    players: data.players ?? [],
  };
}

export function useLiveState(): LiveStateClient {
  const [state, setState] = useState<LiveStateClient>(EMPTY_STATE);

  useEffect(() => {
    let closed = false;

    const apply = (raw: unknown) => {
      if (closed) return;
      setState(normalize(raw));
    };

    fetch('/api/state')
      .then((r) => r.json())
      .then((raw) => apply(raw?.data ?? raw))
      .catch(() => {});

    const es = new EventSource('/api/stream?filter=state');

    const onMessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data);
        apply(parsed?.data ?? parsed);
      } catch {
        // Keep the latest valid state.
      }
    };

    es.addEventListener('hello', onMessage as EventListener);
    es.addEventListener('state', onMessage as EventListener);

    return () => {
      closed = true;
      es.close();
    };
  }, []);

  return state;
}
