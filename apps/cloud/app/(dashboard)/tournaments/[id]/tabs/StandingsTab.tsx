'use client';

import { useTournament } from '../_context';
import BracketView from '../_bracket';
import type { StageStandings } from '../_types';

// ─── Mock data for preview when no real matches exist ─────────────────────────

const MOCK_COLORS = ['#00ffc3', '#ff4e4e', '#ffc107', '#2F6B3F', '#06b6d4', '#f97316', '#10b981', '#e879f9', '#3b82f6', '#ef4444', '#84cc16', '#f59e0b'];
const MOCK_NAMES = ['Team Alpha', 'Team Bravo', 'Nexus', 'Storm', 'Eclipse', 'Phantom', 'Vortex', 'Nova', 'Apex', 'Blaze', 'Cipher', 'Rogue'];

function buildMockStandings(teams: { id: string; name: string; short_name: string | null; logo_url: string | null }[]): StageStandings {
  const source = teams.length >= 4 ? teams : MOCK_NAMES.slice(0, 12).map((name, i) => ({
    id: `mock-${i}`,
    name,
    short_name: name.split(' ')[1]?.substring(0, 3).toUpperCase() ?? null,
    logo_url: null,
  }));

  const standings = source.map((t, i) => ({
    team_id: t.id,
    total_pts: Math.max(0, 120 - i * 8 + Math.floor(Math.random() * 6)),
    total_kills: Math.max(0, 40 - i * 2 + Math.floor(Math.random() * 6)),
    matches_played: 6,
    wins: Math.max(0, 3 - Math.floor(i / 3)),
    avg_placement: parseFloat((i + 1 + Math.random() * 0.5).toFixed(1)),
    rank: i + 1,
    team: { id: t.id, name: t.name, short_name: t.short_name, logo_url: t.logo_url },
  }));

  return { id: 'mock', name: 'Preview', stage_order: 1, matchCount: 6, standings };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StandingsTab() {
  const { stages, tournamentTeams, stageStandings, standingsLoading, standingsStageId, setStandingsStageId, fetchStandings } = useTournament();

  const hasData = stageStandings.some((s) => s.standings.length > 0);
  const mockStandings = buildMockStandings(tournamentTeams);
  const firstStage = stages[stages.length - 1]; // default to last stage for mock (likely finals)

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

      ) : !hasData ? (
        /* ── No data: show mock bracket preview ── */
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] px-2">
              Preview — no matches finished yet
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <div className="surface overflow-hidden opacity-70">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-display font-bold text-[var(--text-primary)]">
                  {firstStage?.name ?? 'Grand Finals'} <span className="text-[var(--text-muted)] font-normal text-xs ml-1">(mock)</span>
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Bracket will populate as matches finish</p>
              </div>
              <span className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-dashed border-[var(--border)] text-[var(--text-muted)]">
                demo
              </span>
            </div>

            {/* Mock standings table */}
            <div>
              <div className="grid px-5 py-2 border-b border-[var(--border)] bg-[var(--bg-hover)]" style={{ gridTemplateColumns: '40px 1.5fr repeat(5, 80px)' }}>
                {['#', 'Team', 'Points', 'Kills', 'Wins', 'Avg Place', 'Played'].map((h) => (
                  <span key={h} className="text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest">{h}</span>
                ))}
              </div>
              {mockStandings.standings.slice(0, 6).map((entry, i) => (
                <div key={entry.team_id}
                  className={`grid px-5 py-3 items-center ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}
                  style={{ gridTemplateColumns: '40px 1.5fr repeat(5, 80px)' }}>
                  <span className={`text-sm font-bold tabular-nums ${entry.rank <= 3 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{entry.rank}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded flex-shrink-0" style={{ background: '#2F6B3F' }} />
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.team?.name ?? '—'}</span>
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{entry.total_pts}</span>
                  <span className="text-sm text-[var(--text-secondary)] tabular-nums">{entry.total_kills}</span>
                  <span className="text-sm text-[var(--text-secondary)] tabular-nums">{entry.wins}</span>
                  <span className="text-sm text-[var(--text-secondary)] tabular-nums">{entry.avg_placement}</span>
                  <span className="text-sm text-[var(--text-muted)] tabular-nums">{entry.matches_played}</span>
                </div>
              ))}
            </div>

            {/* Mock bracket visual */}
            <BracketView stageStanding={mockStandings} stageInfo={firstStage ?? { id: 'mock', stage_type: 'finals', groups: [], matches: [], name: 'Finals', stage_order: 1, status: 'pending', auto_advance: false, teams_expected: null, map_rotation: null, advancing_count: null, invitational_count: 0, match_count: null, tournament_id: '', created_at: '' }} />
          </div>
        </div>

      ) : (
        /* ── Real data ── */
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
                      borderColor: stageInfo.stage_type === 'group' ? 'var(--accent-border)' : 'transparent',
                    }}>
                    {stageInfo.stage_type}
                  </span>
                )}
              </div>

              {stageStanding.standings.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">No results for this stage.</div>
              ) : (
                <>
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
                          {!entry.team?.logo_url && entry.team && <div className="w-6 h-6 rounded flex-shrink-0" style={{ background: '#2F6B3F' }} />}
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
                  {stageInfo && <BracketView stageStanding={stageStanding} stageInfo={stageInfo} />}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
