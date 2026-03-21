'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/DataTable';

const HERO_BG = 'https://a-static.besthdwallpaper.com/playerunknown-s-battlegrounds-pubg-mobile-battle-in-mad-miramar-wallpaper-2560x1080-63448_14.jpg';

type MatchRow = {
  id: string;
  stage_id: string;
  name: string;
  map_name: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
};

type StageRow = { id: string; name: string; tournament_id: string };
type TournamentRow = { id: string; name: string };
type Tab = 'list' | 'schedule';

type MatchesClientProps = {
  initialMatches: MatchRow[];
  initialStages: StageRow[];
  initialTournaments: TournamentRow[];
};

function countdown(scheduledAt: string): string | null {
  const diff = new Date(scheduledAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

export default function MatchesClient({ initialMatches, initialStages, initialTournaments }: MatchesClientProps) {
  const [tab, setTab] = useState<Tab>('list');

  const stageMap = useMemo(() => new Map(initialStages.map((s) => [s.id, s])), [initialStages]);
  const tournamentMap = useMemo(() => new Map(initialTournaments.map((t) => [t.id, t])), [initialTournaments]);

  const liveCount = initialMatches.filter((m) => m.status === 'live').length;
  const finishedCount = initialMatches.filter((m) => m.status === 'finished').length;
  const scheduledMatches = initialMatches
    .filter((m) => m.scheduled_at && m.status === 'pending')
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  const unscheduledPending = initialMatches.filter((m) => !m.scheduled_at && m.status === 'pending');

  const scheduleByDate = new Map<string, MatchRow[]>();
  for (const m of scheduledMatches) {
    const dateKey = new Date(m.scheduled_at!).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
    if (!scheduleByDate.has(dateKey)) scheduleByDate.set(dateKey, []);
    scheduleByDate.get(dateKey)!.push(m);
  }

  function matchLink(match: MatchRow): string {
    const stage = stageMap.get(match.stage_id);
    return `/tournaments/${stage?.tournament_id}/stages/${match.stage_id}/matches/${match.id}`;
  }

  const columns = useMemo<ColumnDef<MatchRow, unknown>[]>(() => [
    {
      id: 'index',
      header: '#',
      meta: { width: '44px' },
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-[12px] font-mono text-[var(--text-muted)] tabular-nums">
          {row.index + 1}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Match',
      meta: { width: '1.5fr' },
      cell: ({ row }) => {
        const m = row.original;
        const cd = m.scheduled_at && m.status === 'pending' ? countdown(m.scheduled_at) : null;
        return (
          <div className="min-w-0">
            <span className="text-[14px] font-medium text-[var(--text-primary)] truncate block group-hover:text-white transition-colors">
              {m.name}
            </span>
            {cd && <span className="text-[10px] text-[var(--accent)] font-mono">{cd}</span>}
            {!cd && m.scheduled_at && m.status === 'pending' && (
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {new Date(m.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'tournament',
      header: 'Tournament / Stage',
      meta: { width: '1.5fr' },
      enableSorting: false,
      accessorFn: (m) => {
        const stage = stageMap.get(m.stage_id);
        const tournament = stage ? tournamentMap.get(stage.tournament_id) : null;
        return `${tournament?.name ?? ''} ${stage?.name ?? ''}`;
      },
      cell: ({ row }) => {
        const m = row.original;
        const stage = stageMap.get(m.stage_id);
        const tournament = stage ? tournamentMap.get(stage.tournament_id) : null;
        return (
          <span className="text-[13px] text-[var(--text-muted)] truncate">
            {tournament?.name ?? '—'} / {stage?.name ?? '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'map_name',
      header: 'Map',
      meta: { width: '100px' },
      cell: ({ getValue }) => (
        <span className="text-[13px] text-[var(--text-secondary)]">{(getValue() as string | null) || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { width: '100px' },
      cell: ({ getValue }) => {
        const s = getValue() as string;
        const color = s === 'live' ? 'var(--red)' : s === 'finished' ? 'var(--accent)' : 'var(--text-muted)';
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color }}>
            {(s === 'live' || s === 'finished') && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            )}
            {s}
          </span>
        );
      },
    },
  ], [stageMap, tournamentMap]);

  return (
    <div className="max-w-[1100px] page-enter">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl mb-10"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          minHeight: 240,
        }}>
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.92) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col justify-end p-8 pt-16" style={{ minHeight: 240 }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
            Match Overview
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white leading-none mb-6">Matches</h1>
          <div className="flex items-end gap-10">
            {[
              { label: 'Total', value: initialMatches.length, color: 'white' },
              { label: 'Live', value: liveCount, color: 'var(--red)' },
              { label: 'Finished', value: finishedCount, color: 'var(--accent)' },
              { label: 'Scheduled', value: scheduledMatches.length, color: 'rgba(255,255,255,0.5)' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="text-4xl font-black tabular-nums leading-none" style={{ color }}>{value}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/35 mt-1.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        {(['list', 'schedule'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
              tab === t ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}>
            <span className="relative z-10 block translate-y-px">
              {t === 'list' ? 'All Matches' : 'Schedule'}
            </span>
            {tab === t && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent)]" />}
          </button>
        ))}
      </div>

      {initialMatches.length === 0 ? (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <rect x="3" y="3" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
                <path d="M3 10H23" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
                <path d="M10 10V23" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">No Matches Yet</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Add matches within tournament stages to start tracking results.</p>
            <a href="/tournaments" className="btn-primary">Go to Tournaments</a>
          </div>
        </div>
      ) : (
        <>
          {tab === 'list' && (
            <div className="animate-slide-up">
              <DataTable
                columns={columns}
                data={initialMatches}
                pageSize={20}
                getRowHref={matchLink}
              />
            </div>
          )}

          {tab === 'schedule' && (
            <div className="space-y-6 animate-fade-in">
              {scheduleByDate.size === 0 && unscheduledPending.length === 0 ? (
                <div className="surface p-12 text-center">
                  <p className="text-[var(--text-muted)] text-sm">No pending matches. Schedule matches from the match detail page.</p>
                </div>
              ) : (
                <>
                  {[...scheduleByDate.entries()].map(([dateKey, dayMatches]) => (
                    <div key={dateKey}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <h3 className="text-sm font-display font-bold text-[var(--text-primary)]">{dateKey}</h3>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                        <span className="text-[10px] text-[var(--text-muted)]">{dayMatches.length} match{dayMatches.length !== 1 ? 'es' : ''}</span>
                      </div>
                      <div className="ml-4 border-l-2 border-[var(--border)] pl-5 space-y-2">
                        {dayMatches.map((match) => {
                          const stage = stageMap.get(match.stage_id);
                          const tournament = stage ? tournamentMap.get(stage.tournament_id) : null;
                          const time = new Date(match.scheduled_at!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                          const cd = countdown(match.scheduled_at!);
                          return (
                            <a key={match.id} href={matchLink(match)}
                              className="surface flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors group">
                              <div className="flex items-center gap-4 min-w-0">
                                <span className="text-sm font-mono text-[var(--accent)] w-14 flex-shrink-0">{time}</span>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{match.name}</div>
                                  <div className="text-[11px] text-[var(--text-muted)] truncate">{tournament?.name} / {stage?.name}{match.map_name ? ` — ${match.map_name}` : ''}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {cd && <span className="text-xs text-[var(--accent)] font-mono font-medium">{cd}</span>}
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{match.status}</span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {unscheduledPending.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
                        <h3 className="text-sm font-display font-bold text-[var(--text-muted)]">Unscheduled</h3>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                        <span className="text-[10px] text-[var(--text-muted)]">{unscheduledPending.length} match{unscheduledPending.length !== 1 ? 'es' : ''}</span>
                      </div>
                      <div className="ml-4 border-l-2 border-[var(--border)] pl-5 space-y-2">
                        {unscheduledPending.map((match) => {
                          const stage = stageMap.get(match.stage_id);
                          const tournament = stage ? tournamentMap.get(stage.tournament_id) : null;
                          return (
                            <a key={match.id} href={matchLink(match)}
                              className="surface flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors group">
                              <div className="flex items-center gap-4 min-w-0">
                                <span className="text-sm font-mono text-[var(--text-muted)] w-14 flex-shrink-0">--:--</span>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{match.name}</div>
                                  <div className="text-[11px] text-[var(--text-muted)] truncate">{tournament?.name} / {stage?.name}{match.map_name ? ` — ${match.map_name}` : ''}</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">No date set</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
