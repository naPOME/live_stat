'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

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

export default function MatchesClient({ initialMatches, initialStages, initialTournaments }: MatchesClientProps) {
  const [matches] = useState<MatchRow[]>(initialMatches);
  const [tab, setTab] = useState<Tab>('list');

  const stageMap = useMemo(
    () => new Map(initialStages.map((s) => [s.id, s])),
    [initialStages],
  );
  const tournamentMap = useMemo(
    () => new Map(initialTournaments.map((t) => [t.id, t])),
    [initialTournaments],
  );

  const liveCount = matches.filter((m) => m.status === 'live').length;
  const finishedCount = matches.filter((m) => m.status === 'finished').length;
  const scheduledMatches = matches
    .filter((m) => m.scheduled_at && m.status === 'pending')
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  const unscheduledPending = matches.filter((m) => !m.scheduled_at && m.status === 'pending');

  // Group scheduled matches by date
  const scheduleByDate = new Map<string, MatchRow[]>();
  for (const m of scheduledMatches) {
    const dateKey = new Date(m.scheduled_at!).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    if (!scheduleByDate.has(dateKey)) scheduleByDate.set(dateKey, []);
    scheduleByDate.get(dateKey)!.push(m);
  }

  function countdown(scheduledAt: string): string | null {
    const diff = new Date(scheduledAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  }

  function matchLink(match: MatchRow): string {
    const stage = stageMap.get(match.stage_id);
    return `/tournaments/${stage?.tournament_id}/stages/${match.stage_id}/matches/${match.id}`;
  }

  const cols = '40px 1.2fr 1.2fr 90px 110px';

  return (
    <div className="p-10 max-w-[1100px] page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Matches</h1>
        <p className="text-[var(--text-secondary)] text-sm font-body">All matches across your tournaments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8 stagger">
        {[
          { label: 'Total', value: matches.length, cls: 'text-[var(--accent)]' },
          { label: 'Live', value: liveCount, cls: 'text-[var(--red)]' },
          { label: 'Finished', value: finishedCount, cls: 'text-[var(--text-muted)]' },
          { label: 'Scheduled', value: scheduledMatches.length, cls: 'text-[var(--accent)]' },
        ].map((s) => (
          <div key={s.label} className="surface-elevated rounded-xl p-5">
            <div className={`stat-number text-3xl mb-1 ${s.cls}`}>{s.value}</div>
            <div className="text-[var(--text-muted)] text-[11px] font-display uppercase tracking-widest font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-[var(--border)]">
        {(['list', 'schedule'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
              tab === t ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="relative z-10 block translate-y-px">
              {t === 'list' ? 'All Matches' : 'Schedule'}
            </span>
            {tab === t && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent)]" />}
          </button>
        ))}
      </div>

      {matches.length === 0 ? (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center relative overflow-hidden flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                <rect x="3" y="3" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
                <path d="M3 10H23" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
                <path d="M10 10V23" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Matches Yet</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Add matches within tournament stages to start tracking results.</p>
            <Link href="/tournaments" className="btn-primary">Go to Tournaments</Link>
          </div>
        </div>
      ) : (
        <>
          {/* List Tab */}
          {tab === 'list' && (
            <div className="data-table animate-slide-up">
              <div className="data-table-header" style={{ gridTemplateColumns: cols }}>
                {['#', 'Match', 'Tournament / Stage', 'Map', 'Status'].map((h) => (
                  <span key={h} className="text-[11px] font-display font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <div>
                {matches.map((match, i) => {
                  const stage = stageMap.get(match.stage_id);
                  const tournament = stage ? tournamentMap.get(stage.tournament_id) : null;
                  const statusStyle = match.status === 'live'
                    ? 'text-[var(--red)]'
                    : match.status === 'finished'
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-muted)]';
                  const cd = match.scheduled_at && match.status === 'pending' ? countdown(match.scheduled_at) : null;
                  return (
                    <Link key={match.id}
                      href={matchLink(match)}
                      className="data-table-row group transition-colors"
                      style={{ gridTemplateColumns: cols }}>
                      <span className="text-[12px] font-mono text-[var(--text-muted)] tabular-nums">{i + 1}</span>
                      <div className="min-w-0">
                        <span className="text-[14px] font-medium text-[var(--text-primary)] truncate block group-hover:text-white transition-colors">{match.name}</span>
                        {cd && <span className="text-[10px] text-[var(--accent)] font-mono">{cd}</span>}
                        {!cd && match.scheduled_at && match.status === 'pending' && (
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            {new Date(match.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <span className="text-[13px] text-[var(--text-muted)] truncate">{tournament?.name ?? '—'} / {stage?.name ?? '—'}</span>
                      <span className="text-[13px] text-[var(--text-secondary)]">{match.map_name || '—'}</span>
                      <span className={`text-[11px] font-display font-bold uppercase tracking-widest ${statusStyle}`}>
                        {match.status === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--red)] mr-1.5" />}
                        {match.status === 'finished' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1.5" />}
                        {match.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {tab === 'schedule' && (
            <div className="space-y-6 animate-fade-in">
              {scheduleByDate.size === 0 && unscheduledPending.length === 0 ? (
                <div className="surface p-12 text-center">
                  <p className="text-[var(--text-muted)] text-sm">No pending matches. Schedule matches from the match detail page.</p>
                </div>
              ) : (
                <>
                  {/* Timeline by date */}
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
                            <Link key={match.id} href={matchLink(match)}
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
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Unscheduled */}
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
                            <Link key={match.id} href={matchLink(match)}
                              className="surface flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors group">
                              <div className="flex items-center gap-4 min-w-0">
                                <span className="text-sm font-mono text-[var(--text-muted)] w-14 flex-shrink-0">--:--</span>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{match.name}</div>
                                  <div className="text-[11px] text-[var(--text-muted)] truncate">{tournament?.name} / {stage?.name}{match.map_name ? ` — ${match.map_name}` : ''}</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">No date set</span>
                            </Link>
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
