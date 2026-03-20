'use client';

import { useTournament } from '../_context';
import BracketView from '../_bracket';

export default function StandingsTab() {
  const { stages, stageStandings, standingsLoading, standingsStageId, setStandingsStageId, fetchStandings } = useTournament();

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      <div className="flex items-center gap-4">
        <select
          value={standingsStageId}
          onChange={(e) => { setStandingsStageId(e.target.value); fetchStandings(e.target.value); }}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="all">All Stages</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={() => fetchStandings(standingsStageId)} className="btn-ghost py-2 text-xs">Refresh</button>
      </div>

      {standingsLoading ? (
        <div className="flex items-center justify-center py-16"><span className="loader" /></div>
      ) : stageStandings.length === 0 ? (
        <div className="surface p-12 text-center">
          <p className="text-[var(--text-muted)] text-sm">No finished matches yet. Standings appear after match results are submitted.</p>
        </div>
      ) : (
        stageStandings.map((stageStanding) => {
          const stageInfo = stages.find((s) => s.id === stageStanding.id);
          return (
            <div key={stageStanding.id} className="surface overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display font-bold text-[var(--text-primary)]">{stageStanding.name}</h3>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{stageStanding.matchCount} match{stageStanding.matchCount !== 1 ? 'es' : ''} completed</p>
                </div>
                {stageInfo && (
                  <span className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                    style={{
                      color: stageInfo.stage_type === 'group' ? 'var(--accent)' : stageInfo.stage_type === 'finals' ? 'var(--red)' : 'var(--amber)',
                      borderColor: stageInfo.stage_type === 'group' ? 'var(--accent-border)' : stageInfo.stage_type === 'finals' ? 'color-mix(in srgb, var(--red) 30%, transparent)' : 'color-mix(in srgb, var(--amber) 30%, transparent)',
                    }}>
                    {stageInfo.stage_type}
                  </span>
                )}
              </div>

              {stageStanding.standings.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">No results for this stage.</div>
              ) : (
                <>
                  {/* Standings table */}
                  <div>
                    <div className="grid px-5 py-2 border-b border-[var(--border)] bg-[var(--bg-hover)]" style={{ gridTemplateColumns: '40px 1.5fr repeat(5, 80px)' }}>
                      {['#', 'Team', 'Points', 'Kills', 'Wins', 'Avg Place', 'Played'].map((h) => (
                        <span key={h} className="text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest">{h}</span>
                      ))}
                    </div>
                    {stageStanding.standings.map((entry, i) => (
                      <div key={entry.team_id}
                        className={`grid px-5 py-3 items-center transition-colors hover:bg-[var(--bg-hover)] ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}
                        style={{ gridTemplateColumns: '40px 1.5fr repeat(5, 80px)' }}>
                        <span className={`text-sm font-bold tabular-nums ${entry.rank <= 3 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{entry.rank}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          {entry.team?.logo_url && <img src={entry.team.logo_url} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />}
                          {!entry.team?.logo_url && entry.team && <div className="w-6 h-6 rounded flex-shrink-0" style={{ background: entry.team.brand_color }} />}
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.team?.name ?? entry.team_id}</span>
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{entry.total_pts}</span>
                        <span className="text-sm text-[var(--text-secondary)] tabular-nums">{entry.total_kills}</span>
                        <span className="text-sm text-[var(--text-secondary)] tabular-nums">{entry.wins}</span>
                        <span className="text-sm text-[var(--text-secondary)] tabular-nums">{entry.avg_placement}</span>
                        <span className="text-sm text-[var(--text-muted)] tabular-nums">{entry.matches_played}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bracket / visual view */}
                  {stageInfo && (
                    <BracketView stageStanding={stageStanding} stageInfo={stageInfo} />
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
