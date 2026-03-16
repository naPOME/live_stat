'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type PlayerStat = {
  rank: number;
  player_open_id: string;
  display_name: string;
  player_id: string | null;
  team: { id: string; name: string; short_name: string | null; brand_color: string; logo_url: string | null } | null;
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
  brand_color: string;
};

type TournamentRow = { id: string; name: string };
type Tab = 'roster' | 'leaderboard';

type PlayersClientProps = {
  initialPlayers: PlayerRow[];
  initialTeams: TeamRow[];
  initialTournaments: TournamentRow[];
};

export default function PlayersClient({ initialPlayers, initialTeams, initialTournaments }: PlayersClientProps) {
  const [players] = useState<PlayerRow[]>(initialPlayers);
  const [teams] = useState<TeamRow[]>(initialTeams);
  const [tournaments] = useState<TournamentRow[]>(initialTournaments);
  const [tab, setTab] = useState<Tab>('roster');

  // Stats
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [filterTournament, setFilterTournament] = useState<string>('');

  async function fetchStats(tournamentId?: string) {
    setStatsLoading(true);
    try {
      const qs = tournamentId ? `?tournamentId=${tournamentId}` : '';
      const res = await fetch(`/api/player-stats${qs}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.players ?? []);
        setMatchCount(data.matchCount ?? 0);
      }
    } catch { /* ignore */ }
    setStatsLoading(false);
  }

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const rosterCols = '40px 1.5fr 1.5fr 1fr';
  const statsCols = '36px 1.2fr 1fr 70px 80px 60px 70px 80px 60px';

  return (
    <div className="p-10 max-w-[1400px] page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Players</h1>
        <p className="text-[var(--text-secondary)] text-sm font-body">
          {players.length} player{players.length !== 1 ? 's' : ''} across {teams.length} team{teams.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-[var(--border)]">
        {(['roster', 'leaderboard'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === 'leaderboard' && stats.length === 0) fetchStats(filterTournament || undefined);
            }}
            className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
              tab === t ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="relative z-10 block translate-y-px">
              {t === 'roster' ? 'Roster' : 'Leaderboard'}
            </span>
            {tab === t && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent)]" />}
          </button>
        ))}
      </div>

      {/* Roster Tab */}
      {tab === 'roster' && (
        <>
          {players.length === 0 ? (
            <div className="surface animate-slide-up mt-8">
              <div className="p-16 text-center relative overflow-hidden flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
                  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                    <circle cx="13" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.6" className="text-[var(--text-muted)]"/>
                    <path d="M4 23c0-5 4-8.5 9-8.5s9 3.5 9 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-[var(--text-muted)]"/>
                  </svg>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Players Yet</h3>
                <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Add players to your teams to start building rosters.</p>
                <Link href="/teams" className="btn-primary">Go to Teams</Link>
              </div>
            </div>
          ) : (
            <div className="data-table animate-slide-up">
              <div className="data-table-header" style={{ gridTemplateColumns: rosterCols }}>
                {['#', 'Player', 'In-Game ID', 'Team'].map((h) => (
                  <span key={h} className="text-[11px] font-display font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <div>
                {players.map((player, i) => {
                  const team = teamMap.get(player.team_id);
                  const color = team?.brand_color || '#7a8ba8';
                  return (
                    <Link key={player.id} href={`/teams/${player.team_id}`}
                      className="data-table-row group transition-colors"
                      style={{ gridTemplateColumns: rosterCols }}>
                      <span className="text-[12px] font-mono text-[var(--text-muted)] tabular-nums">{i + 1}</span>
                      <span className="text-[14px] font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{player.display_name}</span>
                      <span className="text-[13px] font-mono text-[var(--text-muted)] truncate">{player.player_open_id}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}44` }} />
                        <span className="text-[13px] text-[var(--text-secondary)] truncate">{team?.name ?? 'Unknown'}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Leaderboard Tab */}
      {tab === 'leaderboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <select
              value={filterTournament}
              onChange={(e) => { setFilterTournament(e.target.value); fetchStats(e.target.value || undefined); }}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">All Tournaments</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button onClick={() => fetchStats(filterTournament || undefined)} className="btn-ghost py-2 text-xs">
              Refresh
            </button>
            {matchCount > 0 && (
              <span className="text-xs text-[var(--text-muted)]">{matchCount} match{matchCount !== 1 ? 'es' : ''} analyzed</span>
            )}
          </div>

          {/* Stats summary cards */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="surface p-5 flex flex-col justify-between h-[92px]">
                <div className="text-xs font-semibold text-[var(--text-muted)]">Players Tracked</div>
                <div className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{stats.length}</div>
              </div>
              <div className="surface p-5 flex flex-col justify-between h-[92px]">
                <div className="text-xs font-semibold text-[var(--text-muted)]">Total Kills</div>
                <div className="text-2xl font-semibold tracking-tight text-[var(--accent)]">{stats.reduce((s, p) => s + p.total_kills, 0)}</div>
              </div>
              <div className="surface p-5 flex flex-col justify-between h-[92px]">
                <div className="text-xs font-semibold text-[var(--text-muted)]">Avg K/D</div>
                <div className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {stats.length > 0 ? (stats.reduce((s, p) => s + p.kd, 0) / stats.length).toFixed(2) : '—'}
                </div>
              </div>
              <div className="surface p-5 flex flex-col justify-between h-[92px]">
                <div className="text-xs font-semibold text-[var(--text-muted)]">Top Fragger</div>
                <div className="text-lg font-semibold tracking-tight text-[var(--accent)] truncate">
                  {stats[0]?.display_name ?? '—'}
                </div>
              </div>
            </div>
          )}

          {statsLoading ? (
            <div className="flex items-center justify-center py-16"><span className="loader" /></div>
          ) : stats.length === 0 ? (
            <div className="surface p-12 text-center">
              <p className="text-[var(--text-muted)] text-sm">No player stats available yet. Stats are recorded when match results include player data.</p>
            </div>
          ) : (
            <div className="data-table animate-slide-up">
              <div className="data-table-header" style={{ gridTemplateColumns: statsCols }}>
                {['#', 'Player', 'Team', 'Kills', 'Damage', 'K/D', 'Avg Dmg', 'Survival', 'MVP'].map((h) => (
                  <span key={h} className="text-[11px] font-display font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <div>
                {stats.map((p) => {
                  const color = p.team?.brand_color || '#7a8ba8';
                  return (
                    <div key={p.player_open_id}
                      className="data-table-row transition-colors"
                      style={{ gridTemplateColumns: statsCols }}>
                      <span className={`text-[12px] font-bold tabular-nums ${p.rank <= 3 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                        {p.rank}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[var(--text-primary)] truncate">{p.display_name}</div>
                        <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">{p.matches_played} match{p.matches_played !== 1 ? 'es' : ''}</div>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}44` }} />
                        <span className="text-[13px] text-[var(--text-secondary)] truncate">{p.team?.short_name ?? p.team?.name ?? '—'}</span>
                      </div>
                      <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{p.total_kills}</span>
                      <span className="text-sm text-[var(--text-secondary)] tabular-nums">{p.total_damage.toLocaleString()}</span>
                      <span className="text-sm text-[var(--text-secondary)] tabular-nums">{p.kd}</span>
                      <span className="text-sm text-[var(--text-secondary)] tabular-nums">{p.avg_damage}</span>
                      <span className="text-sm text-[var(--text-secondary)] tabular-nums">{p.survival_rate}%</span>
                      <span className={`text-sm font-bold tabular-nums ${p.top_fragger_count > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                        {p.top_fragger_count > 0 ? p.top_fragger_count : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
