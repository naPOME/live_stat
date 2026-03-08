'use client';

import React, { useEffect, useMemo, useState } from 'react';

import type { LeaderboardPlayer, LeaderboardResponse, LeaderboardTeam } from '@/lib/types';

type TeamCard = {
  teamName: string;
  headerLabel: string;
  totalKills: number;
  players: Array<{ playerName: string; kills: number }>;
};

function normalizePlayers(players: LeaderboardPlayer[] | undefined): LeaderboardPlayer[] {
  return (players ?? []).filter((p) => !!p.playerName && !!p.teamName);
}

function buildTeamCards(teams: LeaderboardTeam[], players: LeaderboardPlayer[]): TeamCard[] {
  const byTeam = new Map<string, LeaderboardPlayer[]>();
  for (const p of players) {
    const key = p.teamName;
    const arr = byTeam.get(key) ?? [];
    arr.push(p);
    byTeam.set(key, arr);
  }

  return (teams ?? []).map((t) => {
    const teamPlayers = (byTeam.get(t.teamName) ?? [])
      .slice()
      .sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0));

    const firstPlayerName = teamPlayers[0]?.playerName ?? '—';
    const totalKills = Number.isFinite(t.kills)
      ? t.kills
      : teamPlayers.reduce((sum, p) => sum + (p.kills ?? 0), 0);

    return {
      teamName: t.teamName,
      headerLabel: `Team • ${firstPlayerName.substring(3)}`,
      totalKills,
      players: teamPlayers.map((p) => ({ playerName: p.playerName, kills: p.kills ?? 0 })),
    };
  });
}

const TdmLiveScoreboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        if (!res.ok) return;
        const next = (await res.json()) as LeaderboardResponse;
        if (!cancelled) setData(next);
      } catch {
        // ignore
      }
    };

    fetchLive();
    const id = window.setInterval(fetchLive, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const teamCards = useMemo(() => {
    const teams = (data?.teams ?? []).slice(0, 2);
    const players = normalizePlayers(data?.players);
    return buildTeamCards(teams, players);
  }, [data]);

  return (
    <div className="relative min-w-lg rounded-xl p-[1px]  ">
      <div className="rounded-2xl  p-4 ">
        <div className="flex items-center justify-between mb-3  ">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#00ffc3] shadow-[0_0_14px_rgba(0,255,195,0.7)]" />
            <div className="text-xs font-extrabold tracking-[0.22em] uppercase text-">TDM Live</div>
          </div>
          <div className="text-[11px] font-medium text-white/45 tabular-nums">
          {data?.serverTime ? new Date(data.serverTime).toLocaleTimeString() : '—'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/10 ">
          {teamCards.map((team, idx) => {
            const accent = idx === 0 ? 'from-[#00ffc3]/20 via-[#6d5efc]/10 to-transparent' : 'from-[#ff4e4e]/20 via-[#6d5efc]/10 to-transparent';
            const killColor = idx === 0 ? 'text-[#00ffc3]' : 'text-[#ff4e4e]';
            const dotColor = idx === 0 ? 'bg-[#00ffc3]' : 'bg-[#ff4e4e]';
            const dotShadow = idx === 0 ? 'shadow-[0_0_18px_rgba(0,255,195,0.7)]' : 'shadow-[0_0_18px_rgba(255,78,78,0.65)]';
            return (
              <div
                key={team.teamName}
                className="rounded-xl border bg-gradient-to-b from-[#10122a] to-[#070812] border-2 rounded-md border-white/10 bg-white/[0.04] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
              >
                <div className={`flex items-center justify-between px-2 gap-4 py-1 bg-gradient-to-r ${accent}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-1 w-1 rounded-full ${dotColor} ${dotShadow}`} />
                      <div className="text-sm font-semibold text-white truncate">{team.headerLabel}</div>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/45">Kills</div>
                    <div className={`text-xl font-black ${killColor} tabular-nums leading-none drop-shadow-[0_0_12px_rgba(109,94,252,0.25)]`}>
                      {team.totalKills}
                    </div>
                  </div>
                </div>

                <div className="px-3 py-2">
                  {team.players.length ? (
                    <div className="flex flex-col">
                      {team.players.map((p, pIdx) => (
                        <div
                          key={p.playerName}
                          className={`flex items-center justify-between py-1 ${pIdx ? 'border-t border-white/5' : ''}`}
                        >
                          <div className="text-[12px] text-white/85 truncate pr-2">{p.playerName}</div>
                          <div className="text-[12px] font-extrabold text-white tabular-nums">
                            <span className="text-white/50 pr-1">+</span>
                            {p.kills}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-white/40">Waiting for players…</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!teamCards.length ? <div className="text-[12px] text-white/40 mt-1">Waiting for teams…</div> : null}
      </div>
    </div>
  );
};

export default TdmLiveScoreboard;
