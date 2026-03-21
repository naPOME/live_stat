'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/DataTable';
import type { Match } from '@/lib/types';
import { useTournament } from '../_context';

type FinalsMatchesTableProps = {
  matches: Match[];
  stageId: string;
  tournamentId: string;
  MAP_NAMES: string[];
  updateMatchMap: (matchId: string, map: string | null) => void;
  duplicateMatch: (match: Match, stageId: string) => void;
  matchCountdown: (scheduledAt: string) => string | null;
};

function FinalsMatchesTable({ matches, stageId, tournamentId, MAP_NAMES, updateMatchMap, duplicateMatch, matchCountdown }: FinalsMatchesTableProps) {
  const columns = useMemo<ColumnDef<Match, unknown>[]>(() => [
    {
      id: 'index',
      header: '#',
      meta: { width: '40px' },
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">{row.index + 1}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Match',
      meta: { width: '1.5fr' },
      cell: ({ row }) => {
        const m = row.original;
        const cd = m.scheduled_at && m.status === 'pending' ? matchCountdown(m.scheduled_at) : null;
        return (
          <div className="min-w-0">
            <span className="text-[13px] font-medium text-[var(--text-primary)]">{m.name}</span>
            {cd && <span className="ml-2 text-[10px] text-[var(--accent)] font-mono">{cd}</span>}
            {!cd && m.scheduled_at && m.status === 'pending' && (
              <span className="ml-2 text-[10px] text-[var(--text-muted)] font-mono">
                {new Date(m.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'map_name',
      header: 'Map',
      meta: { width: '160px' },
      cell: ({ row }) => {
        const m = row.original;
        return (
          <select
            value={m.map_name ?? ''}
            onChange={(e) => updateMatchMap(m.id, e.target.value || null)}
            onClick={(e) => e.stopPropagation()}
            className="input-premium py-0.5 px-1.5 text-[11px] w-full">
            <option value="">No map</option>
            {MAP_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { width: '90px' },
      cell: ({ getValue }) => {
        const s = getValue() as string;
        const cls = s === 'finished'
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : s === 'live'
            ? 'bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/20'
            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border)]';
        return (
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${cls}`}>{s}</span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      meta: { width: '120px' },
      enableSorting: false,
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); duplicateMatch(m, stageId); }}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] font-medium transition-colors">
              Dup
            </button>
            <Link
              href={`/tournaments/${tournamentId}/stages/${stageId}/matches/${m.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] font-medium px-2.5 py-1 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors">
              Open →
            </Link>
          </div>
        );
      },
    },
  ], [stageId, tournamentId, MAP_NAMES, updateMatchMap, duplicateMatch, matchCountdown]);

  return <DataTable columns={columns} data={matches} pageSize={15} />;
}

export default function StagesTab() {
  const {
    tournamentId: id,
    stages, pointSystem,
    expandedStages, toggleExpanded,
    linkingTeams,
    GAME_MAPS, MAP_NAMES, STAGE_PRESETS, generateRotation,
    createStagesFromPreset, addSingleStage, deleteStage,
    updateStageStatus, toggleStageAutoAdvance, updateStageAdvancing,
    addMatch, duplicateMatch, updateMatchMap, generateFinalsRotation,
    createDivisions, addTeamToGroup, removeTeamFromGroup, autoDistributeTeams,
    linkAllTeamsToTournament,
    createTemplate, templates,
    exportStage, exportGroup,
    updateMapPool,
    showConfirm, availableTeams, matchCountdown,
  } = useTournament();

  // Stage creation form state
  const [stagePreset, setStagePreset] = useState(STAGE_PRESETS[0]?.id ?? '');
  const [customStageNames, setCustomStageNames] = useState('');
  const [matchesPerStageInput, setMatchesPerStageInput] = useState('6');

  // Manual add stage
  const [addingStage, setAddingStage] = useState(false);
  const [stageName, setStageName] = useState('');

  // Match form state
  const [addingMatchTo, setAddingMatchTo] = useState<string | null>(null);
  const [matchName, setMatchName] = useState('');
  const [matchMap, setMatchMap] = useState('');
  const [matchScheduledAt, setMatchScheduledAt] = useState('');

  // Group creation form state
  const [creatingGroupFor, setCreatingGroupFor] = useState<string | null>(null);
  const [newGroupCount, setNewGroupCount] = useState(2);
  const [newGroupTeamCount, setNewGroupTeamCount] = useState<number | ''>(16);
  const [newGroupMatchCount, setNewGroupMatchCount] = useState(6);

  // Add team to group
  const [addingTeamToGroup, setAddingTeamToGroup] = useState<string | null>(null);

  // Template form state
  const [templateName, setTemplateName] = useState('');
  const [templateMatchesPerStage, setTemplateMatchesPerStage] = useState(6);
  const [templateTeamsPerStage, setTemplateTeamsPerStage] = useState<number | ''>('');
  const [templateAutoAssign, setTemplateAutoAssign] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

  async function handleCreateTemplate() {
    setTemplateSaving(true);
    await createTemplate(templateName, templateMatchesPerStage, templateTeamsPerStage, templateAutoAssign);
    setTemplateSaving(false);
    setTemplateName('');
  }

  async function handleAddSingleStage() {
    if (!stageName.trim()) return;
    await addSingleStage(stageName.trim());
    setStageName('');
    setAddingStage(false);
  }

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      {/* Stage creation bar — empty state */}
      {stages.length === 0 && (
        <div className="surface p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="text-sm font-display font-bold uppercase tracking-widest text-[var(--accent)] mb-2">Set Up Tournament Stages</div>
          <p className="text-[13px] text-[var(--text-secondary)] mb-6 max-w-2xl">
            Choose a preset to create stages. Group stages let you split teams into groups (A, B, C...).
            Elimination and finals stages define how many teams advance.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <select value={stagePreset} onChange={(e) => setStagePreset(e.target.value)} className="input-premium py-2.5 w-auto">
              {STAGE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">Custom (comma-separated)</option>
            </select>
            {stagePreset === 'custom' && (
              <input type="text" value={customStageNames} onChange={(e) => setCustomStageNames(e.target.value)}
                placeholder="e.g. Groups, Semi-Finals, Grand Finals" className="input-premium py-2.5 w-80" />
            )}
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Matches / stage</label>
              <input type="text" value={matchesPerStageInput} onChange={(e) => setMatchesPerStageInput(e.target.value)}
                placeholder="e.g. 6,4,6" className="input-premium py-2.5 w-32 text-center" />
            </div>
            <button onClick={() => createStagesFromPreset(stagePreset, customStageNames, matchesPerStageInput)} className="btn-primary py-2.5">
              Create Stages
            </button>
          </div>
        </div>
      )}

      {/* Pipeline builder toolbar — when stages exist */}
      {stages.length > 0 && (
        <div className="surface p-5 mb-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)]">Pipeline</span>
            <button onClick={linkAllTeamsToTournament} disabled={linkingTeams}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors font-medium disabled:opacity-50">
              {linkingTeams ? 'Linking…' : 'Link registered teams →'}
            </button>
          </div>

          {/* Stage flow visualization */}
          <div className="flex items-center gap-1.5 flex-wrap mb-5">
            {stages.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5">
                {i > 0 && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--border)] flex-shrink-0">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  s.status === 'live'
                    ? 'border-[var(--red)]/30 bg-[var(--red)]/5 text-[var(--red)]'
                    : s.status === 'completed'
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                      : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}>
                  {s.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] animate-pulse flex-shrink-0" />}
                  {s.status === 'completed' && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <span>{s.name}</span>
                  <span className="opacity-30 text-[9px] font-normal">{s.stage_type}</span>
                </div>
              </div>
            ))}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--border)] flex-shrink-0">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[var(--text-muted)] text-[11px] flex items-center gap-1">
              <span className="opacity-40">+</span> stage
            </div>
          </div>

          {/* Add stages form */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[var(--border)]">
            <select value={stagePreset} onChange={(e) => setStagePreset(e.target.value)} className="input-premium w-auto text-xs">
              {STAGE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">Custom</option>
            </select>
            {stagePreset === 'custom' && (
              <input type="text" value={customStageNames} onChange={(e) => setCustomStageNames(e.target.value)}
                placeholder="Stage names, comma-separated" className="input-premium w-56 text-xs" />
            )}
            <button onClick={() => createStagesFromPreset(stagePreset, customStageNames, matchesPerStageInput)}
              className="btn-primary text-xs py-1.5 px-3">
              + Add Stages
            </button>
          </div>
        </div>
      )}

      {/* Stage Cards */}
      <div className="space-y-3">
        {stages.map((stage, stageIdx) => {
          const isExpanded = expandedStages.has(stage.id);
          const prevStage = stageIdx > 0 ? stages[stageIdx - 1] : null;
          const statusClass = stage.status === 'active'
            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
            : stage.status === 'completed'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20';
          const typeLabel = stage.stage_type === 'group' ? 'GROUP' : stage.stage_type === 'elimination' ? 'ELIMINATION' : 'FINALS';
          const typeColor = stage.stage_type === 'group' ? 'var(--accent)' : stage.stage_type === 'elimination' ? 'var(--amber)' : 'var(--red)';
          const canStart = stage.status === 'pending' && !stages.some((s) => s.status === 'active');

          const stageMatchCount = stage.matches.length;
          const stageFinished = stage.matches.filter((m) => m.status === 'finished').length;
          const stageLive = stage.matches.filter((m) => m.status === 'live').length;
          const totalTeamsInGroups = stage.groups.reduce((sum, g) => sum + g.teams.length, 0);
          const totalGroupCapacity = stage.groups.reduce((sum, g) => sum + (g.team_count || 0), 0);
          const matchProgress = stageMatchCount > 0 ? Math.round((stageFinished / stageMatchCount) * 100) : 0;

          const warnings: string[] = [];
          if (stage.groups.length > 0 && stage.groups.some((g) => g.teams.length === 0)) warnings.push('Some groups have no teams');
          if (stageMatchCount === 0 && stage.status !== 'completed') warnings.push('No matches created');
          if (stage.groups.length === 0 && stage.stage_type === 'group') warnings.push('No groups created');

          const mapPool = (stage.map_rotation as string[] | null) ?? [];

          return (
            <div key={stage.id} className={`surface transition-colors ${isExpanded ? 'border-[var(--border-hover)]' : ''}`}>
              {/* Stage header */}
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => toggleExpanded(stage.id)}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`text-[10px] text-[var(--text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>&#x25B6;</div>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor }} />
                  <span className="font-display font-bold uppercase tracking-wider text-[var(--text-primary)] text-sm">{stage.name}</span>
                  <span className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                    style={{ color: typeColor, borderColor: `${typeColor}40` }}>
                    {typeLabel}
                  </span>
                  <span className={`text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${statusClass}`}>
                    {stage.status}
                  </span>
                  <div className="h-4 w-[1px] bg-[var(--border)] mx-1" />
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span>{stageMatchCount} match{stageMatchCount !== 1 ? 'es' : ''}</span>
                    {stage.groups.length > 0 && <><span className="text-[var(--border)]">&bull;</span><span>{stage.groups.length} group{stage.groups.length !== 1 ? 's' : ''}</span></>}
                    {totalTeamsInGroups > 0 && <><span className="text-[var(--border)]">&bull;</span><span>{totalTeamsInGroups}{totalGroupCapacity > 0 ? `/${totalGroupCapacity}` : ''} teams</span></>}
                    {stageFinished > 0 && <><span className="text-[var(--border)]">&bull;</span><span className="text-emerald-400">{stageFinished} done</span></>}
                    {stageLive > 0 && <><span className="text-[var(--border)]">&bull;</span><span className="text-[var(--red)]">{stageLive} live</span></>}
                  </div>
                  {stageMatchCount > 0 && (
                    <div className="w-16 flex-shrink-0 ml-2">
                      <div className="h-1 bg-[var(--bg-base)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${stage.status === 'completed' ? 'bg-emerald-400' : 'bg-[var(--accent)]'}`} style={{ width: `${matchProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {warnings.length > 0 && stage.status !== 'completed' && (
                    <div className="flex-shrink-0" title={warnings.join(', ')}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[var(--amber)]">
                        <path d="M8 1.5L1 13.5h14L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                        <path d="M8 6v3.5M8 11.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                  {canStart && (
                    <button onClick={() => {
                      if (warnings.length > 0) {
                        showConfirm(
                          `Start "${stage.name}"? Warning: ${warnings.join(', ')}. You can still start but some configuration may be incomplete.`,
                          () => updateStageStatus(stage.id, 'active'),
                        );
                      } else {
                        updateStageStatus(stage.id, 'active');
                      }
                    }}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
                      Start
                    </button>
                  )}
                  {stage.status === 'active' && (
                    <button onClick={() => {
                      const unfinished = stageMatchCount - stageFinished;
                      showConfirm(
                        `End "${stage.name}" and mark as completed?${unfinished > 0 ? ` ${unfinished} match${unfinished !== 1 ? 'es' : ''} still not finished.` : ' All matches are finished.'} ${stage.auto_advance ? 'Top teams will auto-advance to the next stage.' : ''}`,
                        () => updateStageStatus(stage.id, 'completed'),
                      );
                    }}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--amber)]/30 text-[var(--amber)] bg-[var(--amber)]/10 hover:bg-[var(--amber)]/20 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor"/></svg>
                      End Stage
                    </button>
                  )}
                  {stage.status === 'completed' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Completed
                    </span>
                  )}
                  <button onClick={() => exportStage(stage.id, stage.name)} title="Export stage as ZIP" className="icon-btn">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button onClick={() => deleteStage(stage.id)} title="Delete stage" className="icon-btn icon-btn-danger opacity-40 hover:opacity-100">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8M5.5 4V3a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1m2 0v7.5a1 1 0 01-1 1h-5a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[var(--border)]">
                  {/* Config readiness bar */}
                  {stage.status !== 'completed' && (
                    <div className="px-6 py-3 bg-[var(--bg-hover)] border-b border-[var(--border)]">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)]">Setup</span>
                        {stage.stage_type !== 'finals' && (
                          <div className={`flex items-center gap-1.5 text-[11px] ${stage.groups.length > 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                            {stage.groups.length > 0
                              ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2"/></svg>}
                            Groups ({stage.groups.length})
                          </div>
                        )}
                        {(() => {
                          const teamsInGroups = stage.groups.reduce((s, g) => s + g.teams.length, 0);
                          const hasTeams = teamsInGroups > 0 || stage.stage_type === 'finals';
                          return (
                            <div className={`flex items-center gap-1.5 text-[11px] ${hasTeams ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                              {hasTeams
                                ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2"/></svg>}
                              Teams ({teamsInGroups})
                            </div>
                          );
                        })()}
                        <div className={`flex items-center gap-1.5 text-[11px] ${stageMatchCount > 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                          {stageMatchCount > 0
                            ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2"/></svg>}
                          Matches ({stageMatchCount})
                        </div>
                        {(() => {
                          const poolSize = mapPool.length;
                          return (
                            <div className={`flex items-center gap-1.5 text-[11px] ${poolSize > 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                              {poolSize > 0
                                ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2"/></svg>}
                              Map Pool ({poolSize})
                            </div>
                          );
                        })()}
                        <div className="ml-auto">
                          <button onClick={() => toggleStageAutoAdvance(stage.id, !stage.auto_advance)}
                            title="When on, top teams automatically move to the next stage when this stage is completed"
                            className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors ${
                              stage.auto_advance ? 'border-[var(--accent)]/30 text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent'
                            }`}>
                            <div className={`w-6 h-3.5 rounded-full relative transition-colors ${stage.auto_advance ? 'bg-[var(--accent)]/30' : 'bg-[var(--bg-base)]'}`}>
                              <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${stage.auto_advance ? 'left-3 bg-[var(--accent)]' : 'left-0.5 bg-[var(--text-muted)]'}`} />
                            </div>
                            Auto-advance
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Group management (all stages except finals) */}
                  {stage.stage_type !== 'finals' && (
                    <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--bg-hover)]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest">Groups</div>
                        <div className="flex items-center gap-2">
                          {stage.groups.length > 0 && (
                            <button onClick={() => autoDistributeTeams(stage.id)} className="btn-ghost btn-sm text-[11px]">
                              Auto-distribute teams
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const next = creatingGroupFor === stage.id ? null : stage.id;
                              setCreatingGroupFor(next);
                              if (next) setNewGroupMatchCount(stage.match_count ?? 6);
                            }}
                            className="btn-primary btn-sm text-[11px]">
                            + Create Groups
                          </button>
                        </div>
                      </div>

                      {/* Create groups form */}
                      {creatingGroupFor === stage.id && (
                        <div className="surface p-5 mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Number of Groups</label>
                              <input type="number" min={1} max={26} value={newGroupCount}
                                onChange={(e) => setNewGroupCount(Number(e.target.value))} className="input-premium w-full" />
                              <div className="text-[10px] text-[var(--text-muted)] mt-1.5 font-mono">
                                {Array.from({ length: Math.min(newGroupCount, 26) }).map((_, i) => String.fromCharCode(65 + i)).join(', ')}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Teams per Group</label>
                              <input type="number" min={1} value={newGroupTeamCount}
                                onChange={(e) => setNewGroupTeamCount(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="e.g. 16" className="input-premium w-full" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Matches per Group</label>
                              <input type="number" min={0} max={20} value={newGroupMatchCount}
                                onChange={(e) => setNewGroupMatchCount(Number(e.target.value))} className="input-premium w-full" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => createDivisions(stage.id, newGroupCount, newGroupTeamCount, newGroupMatchCount)}
                              className="btn-primary py-2 px-5 text-[11px]">
                              Create {newGroupCount} Group{newGroupCount !== 1 ? 's' : ''} ({newGroupMatchCount} match{newGroupMatchCount !== 1 ? 'es' : ''} each)
                            </button>
                            <button onClick={() => setCreatingGroupFor(null)}
                              className="text-[11px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-white transition-colors px-3 py-2 border border-transparent hover:border-[var(--border)] rounded-lg">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Group cards */}
                      {stage.groups.length > 0 ? (
                        <div className="space-y-4">
                          {stage.groups.map((group) => (
                            <div key={group.id} className="surface overflow-hidden">
                              <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-hover)]">
                                <div className="flex items-center gap-4 mb-2 md:mb-0">
                                  <span className="text-sm font-display font-bold uppercase tracking-wider text-white">{group.name}</span>
                                  <div className="w-[1px] h-4 bg-[var(--border)]" />
                                  <span className="text-[11px] font-display font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                    <span className="text-white">{group.teams.length}</span>{group.team_count ? `/${group.team_count}` : ''} teams
                                  </span>
                                  <span className="text-[11px] font-display font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                    <span className="text-white">{group.matches.length}</span> match{group.matches.length !== 1 ? 'es' : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setAddingTeamToGroup(addingTeamToGroup === group.id ? null : group.id)}
                                    className="btn-ghost btn-sm text-[11px] flex items-center gap-1">
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                                    Team
                                  </button>
                                  <button onClick={() => { setAddingMatchTo(group.id); setMatchName(''); setMatchMap(''); }}
                                    className="btn-ghost btn-sm text-[11px] flex items-center gap-1">
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                                    Match
                                  </button>
                                  <button onClick={() => exportGroup(group.id, group.name)} title="Export group as ZIP" className="icon-btn">
                                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
                                {/* Left: Teams */}
                                <div className="px-4 py-3 bg-black/10">
                                  <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Teams</div>
                                  {addingTeamToGroup === group.id && (
                                    <div className="mb-3">
                                      <select onChange={(e) => { if (e.target.value) addTeamToGroup(group.id, e.target.value); }}
                                        defaultValue="" className="input-premium w-full py-1.5 px-2 text-xs">
                                        <option value="">Select team...</option>
                                        {availableTeams(stage).map((t) => (
                                          <option key={t.id} value={t.id}>{t.name}{t.short_name ? ` [${t.short_name}]` : ''}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  {group.teams.length === 0 ? (
                                    <div className="text-[11px] text-[var(--text-muted)] italic py-1">No teams assigned</div>
                                  ) : (
                                    <div className="space-y-1">
                                      {group.teams.map((team) => (
                                        <div key={team.id} className="flex items-center justify-between py-1 group/team hover:bg-white/5 px-2 -mx-2 rounded transition-colors">
                                          <div className="flex items-center gap-2 min-w-0">
                                            {team.logo_url ? (
                                              <img src={team.logo_url} alt={team.name} className="w-5 h-5 rounded object-cover flex-shrink-0"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            ) : (
                                              <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                                                style={{ backgroundColor: team.brand_color + '30', color: team.brand_color }}>
                                                {(team.short_name ?? team.name).substring(0, 2).toUpperCase()}
                                              </div>
                                            )}
                                            <span className="text-[12px] text-[var(--text-primary)] truncate font-medium">{team.short_name || team.name}</span>
                                          </div>
                                          <button onClick={() => removeTeamFromGroup(group.id, team.id)}
                                            className="text-[12px] font-display font-bold text-[var(--text-muted)] hover:text-[var(--red)] opacity-0 group-hover/team:opacity-100 transition-all flex-shrink-0">
                                            &times;
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Right: Matches */}
                                <div className="px-4 py-3 bg-black/10">
                                  <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Matches</div>
                                  {group.matches.length === 0 && addingMatchTo !== group.id ? (
                                    <div className="text-[11px] text-[var(--text-muted)] italic py-1">
                                      No matches scheduled.{' '}
                                      <button onClick={() => { setAddingMatchTo(group.id); setMatchName(''); setMatchMap(''); }}
                                        className="text-[var(--accent)] hover:text-white not-italic font-medium transition-colors">Add one</button>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {group.matches.map((match) => (
                                        <div key={match.id} className="flex items-center justify-between py-1 group/match hover:bg-white/5 px-2 -mx-2 rounded transition-colors">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-[12px] text-[var(--text-primary)] font-medium truncate">{match.name}</span>
                                            <select value={match.map_name ?? ''} onChange={(e) => updateMatchMap(match.id, e.target.value || null)}
                                              className="input-premium py-0.5 px-1.5 text-[10px]">
                                              <option value="">No map</option>
                                              {MAP_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <span className={`text-[9px] font-display font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                                              match.status === 'finished' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
                                              : match.status === 'live' ? 'bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/30'
                                              : 'bg-white/5 text-[var(--text-muted)] border-[var(--border)]'
                                            }`}>
                                              {match.status}
                                            </span>
                                            {match.status === 'pending' && match.scheduled_at && (() => {
                                              const cd = matchCountdown(match.scheduled_at);
                                              return cd
                                                ? <span className="text-[9px] text-[var(--accent)] font-mono">{cd}</span>
                                                : <span className="text-[9px] text-[var(--text-muted)] font-mono">{new Date(match.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>;
                                            })()}
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => duplicateMatch(match, stage.id, group.id)}
                                              className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors opacity-0 group-hover/match:opacity-100"
                                              title="Duplicate match">Dup</button>
                                            <Link href={`/tournaments/${id}/stages/${stage.id}/matches/${match.id}`}
                                              className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors">
                                              Open →
                                            </Link>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Add match to group form */}
                                  {addingMatchTo === group.id && (
                                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                                      <input type="text" autoFocus placeholder="Match name" value={matchName}
                                        onChange={(e) => setMatchName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { addMatch(stage.id, group.id, matchName, matchMap, matchScheduledAt || undefined); setMatchName(''); setMatchMap(''); setMatchScheduledAt(''); } if (e.key === 'Escape') setAddingMatchTo(null); }}
                                        className="input-premium flex-1 min-w-[120px] py-1 px-2 text-xs" />
                                      <select value={matchMap} onChange={(e) => setMatchMap(e.target.value)} className="input-premium py-1 px-2 text-xs">
                                        <option value="">Map</option>
                                        {(mapPool.length > 0 ? mapPool : MAP_NAMES).map((m) => <option key={m} value={m}>{m}</option>)}
                                      </select>
                                      <input type="datetime-local" value={matchScheduledAt} onChange={(e) => setMatchScheduledAt(e.target.value)}
                                        className="input-premium py-1 px-2 text-xs w-auto" title="Schedule date/time (optional)" />
                                      <button onClick={() => { addMatch(stage.id, group.id, matchName, matchMap, matchScheduledAt || undefined); setMatchName(''); setMatchMap(''); setMatchScheduledAt(''); }}
                                        className="btn-primary py-1 px-3 text-[10px]">Add</button>
                                      <button onClick={() => setAddingMatchTo(null)}
                                        className="text-[12px] font-display font-bold text-[var(--text-muted)] hover:text-[var(--red)] transition-colors px-1">&times;</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-[12px] text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl bg-white/[0.01]">
                          No groups created yet.<br/><span className="mt-1 block opacity-70">Click &quot;Create Groups&quot; to split teams into groups like A, B, C.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Elimination / Finals: Advancing config */}
                  {(stage.stage_type === 'elimination' || stage.stage_type === 'finals') && (() => {
                    const prevGroupCount = prevStage?.groups?.length ?? 0;
                    const advCount = stage.advancing_count ?? 0;
                    const perGroup = prevGroupCount > 0 ? Math.ceil(advCount / prevGroupCount) : 0;
                    const totalAdvancing = advCount + (stage.stage_type === 'finals' ? stage.invitational_count : 0);

                    return (
                      <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-hover)]">
                        <div className="text-xs font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Advancement Configuration</div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Teams advancing</label>
                            <input type="number" min={0} value={stage.advancing_count ?? ''}
                              onChange={(e) => updateStageAdvancing(stage.id, e.target.value === '' ? null : Number(e.target.value), stage.invitational_count)}
                              placeholder="e.g. 16" className="input-premium w-full" />
                            <div className="text-[10px] text-[var(--text-muted)] mt-1">From {prevStage?.name ?? 'previous stage'}</div>
                          </div>
                          {prevGroupCount > 0 && advCount > 0 && (
                            <div>
                              <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Per Group</label>
                              <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
                                <div className="text-lg font-bold text-[var(--amber)]">Top {perGroup}</div>
                                <div className="text-[10px] text-[var(--text-muted)]">from each of {prevGroupCount} group{prevGroupCount !== 1 ? 's' : ''} qualify</div>
                              </div>
                            </div>
                          )}
                          {stage.stage_type === 'finals' && (
                            <div>
                              <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Invitational Teams</label>
                              <input type="number" min={0} value={stage.invitational_count}
                                onChange={(e) => updateStageAdvancing(stage.id, stage.advancing_count, Number(e.target.value) || 0)}
                                placeholder="0" className="input-premium w-full" />
                              <div className="text-[10px] text-[var(--text-muted)] mt-1">Directly invited teams</div>
                            </div>
                          )}
                          <div className="flex items-end">
                            <div className="bg-[var(--accent)]/5 border border-[var(--accent-border)] rounded-lg px-3 py-2 w-full">
                              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Total in {stage.name}</div>
                              <div className="text-xl font-black text-[var(--accent)]">{totalAdvancing}</div>
                              {stage.stage_type === 'finals' && stage.invitational_count > 0 && (
                                <div className="text-[10px] text-[var(--text-muted)]">{advCount} qualified + {stage.invitational_count} invited</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Map Pool */}
                  <div className="border-b border-[var(--border)]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-display font-bold text-[var(--text-muted)] uppercase tracking-widest">Map Pool</span>
                        {mapPool.length > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                            {mapPool.length} selected
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const competitive = GAME_MAPS.filter((m) => m.competitive).map((m) => m.name);
                          const allEnabled = competitive.every((n) => mapPool.includes(n));
                          updateMapPool(stage.id, allEnabled ? [] : competitive);
                        }}
                        className="text-[10px] text-[var(--accent)] hover:text-[var(--text-primary)] font-bold transition-colors uppercase tracking-widest">
                        {mapPool.length === GAME_MAPS.filter((m) => m.competitive).length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>

                    {/* Competitive map tiles */}
                    <div className="px-5 pt-4 pb-3">
                      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2.5">Competitive</div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {GAME_MAPS.filter((m) => m.competitive).map((gm) => {
                          const enabled = mapPool.includes(gm.name);
                          return (
                            <button key={gm.id}
                              onClick={() => updateMapPool(stage.id, enabled ? mapPool.filter((n) => n !== gm.name) : [...mapPool, gm.name])}
                              className="relative flex flex-col items-start justify-between p-2.5 rounded-xl border transition-all text-left"
                              style={{
                                borderColor: enabled ? gm.color + '55' : 'var(--border)',
                                background: enabled ? gm.color + '14' : 'var(--bg-elevated)',
                              }}>
                              {enabled && (
                                <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: gm.color }}>
                                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                    <path d="M1.5 4l2 2L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </span>
                              )}
                              <span className="text-[12px] font-bold leading-tight pr-5"
                                style={{ color: enabled ? gm.color : 'var(--text-secondary)' }}>
                                {gm.name}
                              </span>
                              {gm.size && (
                                <span className="text-[9px] font-mono mt-1.5 opacity-40">{gm.size}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Casual / non-competitive maps */}
                    <div className="px-5 pb-4">
                      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2.5">Casual</div>
                      <div className="flex flex-wrap gap-2">
                        {GAME_MAPS.filter((m) => !m.competitive).map((gm) => {
                          const enabled = mapPool.includes(gm.name);
                          return (
                            <button key={gm.id}
                              onClick={() => updateMapPool(stage.id, enabled ? mapPool.filter((n) => n !== gm.name) : [...mapPool, gm.name])}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
                              style={{
                                borderColor: enabled ? gm.color + '55' : 'var(--border)',
                                background: enabled ? gm.color + '14' : 'var(--bg-elevated)',
                              }}>
                              {enabled && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gm.color }} />}
                              <span className="text-[11px] font-semibold" style={{ color: enabled ? gm.color : 'var(--text-muted)' }}>
                                {gm.name}
                              </span>
                              {gm.size && <span className="text-[9px] font-mono opacity-40">{gm.size}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Generate rotation (finals only) */}
                    {stage.stage_type === 'finals' && mapPool.length > 0 && (
                      <div className="px-5 py-3 border-t border-[var(--border)] flex items-center gap-3">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Generate Random Rotation</span>
                        {[6, 12, 18].map((n) => (
                          <button key={n}
                            onClick={async () => {
                              const pool = GAME_MAPS.filter((m) => mapPool.includes(m.name));
                              const rotation = generateRotation(n, pool);
                              const startIndex = stage.matches.length;
                              const rows = rotation.map((mapName, idx) => ({
                                stage_id: stage.id,
                                name: `Match ${startIndex + idx + 1}`,
                                map_name: mapName,
                                point_system_id: pointSystem?.id ?? null,
                              }));
                              for (const row of rows) {
                                await addMatch(stage.id, undefined, row.name, row.map_name ?? undefined);
                              }
                            }}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors">
                            +{n} matches
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Matches list (finals only) */}
                  {stage.stage_type === 'finals' && (
                    <div>
                      <div className="flex items-center justify-between px-5 py-2.5 bg-[var(--bg-hover)] border-b border-[var(--border)]">
                        <span className="text-xs font-display font-bold text-[var(--text-muted)] uppercase tracking-widest">Matches</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-display font-bold">Default set</span>
                          {[1, 2, 3].map((sets) => (
                            <button key={sets} onClick={() => generateFinalsRotation(stage, sets)}
                              className="text-xs text-[var(--accent)] hover:text-[var(--text-primary)] font-medium transition-colors">
                              +{sets * 6}
                            </button>
                          ))}
                          <button onClick={() => exportStage(stage.id, stage.name)}
                            className="text-xs text-[var(--accent)] hover:text-[var(--text-primary)] font-medium transition-colors">
                            Export Stage
                          </button>
                          <button onClick={() => { setAddingMatchTo(stage.id); setMatchName(''); setMatchMap(''); }}
                            className="text-xs text-[var(--accent)] hover:text-[var(--text-primary)] font-medium transition-colors">
                            + Add Match
                          </button>
                        </div>
                      </div>

                      {stage.matches.length > 0 ? (
                        <div className="p-4">
                          <FinalsMatchesTable
                            matches={stage.matches}
                            stageId={stage.id}
                            tournamentId={id}
                            MAP_NAMES={mapPool.length > 0 ? mapPool : MAP_NAMES}
                            updateMatchMap={updateMatchMap}
                            duplicateMatch={duplicateMatch}
                            matchCountdown={matchCountdown}
                          />
                        </div>
                      ) : (
                        <div className="px-5 py-4 text-center text-[var(--text-muted)] text-sm">
                          No matches yet.{' '}
                          <button onClick={() => setAddingMatchTo(stage.id)} className="text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors">
                            Add the first one
                          </button>
                        </div>
                      )}

                      {/* Add match form */}
                      {addingMatchTo === stage.id && (
                        <div className="border-t border-[var(--border)] px-5 py-3 bg-[var(--bg-hover)] flex flex-wrap items-center gap-3">
                          <input type="text" autoFocus placeholder="Match name (e.g. Game 1)" value={matchName}
                            onChange={(e) => setMatchName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { addMatch(stage.id, undefined, matchName, matchMap, matchScheduledAt || undefined); setMatchName(''); setMatchMap(''); setMatchScheduledAt(''); } if (e.key === 'Escape') setAddingMatchTo(null); }}
                            className="input-premium flex-1 min-w-[140px] py-2 text-sm" />
                          <select value={matchMap} onChange={(e) => setMatchMap(e.target.value)} className="input-premium py-2 text-sm w-auto">
                            <option value="">Map (optional)</option>
                            {(mapPool.length > 0 ? mapPool : MAP_NAMES).map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <input type="datetime-local" value={matchScheduledAt} onChange={(e) => setMatchScheduledAt(e.target.value)}
                            className="input-premium py-2 text-sm w-auto" title="Schedule date/time (optional)" />
                          <button onClick={() => { addMatch(stage.id, undefined, matchName, matchMap, matchScheduledAt || undefined); setMatchName(''); setMatchMap(''); setMatchScheduledAt(''); }}
                            className="btn-primary py-2 px-4 text-xs">Add</button>
                          <button onClick={() => setAddingMatchTo(null)}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm px-2 transition-colors">&times;</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual add stage (advanced) */}
      <details className="mt-3">
        <summary className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer select-none">
          Manual add stage (advanced)
        </summary>
        <div className="mt-3">
          {addingStage ? (
            <div className="surface p-4 flex items-center gap-3">
              <input type="text" autoFocus placeholder="Stage name" value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSingleStage(); if (e.key === 'Escape') setAddingStage(false); }}
                className="input-premium flex-1" />
              <button onClick={handleAddSingleStage} className="btn-primary py-2.5 px-4 text-sm">Add Stage</button>
              <button onClick={() => setAddingStage(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm px-2">&times;</button>
            </div>
          ) : (
            <button onClick={() => setAddingStage(true)}
              className="w-full border border-dashed border-[var(--border)] hover:border-[var(--accent-border)] rounded-2xl py-3.5 text-[var(--text-muted)] hover:text-[var(--accent)] text-sm font-medium transition-colors">
              + Add Stage
            </button>
          )}
        </div>
      </details>

      {/* Match templates (advanced) */}
      <details className="mt-3">
        <summary className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer select-none">
          Match templates
        </summary>
        <div className="mt-3 surface p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Template Name</label>
              <input type="text" placeholder="Template name" value={templateName}
                onChange={(e) => setTemplateName(e.target.value)} className="input-premium w-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Matches/Stage</label>
                <input type="number" min={0} value={templateMatchesPerStage}
                  onChange={(e) => setTemplateMatchesPerStage(Number(e.target.value))} className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Teams/Stage</label>
                <input type="number" min={0} value={templateTeamsPerStage}
                  onChange={(e) => setTemplateTeamsPerStage(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="All" className="input-premium w-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <input type="checkbox" checked={templateAutoAssign}
                onChange={(e) => setTemplateAutoAssign(e.target.checked)} className="accent-[var(--accent)]" />
              Auto-assign teams
            </label>
            <button onClick={handleCreateTemplate} disabled={templateSaving || !templateName.trim()} className="btn-primary py-2 px-4 text-sm">
              {templateSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
          {templates.length > 0 && (
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <div className="text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Saved Templates</div>
              {templates.map((t) => (
                <div key={t.id} className="text-xs text-[var(--text-secondary)] py-0.5">
                  {t.name} &mdash; {t.matches_per_stage} matches{t.teams_per_stage ? `, ${t.teams_per_stage} teams` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
