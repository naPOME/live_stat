'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StageWithDetails, StandingEntry } from '../_types';

type Props = {
  stage: StageWithDetails;
  nextStage: StageWithDetails | null;
  standings: StandingEntry[];
  advancingCount: number;
  onConfirm: (advancingTeamIds: string[]) => void;
  onCancel: () => void;
};

export default function AdvancingTeamsModal({ stage, nextStage, standings, advancingCount, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Auto-select top N teams on open
  useEffect(() => {
    const topTeams = standings.slice(0, advancingCount).map(s => s.team_id);
    setSelected(new Set(topTeams));
  }, [standings, advancingCount]);

  const toggleTeam = useCallback((teamId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }, []);

  const selectTopN = useCallback((n: number) => {
    const topTeams = standings.slice(0, n).map(s => s.team_id);
    setSelected(new Set(topTeams));
  }, [standings]);

  function handleConfirm() {
    setAnimating(true);
    // Brief animation pause, then confirm
    setTimeout(() => {
      setConfirmed(true);
      setTimeout(() => {
        onConfirm(Array.from(selected));
      }, 800);
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col animate-scale-in">
        <div className="surface rounded-2xl overflow-hidden border border-[var(--border-hover)] shadow-[var(--shadow-elevated)] flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-8 pt-8 pb-5 border-b border-[var(--border)] bg-gradient-to-b from-[var(--bg-elevated)] to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--amber)] mb-1">Complete Stage</div>
                <h2 className="text-xl font-display font-black text-[var(--text-primary)]">{stage.name}</h2>
              </div>
              <button onClick={onCancel} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Summary bar */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[var(--text-secondary)]">
                  <span className="font-bold text-[var(--text-primary)]">{selected.size}</span> teams selected
                </span>
              </div>
              {nextStage && (
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--accent)]">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-[var(--text-secondary)]">
                    Advancing to <span className="font-bold text-[var(--accent)]">{nextStage.name}</span>
                  </span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Quick select</span>
                {[8, 12, 16, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => selectTopN(n)}
                    disabled={n > standings.length}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      selected.size === n && standings.slice(0, n).every(s => selected.has(s.team_id))
                        ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Standings table */}
          <div className="flex-1 overflow-y-auto px-8 py-4">
            <div className="space-y-1">
              {standings.map((entry, i) => {
                const isQualified = selected.has(entry.team_id);
                const justAdvanced = confirmed && isQualified;
                const justEliminated = confirmed && !isQualified;

                return (
                  <div
                    key={entry.team_id}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-500 ${
                      justAdvanced
                        ? 'bg-emerald-500/10 border border-emerald-500/30 translate-y-0 scale-100 opacity-100'
                        : justEliminated
                          ? 'opacity-20 scale-[0.98] translate-y-1'
                          : animating && isQualified
                            ? 'bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                            : isQualified
                              ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/15 hover:border-[var(--accent)]/30'
                              : 'bg-transparent border border-transparent hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {/* Rank */}
                    <span className={`w-7 text-center text-sm font-black tabular-nums ${
                      i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-[var(--text-muted)]'
                    }`}>
                      {entry.rank ?? i + 1}
                    </span>

                    {/* Qualified toggle */}
                    <button
                      onClick={() => toggleTeam(entry.team_id)}
                      disabled={animating}
                      className={`w-10 h-6 rounded-full relative transition-all duration-300 flex-shrink-0 ${
                        isQualified
                          ? 'bg-emerald-500/30 border border-emerald-500/40'
                          : 'bg-[var(--bg-base)] border border-[var(--border)]'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
                        isQualified
                          ? 'left-[18px] bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                          : 'left-0.5 bg-[var(--text-muted)]'
                      }`} />
                    </button>

                    {/* Team info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {entry.team?.logo_url ? (
                        <img src={entry.team.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: (entry.team?.brand_color ?? '#666') + '30', color: entry.team?.brand_color ?? '#666' }}>
                          {(entry.team?.short_name ?? entry.team?.name ?? '??').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {entry.team?.name ?? 'Unknown Team'}
                        </div>
                        {entry.team?.short_name && (
                          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{entry.team.short_name}</div>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-[var(--text-primary)] tabular-nums">{entry.total_pts}</div>
                        <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">pts</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[var(--text-primary)] tabular-nums">{entry.total_kills}</div>
                        <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">kills</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[var(--text-primary)] tabular-nums">{entry.wins}</div>
                        <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">wins</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[var(--text-primary)] tabular-nums">{entry.avg_placement}</div>
                        <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">avg</div>
                      </div>
                      <div className="text-right w-14">
                        <div className="text-xs tabular-nums text-[var(--text-muted)]">{entry.matches_played}m</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {standings.length === 0 && (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <div className="text-lg mb-2">No results yet</div>
                <div className="text-sm">Complete some matches before ending this stage.</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-[var(--border)] bg-[var(--bg-elevated)] flex items-center justify-between">
            <div className="text-[12px] text-[var(--text-muted)]">
              {selected.size === 0 ? (
                <span className="text-[var(--amber)]">Select at least one team to advance</span>
              ) : !nextStage ? (
                <span>This is the final stage. Completing it will finalize the tournament.</span>
              ) : (
                <span>{selected.size} team{selected.size !== 1 ? 's' : ''} will be placed in <strong className="text-[var(--text-primary)]">{nextStage.name}</strong></span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onCancel} disabled={animating}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={animating || selected.size === 0}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  animating
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-wait'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {animating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3"/><path d="M12 2a10 10 0 019.8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Advancing teams…
                  </span>
                ) : confirmed ? (
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Done!
                  </span>
                ) : (
                  `Complete Stage & Advance ${selected.size} Team${selected.size !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
