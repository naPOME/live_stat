'use client';

import { useState } from 'react';
import { useTournament } from '../_context';

export default function OverviewTab() {
  const {
    tournament, tournamentId, stages, tournamentTeams, pointSystem,
    totalMatches, liveMatches, finishedMatches,
    setupSteps, completedSteps, setupProgress, nextAction,
    setActiveTab, linkCopied, copyRegistrationLink,
    updateTeamSeed, autoSeedTeams,
  } = useTournament();

  const [editingSeedFor, setEditingSeedFor] = useState<string | null>(null);
  const [seedInput, setSeedInput] = useState('');

  if (!tournament) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      {/* ─── Setup Checklist ─── */}
      <div className="surface p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)] mb-1">Tournament Setup</h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              {setupProgress === 100 ? 'All set — your tournament is ready to go!' : `${completedSteps} of ${setupSteps.length} steps complete`}
            </p>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${setupProgress === 100 ? 'text-emerald-400' : 'text-[var(--accent)]'}`}>
            {setupProgress}%
          </div>
        </div>

        <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden mb-5">
          <div className={`h-full rounded-full transition-all duration-500 ${setupProgress === 100 ? 'bg-emerald-400' : 'bg-[var(--accent)]'}`} style={{ width: `${setupProgress}%` }} />
        </div>

        <div className="space-y-1">
          {setupSteps.map((step) => (
            <div key={step.key} className={`flex items-start gap-3 px-4 py-3 rounded-lg transition-colors ${step.done ? 'bg-transparent' : 'bg-[var(--bg-hover)]'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${step.done ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-[var(--bg-base)] border-[var(--border)]'}`}>
                {step.done
                  ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${step.done ? 'text-[var(--text-secondary)] line-through decoration-[var(--border)]' : 'text-[var(--text-primary)]'}`}>{step.label}</div>
                <div className="text-[12px] text-[var(--text-muted)] mt-0.5">{step.description}</div>
              </div>
              {step.action && !step.done && (
                <button onClick={step.action} className="btn-primary text-xs px-3 py-1.5 flex-shrink-0 mt-0.5">{step.actionLabel}</button>
              )}
            </div>
          ))}
        </div>

        {nextAction && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse flex-shrink-0" />
            <span className="text-[13px] text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Next:</span> {nextAction.description}
            </span>
            {nextAction.action && (
              <button onClick={nextAction.action} className="text-xs font-medium text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors ml-auto flex-shrink-0">
                {nextAction.actionLabel} &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Stats ─── */}
      <div className="flex items-center gap-10 px-6 py-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
        {[
          { label: 'Teams', value: tournamentTeams.length, sub: tournament.target_team_count ? `/ ${tournament.target_team_count} target` : '', color: 'var(--text-primary)' },
          { label: 'Stages', value: stages.length, sub: stages.filter((s) => s.status === 'completed').length > 0 ? `${stages.filter((s) => s.status === 'completed').length} done` : '', color: 'var(--text-primary)' },
          { label: 'Matches', value: totalMatches, sub: finishedMatches > 0 ? `${finishedMatches} finished` : '', color: 'var(--text-primary)' },
          { label: 'Live Now', value: liveMatches, sub: liveMatches > 0 ? 'In progress' : 'None active', color: liveMatches > 0 ? 'var(--red)' : 'var(--text-muted)' },
        ].map((stat, i) => (
          <div key={stat.label} className="flex items-center gap-10">
            {i > 0 && <div className="w-px h-8 bg-[var(--border)]" />}
            <div>
              <div className="text-2xl font-black tabular-nums leading-none" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1">{stat.label}{stat.sub ? ` · ${stat.sub}` : ''}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── API Key + Registration ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-1.5 bg-[var(--text-primary)]" />
            <span className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)]">Cloud API Key</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[13px] text-[var(--accent)] font-mono truncate">
              {tournament.api_key}
            </code>
            <button onClick={() => navigator.clipboard.writeText(tournament.api_key)}
              className="flex-shrink-0 text-xs font-display font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] bg-[var(--bg-hover)] hover:bg-[var(--bg-elevated)] px-4 py-2.5 rounded-lg transition-all">
              Copy
            </button>
          </div>
        </div>
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${tournament.registration_open ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />
              <span className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)]">Registration</span>
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${tournament.registration_open ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border)]'}`}>
              {tournament.registration_open ? 'Open' : 'Closed'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[13px] text-[var(--accent)] font-mono truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}/apply/${tournamentId}` : `/apply/${tournamentId}`}
            </code>
            <button onClick={copyRegistrationLink}
              className={`flex-shrink-0 text-xs font-display font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all border ${
                linkCopied ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--border)] bg-[var(--bg-hover)] hover:bg-[var(--bg-elevated)]'
              }`}>
              {linkCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Point System ─── */}
      {pointSystem && (
        <div className="surface p-6">
          <div className="flex justify-between items-start mb-6 pb-4 border-b border-[var(--border)]">
            <div>
              <h2 className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)] mb-1">Point System</h2>
              <div className="text-[13px] text-[var(--text-secondary)]">{pointSystem.name}</div>
            </div>
            <div className="bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 px-3 py-1.5 rounded text-xs font-display font-bold uppercase tracking-widest">
              {pointSystem.kill_points} pt / kill
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const placements = pointSystem.placement_points as Record<string, number> | number[] | null;
              const ordinals = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th+'];
              const entries: { rank: string; pts: number }[] = [];
              if (Array.isArray(placements)) {
                ordinals.forEach((rank, i) => entries.push({ rank, pts: placements[i + 1] ?? 0 }));
              } else if (placements && typeof placements === 'object') {
                ordinals.forEach((rank, i) => entries.push({ rank, pts: placements[String(i + 1)] ?? 0 }));
              } else {
                [10,6,5,4,3,2,1,1,0].forEach((pts, i) => entries.push({ rank: ordinals[i], pts }));
              }
              return entries.map(({ rank, pts }) => (
                <div key={rank} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 text-center min-w-[60px]">
                  <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1">{rank}</div>
                  <div className={`text-base font-display font-black ${pts > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{pts}</div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ─── Stage Pipeline ─── */}
      <div className="surface p-6">
        <h2 className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)] mb-5">Stage Pipeline</h2>
        {stages.length > 0 ? (
          <div className="relative">
            {stages.length > 1 && <div className="absolute left-[15px] top-8 bottom-8 w-[1px] bg-[var(--border)]" />}
            <div className="space-y-3">
              {stages.map((stage, i) => {
                const stageMatchCount = stage.matches.length;
                const stageFinished = stage.matches.filter((m) => m.status === 'finished').length;
                const stageLive = stage.matches.filter((m) => m.status === 'live').length;
                const totalTeamsInGroups = stage.groups.reduce((sum, g) => sum + g.teams.length, 0);
                const totalGroupSlots = stage.groups.reduce((sum, g) => sum + (g.team_count || 0), 0);
                const matchProgress = stageMatchCount > 0 ? Math.round((stageFinished / stageMatchCount) * 100) : 0;
                const typeLabel = stage.stage_type === 'group' ? 'GROUP' : stage.stage_type === 'elimination' ? 'ELIM' : 'FINALS';
                const isActive = stage.status === 'active';
                const isDone = stage.status === 'completed';
                return (
                  <div key={stage.id} className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border relative z-10 ${isDone ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : isActive ? 'bg-[var(--accent)]/15 border-[var(--accent-border)] text-[var(--accent)]' : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)]'}`}>
                      {isDone ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : (i + 1)}
                    </div>
                    <div className={`flex-1 min-w-0 rounded-xl border px-4 py-3 transition-colors ${isActive ? 'border-[var(--accent-border)] bg-[var(--accent)]/5' : isDone ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold truncate text-[var(--text-secondary)]">{stage.name}</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] flex-shrink-0">{typeLabel}</span>
                          {isActive && <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent-border)] flex-shrink-0">LIVE</span>}
                          {isDone && <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">DONE</span>}
                        </div>
                        {stageMatchCount > 0 && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{stageFinished}/{stageMatchCount}</span>
                            <div className="w-20 h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${isDone ? 'bg-emerald-400' : 'bg-[var(--accent)]'}`} style={{ width: `${matchProgress}%` }} />
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-7 text-right">{matchProgress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
                        <span>{stageMatchCount} match{stageMatchCount !== 1 ? 'es' : ''}</span>
                        {stage.groups.length > 0 && <><span className="text-[var(--border)]">&bull;</span><span>{stage.groups.length} group{stage.groups.length !== 1 ? 's' : ''}</span></>}
                        {totalTeamsInGroups > 0 && <><span className="text-[var(--border)]">&bull;</span><span>{totalTeamsInGroups}{totalGroupSlots > 0 ? `/${totalGroupSlots}` : ''} teams</span></>}
                        {stageLive > 0 && <><span className="text-[var(--border)]">&bull;</span><span className="text-[var(--red)] font-medium">{stageLive} live</span></>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 py-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-dashed border-[var(--border)] text-[var(--text-muted)] flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div>
              <span className="text-[13px] text-[var(--text-secondary)]">No stages yet.</span>
              <button onClick={() => setActiveTab('stages')} className="text-[13px] text-[var(--accent)] hover:text-[var(--text-primary)] ml-2 font-medium transition-colors">
                Create your first stage &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── How it works ─── */}
      <details className="surface overflow-hidden group" open={setupProgress < 100}>
        <summary className="px-6 py-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--accent)] flex-shrink-0">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-sm font-medium text-[var(--text-primary)]">How it works — Cloud to Live Broadcast</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--text-muted)] transition-transform group-open:rotate-180">
            <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </summary>
        <div className="px-6 pb-6 border-t border-[var(--border)]">
          <div className="pt-5 space-y-0">
            {[
              { step: '1', title: 'Set up your tournament (Cloud)', desc: 'Create stages, assign teams to groups, and create matches. The setup checklist above tracks your progress.', active: setupProgress < 100 },
              { step: '2', title: 'Export a group or stage (Cloud)', desc: 'Go to Stages tab → expand a stage → click the export icon on a group card. Downloads a ZIP with roster_mapping.json, logos, and INI config.', active: setupProgress >= 100 && stages.every((s) => s.status === 'pending') },
              { step: '3', title: 'Load on streamer PC (Local App)', desc: 'Extract the ZIP. Set ROSTER_MAPPING_PATH to point to roster_mapping.json. Start the local app — it auto-loads the roster.', active: false },
              { step: '4', title: 'Start the stage (Cloud)', desc: 'Click "Start" on the stage. This marks it as active.', active: stages.some((s) => s.status === 'pending') && setupProgress >= 100 },
              { step: '5', title: 'Go live (Local App)', desc: 'The game client sends telemetry to the local app. OBS browser sources connect to localhost:3001/overlay/* for live overlays.', active: false },
              { step: '6', title: 'Results sync back (Automatic)', desc: 'When a match ends, the local app automatically pushes final results to the cloud.', active: false },
            ].map((item, i, arr) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${item.active ? 'border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-elevated)]'}`}>
                    {item.step}
                  </div>
                  {i < arr.length - 1 && <div className="w-[1px] h-full min-h-[24px] bg-[var(--border)] my-1" />}
                </div>
                <div className="pb-5 min-w-0">
                  <div className={`text-[13px] font-medium ${item.active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{item.title}</div>
                  <div className="text-[12px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* ─── Registered Teams ─── */}
      {tournamentTeams.length > 0 && (
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)]">Registered Teams</h2>
            <div className="flex items-center gap-2">
              <button onClick={autoSeedTeams} className="btn-ghost text-xs py-1 px-2">Seed by join order</button>
              <div className="bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2 py-0.5 rounded text-[10px]">{tournamentTeams.length} TOTAL</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {tournamentTeams.map((team) => (
              <div key={team.id} className="flex items-center gap-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-hover)] rounded-lg px-3 py-2 transition-colors min-w-0">
                {/* Seed badge / inline edit */}
                {editingSeedFor === team.id ? (
                  <input
                    type="number" min={1} autoFocus value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    onBlur={() => { updateTeamSeed(team.id, seedInput ? Number(seedInput) : null); setEditingSeedFor(null); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { updateTeamSeed(team.id, seedInput ? Number(seedInput) : null); setEditingSeedFor(null); }
                      if (e.key === 'Escape') setEditingSeedFor(null);
                    }}
                    className="w-9 text-center text-[10px] font-bold rounded border border-[var(--accent)] bg-[var(--bg-base)] text-[var(--accent)] py-0.5 flex-shrink-0"
                  />
                ) : (
                  <button
                    onClick={() => { setEditingSeedFor(team.id); setSeedInput(team.seed != null ? String(team.seed) : ''); }}
                    title="Click to set seed"
                    className={`w-9 h-6 text-[10px] font-bold rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      team.seed != null
                        ? 'border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    {team.seed != null ? `#${team.seed}` : '—'}
                  </button>
                )}
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="w-7 h-7 rounded-md object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: '#2F6B3F25', color: '#2F6B3F' }}>
                    {(team.short_name ?? team.name).substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[12px] text-[var(--text-primary)] font-medium truncate leading-tight">{team.name}</div>
                  {team.short_name && <div className="text-[10px] text-[var(--text-muted)] font-mono leading-tight">{team.short_name}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
