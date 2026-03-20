'use client';

import type { StageStandings, StageWithDetails } from './_types';

type Props = {
  stageStanding: StageStandings;
  stageInfo: StageWithDetails;
};

const MEDAL: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400', label: '🥇' },
  2: { bg: 'bg-slate-400/10 border-slate-400/20', text: 'text-slate-300', label: '🥈' },
  3: { bg: 'bg-orange-700/15 border-orange-700/30', text: 'text-orange-400', label: '🥉' },
};

function TeamAvatar({ team, size = 'sm' }: {
  team: { name: string; short_name?: string | null; logo_url?: string | null; brand_color: string } | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!team) return null;
  const dim = size === 'lg' ? 'w-12 h-12 text-sm' : size === 'md' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[9px]';
  const initials = (team.short_name ?? team.name).substring(0, 2).toUpperCase();
  if (team.logo_url) {
    return <img src={team.logo_url} alt={team.name} className={`${dim} rounded-lg object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-lg flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: team.brand_color + '30', color: team.brand_color }}>
      {initials}
    </div>
  );
}

// ─── Group Stage: show each group as a mini standings column ──────────────────

function GroupBracket({ stageStanding, stageInfo }: Props) {
  const { standings } = stageStanding;
  if (stageInfo.groups.length === 0) return null;

  return (
    <div className="p-5 bg-[var(--bg-hover)] border-t border-[var(--border)]">
      <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Group Standings</div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(stageInfo.groups.length, 4)}, minmax(0, 1fr))` }}>
        {stageInfo.groups.map((group) => {
          const groupTeamIds = new Set(group.teams.map((t) => t.id));
          const groupStandings = standings
            .filter((s) => groupTeamIds.has(s.team_id))
            .sort((a, b) => a.total_pts === b.total_pts ? a.total_kills - b.total_kills : b.total_pts - a.total_pts)
            .map((s, i) => ({ ...s, groupRank: i + 1 }));

          return (
            <div key={group.id} className="surface overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-base)]">
                <span className="text-[11px] font-display font-bold uppercase tracking-widest text-[var(--text-primary)]">{group.name}</span>
                <span className="text-[10px] text-[var(--text-muted)] ml-2">{group.matches.length} matches</span>
              </div>
              {groupStandings.length === 0 ? (
                <div className="px-3 py-4 text-[11px] text-[var(--text-muted)] text-center italic">No results</div>
              ) : (
                groupStandings.map((entry) => {
                  const medal = MEDAL[entry.groupRank];
                  return (
                    <div key={entry.team_id}
                      className={`flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] last:border-0 ${medal ? medal.bg : ''}`}>
                      <span className={`text-[11px] font-bold tabular-nums w-4 flex-shrink-0 ${medal ? medal.text : 'text-[var(--text-muted)]'}`}>
                        {entry.groupRank}
                      </span>
                      <TeamAvatar team={entry.team ?? null} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                          {entry.team?.short_name ?? entry.team?.name ?? entry.team_id}
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold tabular-nums flex-shrink-0 ${medal ? medal.text : 'text-[var(--text-secondary)]'}`}>
                        {entry.total_pts}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Finals/Elimination: podium + ranked grid ─────────────────────────────────

function FinalsBracket({ stageStanding }: Props) {
  const { standings } = stageStanding;
  if (standings.length === 0) return null;

  const top3 = standings.slice(0, 3);
  const rest = standings.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean); // 2nd, 1st, 3rd

  return (
    <div className="p-5 bg-[var(--bg-hover)] border-t border-[var(--border)]">
      <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-5">Final Standings</div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 mb-6">
        {podiumOrder.map((entry) => {
          if (!entry) return null;
          const medal = MEDAL[entry.rank]!;
          const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' };
          const height = heights[entry.rank as 1 | 2 | 3] ?? 'h-16';
          return (
            <div key={entry.team_id} className="flex flex-col items-center gap-2 w-36">
              <TeamAvatar team={entry.team ?? null} size={entry.rank === 1 ? 'lg' : 'md'} />
              <div className="text-center">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[120px]">
                  {entry.team?.short_name ?? entry.team?.name ?? entry.team_id}
                </div>
                <div className={`text-lg font-black tabular-nums ${medal.text}`}>{entry.total_pts} pts</div>
                <div className="text-[10px] text-[var(--text-muted)]">{entry.total_kills} kills</div>
              </div>
              <div className={`${height} w-full rounded-t-lg border ${medal.bg} flex items-center justify-center`}>
                <span className="text-2xl">{medal.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Remaining teams */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {rest.map((entry) => (
            <div key={entry.team_id} className="surface flex items-center gap-2.5 px-3 py-2">
              <span className="text-[11px] font-bold tabular-nums text-[var(--text-muted)] w-5 flex-shrink-0">{entry.rank}</span>
              <TeamAvatar team={entry.team ?? null} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--text-primary)] truncate">{entry.team?.name ?? entry.team_id}</div>
              </div>
              <span className="text-xs font-bold text-[var(--text-secondary)] tabular-nums flex-shrink-0">{entry.total_pts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BracketView({ stageStanding, stageInfo }: Props) {
  if (stageStanding.standings.length === 0) return null;

  if (stageInfo.stage_type === 'group') {
    return <GroupBracket stageStanding={stageStanding} stageInfo={stageInfo} />;
  }

  return <FinalsBracket stageStanding={stageStanding} stageInfo={stageInfo} />;
}
