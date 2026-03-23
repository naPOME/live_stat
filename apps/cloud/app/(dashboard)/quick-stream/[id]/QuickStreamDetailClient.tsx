'use client';

import { useState } from 'react';
import Link from 'next/link';

type Match = { id: string; name: string; status: string; created_at: string };
type Result = { match_id: string; slot_number: number | null; in_game_team_name: string | null; team_id: string | null; placement: number; kill_count: number; total_pts: number };
type PlayerResult = { match_id: string; player_open_id: string; in_game_name: string | null; kills: number; damage: number; damage_taken: number; headshots: number; assists: number; knockouts: number; survived: boolean };

type Props = {
  session: { id: string; name: string; status: string; created_at: string; api_key: string };
  stageId: string;
  matches: Match[];
  results: Result[];
  playerResults: PlayerResult[];
};

export default function QuickStreamDetailClient({ session, stageId, matches, results, playerResults }: Props) {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const finishedCount = matches.filter(m => m.status === 'finished').length;
  const allDone = finishedCount === matches.length && matches.length > 0;

  async function downloadExport() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/export-quick-stream/${session.id}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.name.replace(/[^a-zA-Z0-9._-]/g, '_')}_export.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setDownloading(false);
  }

  function getMatchResults(matchId: string) {
    return results.filter(r => r.match_id === matchId);
  }

  function getMatchPlayerResults(matchId: string) {
    return playerResults.filter(r => r.match_id === matchId);
  }

  return (
    <div className="max-w-[900px] page-enter">
      {/* Back link */}
      <Link href="/quick-stream" className="inline-flex items-center gap-1.5 text-[var(--text-muted)] text-sm mb-6 hover:text-[var(--text-secondary)] transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to Sessions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)]">{session.name}</h1>
            <span className={`text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              allDone
                ? 'text-[var(--accent)] border-[var(--accent-border)] bg-[var(--accent-soft)]'
                : 'text-[var(--text-muted)] border-[var(--border)]'
            }`}>
              {allDone ? 'Completed' : `${finishedCount}/${matches.length} played`}
            </span>
          </div>
          <p className="text-[var(--text-muted)] text-sm">
            {new Date(session.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {' · '}{matches.length} game{matches.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={downloadExport}
          disabled={downloading}
          className="btn-primary inline-flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v8M4 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {downloading ? 'Downloading...' : 'Download Config'}
        </button>
      </div>

      {/* Matches */}
      <div className="space-y-3">
        {matches.map((match) => {
          const matchResults = getMatchResults(match.id);
          const matchPlayers = getMatchPlayerResults(match.id);
          const isFinished = match.status === 'finished';
          const isExpanded = expandedMatch === match.id;

          return (
            <div key={match.id} className="surface overflow-hidden">
              <button
                onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold ${
                  isFinished
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                }`}>
                  {isFinished ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    match.name.replace('Game ', '')
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-medium text-[var(--text-primary)]">{match.name}</span>
                  {isFinished && matchResults.length > 0 && (
                    <span className="text-[12px] text-[var(--text-muted)] ml-3">
                      {matchResults.length} teams
                    </span>
                  )}
                </div>

                <span className={`text-[11px] font-display font-bold uppercase tracking-wider ${
                  isFinished ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                }`}>
                  {match.status}
                </span>

                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                  className={`text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Expanded results */}
              {isExpanded && isFinished && matchResults.length > 0 && (
                <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 animate-slide-down">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-display font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        <th className="text-left py-2 w-12">#</th>
                        <th className="text-left py-2">Team</th>
                        <th className="text-right py-2 w-16">Kills</th>
                        <th className="text-right py-2 w-16">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchResults.map((r, i) => (
                        <tr key={i} className="border-t border-[var(--border)]">
                          <td className="py-2 text-[13px] font-mono text-[var(--text-muted)] tabular-nums">
                            {r.placement}
                          </td>
                          <td className="py-2 text-[13px] font-medium text-[var(--text-primary)]">
                            {r.in_game_team_name ?? `Team ${r.slot_number ?? '?'}`}
                          </td>
                          <td className="py-2 text-[13px] text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {r.kill_count}
                          </td>
                          <td className="py-2 text-[13px] text-right font-mono font-bold tabular-nums text-[var(--text-primary)]">
                            {r.total_pts}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Player stats */}
                  {matchPlayers.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[var(--border)]">
                      <div className="text-[10px] font-display font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        Top Fraggers
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {matchPlayers.slice(0, 6).map((p, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)]">
                            <span className="text-[11px] font-mono font-bold text-[var(--accent)] w-5">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                                {p.in_game_name ?? p.player_open_id.slice(0, 12)}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)]">
                                {p.kills}K · {p.damage}D · {p.headshots}HS
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Expanded but no results */}
              {isExpanded && (!isFinished || matchResults.length === 0) && (
                <div className="border-t border-[var(--border)] px-4 py-6 text-center text-[13px] text-[var(--text-muted)] animate-slide-down">
                  {isFinished ? 'No results synced for this game.' : 'Game not played yet. Results will appear after the match ends.'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
