'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import DataTable from '@/components/DataTable';
import { TeamAvatar, PlayerAvatar } from '@/components/Avatar';

type PlayerStat = {
  rank: number;
  player_open_id: string;
  display_name: string;
  player_id: string | null;
  team: { id: string; name: string; short_name: string | null; logo_url: string | null } | null;
  total_kills: number;
  total_damage: number;
  matches_played: number;
  deaths: number;
  kd: number;
  avg_damage: number;
  survival_rate: number;
  top_fragger_count: number;
};

type PlayerRow = {
  id: string;
  team_id: string;
  display_name: string;
  player_open_id: string;
};

type TeamRow = {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type TournamentRow = { id: string; name: string };
type Tab = 'roster' | 'leaderboard';

type PlayersClientProps = {
  initialPlayers: PlayerRow[];
  initialTeams: TeamRow[];
  initialTournaments: TournamentRow[];
};

export default function PlayersClient({ initialPlayers, initialTeams, initialTournaments }: PlayersClientProps) {
  const [tab, setTab] = useState<Tab>('roster');
  const [filterTournament, setFilterTournament] = useState('');
  const [statsEnabled, setStatsEnabled] = useState(false);

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['player-stats', filterTournament || 'all'],
    queryFn: async () => {
      const qs = filterTournament ? `?tournamentId=${filterTournament}` : '';
      const res = await fetch(`/api/player-stats${qs}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json() as Promise<{ players: PlayerStat[]; matchCount: number }>;
    },
    enabled: statsEnabled,
    staleTime: 30_000,
  });

  const stats = statsData?.players ?? [];
  const matchCount = statsData?.matchCount ?? 0;
  const teamMap = useMemo(() => new Map(initialTeams.map((t) => [t.id, t])), [initialTeams]);

  const rosterColumns = useMemo<ColumnDef<PlayerRow, unknown>[]>(() => [
    {
      id: 'index',
      header: '#',
      meta: { width: '44px' },
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-[12px] font-mono text-[var(--text-muted)] tabular-nums">{row.index + 1}</span>
      ),
    },
    {
      accessorKey: 'display_name',
      header: 'Player',
      meta: { width: '1.5fr' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <PlayerAvatar name={row.original.display_name} size="sm" />
          <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate group-hover:text-white transition-colors">
            {row.original.display_name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'player_open_id',
      header: 'In-Game ID',
      meta: { width: '1.2fr' },
      cell: ({ getValue }) => (
        <span className="text-[13px] font-mono text-[var(--text-muted)] truncate">{getValue() as string}</span>
      ),
    },
    {
      id: 'team',
      header: 'Team',
      meta: { width: '1fr' },
      accessorFn: (p) => teamMap.get(p.team_id)?.name ?? '',
      cell: ({ row }) => {
        const team = teamMap.get(row.original.team_id);
        return (
          <div className="flex items-center gap-2 min-w-0">
            <TeamAvatar name={team?.name ?? ''} logoUrl={team?.logo_url} size="xs" />
            <span className="text-[13px] text-[var(--text-secondary)] truncate">{team?.name ?? 'Unknown'}</span>
          </div>
        );
      },
    },
  ], [teamMap]);

  const leaderboardColumns = useMemo<ColumnDef<PlayerStat, unknown>[]>(() => [
    {
      id: 'rank',
      header: '#',
      meta: { width: '44px' },
      accessorKey: 'rank',
      cell: ({ getValue }) => {
        const r = getValue() as number;
        return (
          <span className={`text-[13px] font-bold tabular-nums ${r <= 3 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
            {r}
          </span>
        );
      },
    },
    {
      accessorKey: 'display_name',
      header: 'Player',
      meta: { width: '1.2fr' },
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <PlayerAvatar name={p.display_name} size="sm" />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{p.display_name}</div>
              <div className="text-[10px] font-mono text-[var(--text-muted)]">{p.matches_played}M</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'team',
      header: 'Team',
      meta: { width: '1fr' },
      accessorFn: (p) => p.team?.name ?? '',
      cell: ({ row }) => {
        const team = row.original.team;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <TeamAvatar name={team?.name ?? ''} logoUrl={team?.logo_url} size="xs" />
            <span className="text-[13px] text-[var(--text-secondary)] truncate">{team?.short_name ?? team?.name ?? '—'}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'total_kills',
      header: 'Kills',
      meta: { width: '70px' },
      cell: ({ getValue }) => (
        <span className="text-[13px] font-bold text-[var(--text-primary)] tabular-nums">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'total_damage',
      header: 'Damage',
      meta: { width: '90px' },
      cell: ({ getValue }) => (
        <span className="text-[13px] text-[var(--text-secondary)] tabular-nums">{(getValue() as number).toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'kd',
      header: 'K/D',
      meta: { width: '64px' },
      cell: ({ getValue }) => (
        <span className="text-[13px] text-[var(--text-secondary)] tabular-nums">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'avg_damage',
      header: 'Avg Dmg',
      meta: { width: '80px' },
      cell: ({ getValue }) => (
        <span className="text-[13px] text-[var(--text-secondary)] tabular-nums">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'survival_rate',
      header: 'Survival',
      meta: { width: '80px' },
      cell: ({ getValue }) => (
        <span className="text-[13px] text-[var(--text-secondary)] tabular-nums">{getValue() as number}%</span>
      ),
    },
    {
      accessorKey: 'top_fragger_count',
      header: 'MVP',
      meta: { width: '60px' },
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return (
          <span className={`text-[13px] font-bold tabular-nums ${v > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
            {v > 0 ? v : '—'}
          </span>
        );
      },
    },
  ], []);

  return (
    <div className="max-w-[1400px] page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Players</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          {initialPlayers.length} player{initialPlayers.length !== 1 ? 's' : ''} across {initialTeams.length} team{initialTeams.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex gap-2 mb-8 border-b border-[var(--border)]">
        {(['roster', 'leaderboard'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'leaderboard' && !statsEnabled) setStatsEnabled(true); }}
            className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
              tab === t ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}>
            <span className="relative z-10 block translate-y-px">
              {t === 'roster' ? 'Roster' : 'Leaderboard'}
            </span>
            {tab === t && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent)]" />}
          </button>
        ))}
      </div>

      {tab === 'roster' && (
        <>
          {initialPlayers.length === 0 ? (
            <div className="surface animate-slide-up mt-8">
              <div className="p-16 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
                  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                    <circle cx="13" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.6" className="text-[var(--text-muted)]"/>
                    <path d="M4 23c0-5 4-8.5 9-8.5s9 3.5 9 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-[var(--text-muted)]"/>
                  </svg>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Players Yet</h3>
                <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Add players to your teams to start building rosters.</p>
                <a href="/teams" className="btn-primary">Go to Teams</a>
              </div>
            </div>
          ) : (
            <div className="animate-slide-up">
              <DataTable
                columns={rosterColumns}
                data={initialPlayers}
                pageSize={25}
                getRowHref={(p) => `/players/${p.id}`}
              />
            </div>
          )}
        </>
      )}

      {tab === 'leaderboard' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <select
              value={filterTournament}
              onChange={(e) => { setFilterTournament(e.target.value); setStatsEnabled(true); }}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]">
              <option value="">All Tournaments</option>
              {initialTournaments.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button onClick={() => refetchStats()} className="btn-ghost py-2 text-xs">Refresh</button>
            {matchCount > 0 && (
              <span className="text-xs text-[var(--text-muted)]">{matchCount} match{matchCount !== 1 ? 'es' : ''} analyzed</span>
            )}
          </div>

          {/* Summary bar */}
          {stats.length > 0 && (
            <div className="flex items-center gap-10 pb-6 border-b border-[var(--border)]">
              {[
                { label: 'Players Tracked', value: stats.length, color: 'var(--text-primary)' },
                { label: 'Total Kills', value: stats.reduce((s, p) => s + p.total_kills, 0).toLocaleString(), color: 'var(--accent)' },
                { label: 'Avg K/D', value: (stats.reduce((s, p) => s + p.kd, 0) / stats.length).toFixed(2), color: 'var(--text-primary)' },
                { label: 'Top Fragger', value: stats[0]?.display_name ?? '—', color: 'var(--accent)' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="text-2xl font-black leading-none" style={{ color }}>{value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1.5">{label}</div>
                </div>
              ))}
            </div>
          )}

          {statsLoading ? (
            <div className="flex items-center justify-center py-16"><span className="loader" /></div>
          ) : stats.length === 0 ? (
            <div className="surface p-12 text-center">
              <p className="text-[var(--text-muted)] text-sm">No player stats available yet. Stats are recorded when match results include player data.</p>
            </div>
          ) : (
            <DataTable
              columns={leaderboardColumns}
              data={stats}
              pageSize={25}
              getRowHref={(p) => p.player_id ? `/players/${p.player_id}` : '#'}
            />
          )}
        </div>
      )}
    </div>
  );
}
