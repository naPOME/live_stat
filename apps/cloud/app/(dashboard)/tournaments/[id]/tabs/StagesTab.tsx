'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/DataTable';
import type { Match } from '@/lib/types';
import { useTournament } from '../_context';
import type { StageWithDetails, StandingEntry } from '../_types';
import StageTimeline from './StageTimeline';
import AdvancingTeamsModal from './AdvancingTeamsModal';

// ─── Matches DataTable (reused for finals) ────────────────────────────────────

type FinalsMatchesTableProps = {
  matches: Match[];
  stageId: string;
  tournamentId: string;
  MAP_NAMES: string[];
  updateMatchMap: (matchId: string, map: string | null) => void;
  duplicateMatch: (match: Match, stageId: string) => void;
  matchCountdown: (scheduledAt: string) => string | null;
  selectedMatchIds: Set<string>;
  onToggleMatch: (id: string) => void;
};

function FinalsMatchesTable({ matches, stageId, tournamentId, MAP_NAMES, updateMatchMap, duplicateMatch, matchCountdown, selectedMatchIds, onToggleMatch }: FinalsMatchesTableProps) {
  const columns = useMemo<ColumnDef<Match, unknown>[]>(() => [
    {
      id: 'select',
      header: '',
      meta: { width: '32px' },
      enableSorting: false,
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedMatchIds.has(row.original.id)}
          onChange={() => onToggleMatch(row.original.id)}
          onClick={(e) => e.stopPropagation()}
          className="accent-[var(--accent)] w-3.5 h-3.5"
        />
      ),
    },
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
  ], [stageId, tournamentId, MAP_NAMES, updateMatchMap, duplicateMatch, matchCountdown, selectedMatchIds, onToggleMatch]);

  return <DataTable columns={columns} data={matches} pageSize={15} />;
}

// ─── Live Leaderboard (Consequence Zone) ──────────────────────────────────────

function LiveLeaderboard({ stage, stageStandings, loading, onRefresh }: {
  stage: StageWithDetails | null;
  stageStandings: { id: string; standings: StandingEntry[] }[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const standings = stageStandings.find(s => s.id === stage?.id)?.standings ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {stage ? `${stage.name} Standings` : 'Standings'}
          </span>
        </div>
        <button onClick={onRefresh} disabled={loading}
          className="text-[10px] text-[var(--accent)] hover:text-[var(--text-primary)] font-bold transition-colors uppercase tracking-widest disabled:opacity-40">
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      {/* Standings list */}
      <div className="flex-1 overflow-y-auto">
        {standings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[var(--text-muted)] opacity-30 mb-3">
              <rect x="4" y="14" width="6" height="14" rx="1" fill="currentColor"/>
              <rect x="13" y="8" width="6" height="20" rx="1" fill="currentColor"/>
              <rect x="22" y="4" width="6" height="24" rx="1" fill="currentColor"/>
            </svg>
            <div className="text-[11px] text-[var(--text-muted)]">No results yet</div>
            <div className="text-[10px] text-[var(--text-muted)] opacity-60 mt-0.5">Standings update as matches finish</div>
          </div>
        ) : (
          <div className="py-1">
            {standings.map((entry, i) => (
              <div key={entry.team_id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors">
                {/* Rank */}
                <span className={`w-5 text-center text-xs font-black tabular-nums flex-shrink-0 ${
                  i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-[var(--text-muted)]'
                }`}>
                  {entry.rank ?? i + 1}
                </span>

                {/* Team */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {entry.team?.logo_url ? (
                    <img src={entry.team.logo_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-bold"
                      style={{ backgroundColor: '#2F6B3F30', color: '#2F6B3F' }}>
                      {(entry.team?.short_name ?? entry.team?.name ?? '??').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                    {entry.team?.short_name || entry.team?.name || 'Unknown'}
                  </span>
                </div>

                {/* Stats */}
                <span className="text-[11px] font-bold text-[var(--text-primary)] tabular-nums w-10 text-right">{entry.total_pts}</span>
                <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-8 text-right">{entry.total_kills}k</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Action Zone: Stage content area ──────────────────────────────────────────

function StageActionZone({ stage, prevStage }: { stage: StageWithDetails; prevStage: StageWithDetails | null }) {
  const {
    tournamentId: id,
    stages, pointSystem,
    linkingTeams,
    GAME_MAPS, MAP_NAMES, STAGE_PRESETS, generateRotation,
    deleteStage, updateStageStatus, toggleStageAutoAdvance, updateStageAdvancing,
    addMatch, duplicateMatch, updateMatchMap, generateFinalsRotation,
    createDivisions, addTeamToGroup, removeTeamFromGroup, autoDistributeTeams,
    linkAllTeamsToTournament,
    exportStage, exportGroup,
    updateMapPool,
    showConfirm, availableTeams, matchCountdown,
  } = useTournament();

  // Local UI state
  const [addingMatchTo, setAddingMatchTo] = useState<string | null>(null);
  const [matchName, setMatchName] = useState('');
  const [matchMap, setMatchMap] = useState('');
  const [matchScheduledAt, setMatchScheduledAt] = useState('');
  const [creatingGroupFor, setCreatingGroupFor] = useState(false);
  const [newGroupCount, setNewGroupCount] = useState(2);
  const [newGroupTeamCount, setNewGroupTeamCount] = useState<number | ''>(16);
  const [newGroupMatchCount, setNewGroupMatchCount] = useState(6);
  const [addingTeamToGroup, setAddingTeamToGroup] = useState<string | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());

  const mapPool = (stage.map_rotation as string[] | null) ?? [];
  const allMatches = [...stage.matches, ...stage.groups.flatMap(g => g.matches)];
  const stageMatchCount = allMatches.length;
  const stageFinished = allMatches.filter(m => m.status === 'finished').length;
  const stageLive = allMatches.filter(m => m.status === 'live').length;
  const matchProgress = stageMatchCount > 0 ? Math.round((stageFinished / stageMatchCount) * 100) : 0;
  const canStart = stage.status === 'pending' && (!prevStage || prevStage.status === 'completed') && !stages.some(s => s.status === 'active');
  const allFinished = stageMatchCount > 0 && stageFinished === stageMatchCount;

  const toggleMatchSelection = useCallback((matchId: string) => {
    setSelectedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId); else next.add(matchId);
      return next;
    });
  }, []);

  // Batch status change
  async function batchSetMatchStatus(status: 'pending' | 'live' | 'finished') {
    // This would need a bulk update API; for now use individual updates
    // (context doesn't expose match status update, so we'd need to add it)
    // For now, show a toast
    showConfirm(
      `Change ${selectedMatchIds.size} match${selectedMatchIds.size !== 1 ? 'es' : ''} to "${status}"?`,
      () => { setSelectedMatchIds(new Set()); },
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stage header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              stage.status === 'active' ? 'bg-[var(--accent)]' : stage.status === 'completed' ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'
            }`} />
            <h2 className="text-lg font-display font-black uppercase tracking-wide text-[var(--text-primary)]">{stage.name}</h2>
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
            stage.stage_type === 'group' ? 'text-[var(--accent)] border-[var(--accent)]/30'
              : stage.stage_type === 'elimination' ? 'text-[var(--amber)] border-[var(--amber)]/30'
              : 'text-[var(--red)] border-[var(--red)]/30'
          }`}>
            {stage.stage_type}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
            stage.status === 'active' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
              : stage.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20'
          }`}>
            {stage.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canStart && (
            <button onClick={() => updateStageStatus(stage.id, 'active')}
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
              Activate Stage
            </button>
          )}
          {stage.status === 'active' && (
            <button
              onClick={() => {}} // Will be wired to open AdvancingTeamsModal from parent
              data-action="complete-stage"
              className={`flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl border transition-all ${
                allFinished
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 animate-pulse'
                  : 'border-[var(--amber)]/30 text-[var(--amber)] bg-[var(--amber)]/10 hover:bg-[var(--amber)]/20'
              }`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor"/></svg>
              {allFinished ? 'Ready — Complete Stage' : 'End Stage'}
            </button>
          )}
          <button onClick={() => exportStage(stage.id, stage.name)} title="Export ZIP" className="icon-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button onClick={() => deleteStage(stage.id)} title="Delete stage" className="icon-btn icon-btn-danger opacity-40 hover:opacity-100">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8M5.5 4V3a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1m2 0v7.5a1 1 0 01-1 1h-5a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* Progress + config bar */}
      {stage.status !== 'completed' && (
        <div className="surface p-4">
          <div className="flex items-center gap-6 mb-3">
            {/* Progress */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Match Progress</span>
                <span className="text-[11px] font-bold tabular-nums text-[var(--text-primary)]">{stageFinished}/{stageMatchCount}</span>
              </div>
              <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${allFinished ? 'bg-emerald-400' : 'bg-[var(--accent)]'}`}
                  style={{ width: `${matchProgress}%` }} />
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {stageLive > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--red)] animate-pulse" />
                  <span className="text-[11px] font-bold text-[var(--red)]">{stageLive} live</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-muted)]">{stage.groups.length} groups</span>
              </div>
            </div>

            {/* Auto-advance toggle */}
            <button onClick={() => toggleStageAutoAdvance(stage.id, !stage.auto_advance)}
              className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                stage.auto_advance ? 'border-[var(--accent)]/30 text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}>
              <div className={`w-6 h-3.5 rounded-full relative transition-colors ${stage.auto_advance ? 'bg-[var(--accent)]/30' : 'bg-[var(--bg-base)]'}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${stage.auto_advance ? 'left-3 bg-[var(--accent)]' : 'left-0.5 bg-[var(--text-muted)]'}`} />
              </div>
              Auto-advance
            </button>
          </div>

          {/* Batch actions bar — when matches selected */}
          {selectedMatchIds.size > 0 && (
            <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
              <span className="text-[11px] font-bold text-[var(--text-primary)]">{selectedMatchIds.size} selected</span>
              <div className="flex items-center gap-1.5">
                {(['pending', 'live', 'finished'] as const).map(status => (
                  <button key={status} onClick={() => batchSetMatchStatus(status)}
                    className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors">
                    → {status}
                  </button>
                ))}
              </div>
              <button onClick={() => setSelectedMatchIds(new Set())}
                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-auto transition-colors">
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Advancement Configuration (elimination/finals) ─── */}
      {(stage.stage_type === 'elimination' || stage.stage_type === 'finals') && (
        <div className="surface p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Advancement</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Teams advancing</label>
              <input type="number" min={0} value={stage.advancing_count ?? ''}
                onChange={(e) => updateStageAdvancing(stage.id, e.target.value === '' ? null : Number(e.target.value), stage.invitational_count)}
                placeholder="e.g. 16" className="input-premium w-full" />
            </div>
            {stage.stage_type === 'finals' && (
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Invitational</label>
                <input type="number" min={0} value={stage.invitational_count}
                  onChange={(e) => updateStageAdvancing(stage.id, stage.advancing_count, Number(e.target.value) || 0)}
                  placeholder="0" className="input-premium w-full" />
              </div>
            )}
            <div className="flex items-end">
              <div className="bg-[var(--accent)]/5 border border-[var(--accent-border)] rounded-lg px-3 py-2 w-full">
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Total</div>
                <div className="text-lg font-black text-[var(--accent)]">
                  {(stage.advancing_count ?? 0) + (stage.stage_type === 'finals' ? stage.invitational_count : 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Group Management (group/elimination) ─── */}
      {stage.stage_type !== 'finals' && (
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Groups</span>
            <div className="flex items-center gap-2">
              {stage.groups.length > 0 && (
                <button onClick={() => autoDistributeTeams(stage.id)} className="btn-ghost btn-sm text-[11px]">
                  Auto-distribute
                </button>
              )}
              <button onClick={() => { setCreatingGroupFor(!creatingGroupFor); setNewGroupMatchCount(stage.match_count ?? 6); }}
                className="btn-primary btn-sm text-[11px]">+ Groups</button>
            </div>
          </div>

          {/* Create groups form */}
          {creatingGroupFor && (
            <div className="px-4 py-4 border-b border-[var(--border)] bg-[var(--bg-hover)]">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Groups</label>
                  <input type="number" min={1} max={26} value={newGroupCount} onChange={(e) => setNewGroupCount(Number(e.target.value))} className="input-premium w-full" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Teams/Group</label>
                  <input type="number" min={1} value={newGroupTeamCount}
                    onChange={(e) => setNewGroupTeamCount(e.target.value === '' ? '' : Number(e.target.value))} className="input-premium w-full" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Matches/Group</label>
                  <input type="number" min={0} max={20} value={newGroupMatchCount} onChange={(e) => setNewGroupMatchCount(Number(e.target.value))} className="input-premium w-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { createDivisions(stage.id, newGroupCount, newGroupTeamCount, newGroupMatchCount); setCreatingGroupFor(false); }}
                  className="btn-primary py-2 px-4 text-[11px]">
                  Create {newGroupCount} Group{newGroupCount !== 1 ? 's' : ''}
                </button>
                <button onClick={() => setCreatingGroupFor(false)} className="text-[11px] text-[var(--text-muted)] hover:text-white px-3 py-2 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Group cards - inline accordion style */}
          {stage.groups.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {stage.groups.map(group => (
                <GroupAccordion
                  key={group.id}
                  group={group}
                  stage={stage}
                  stageId={stage.id}
                  tournamentId={id}
                  MAP_NAMES={mapPool.length > 0 ? mapPool : MAP_NAMES}
                  addMatch={addMatch}
                  duplicateMatch={duplicateMatch}
                  updateMatchMap={updateMatchMap}
                  addTeamToGroup={addTeamToGroup}
                  removeTeamFromGroup={removeTeamFromGroup}
                  exportGroup={exportGroup}
                  availableTeams={availableTeams(stage)}
                  matchCountdown={matchCountdown}
                  addingTeamToGroup={addingTeamToGroup}
                  setAddingTeamToGroup={setAddingTeamToGroup}
                  addingMatchTo={addingMatchTo}
                  setAddingMatchTo={setAddingMatchTo}
                  matchName={matchName}
                  setMatchName={setMatchName}
                  matchMap={matchMap}
                  setMatchMap={setMatchMap}
                  matchScheduledAt={matchScheduledAt}
                  setMatchScheduledAt={setMatchScheduledAt}
                />
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-[12px] text-[var(--text-muted)]">
              No groups yet. Click &quot;+ Groups&quot; to create divisions.
            </div>
          )}
        </div>
      )}

      {/* ─── Map Pool ─── */}
      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Map Pool</span>
            {mapPool.length > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                {mapPool.length}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              const competitive = GAME_MAPS.filter(m => m.competitive).map(m => m.name);
              const allEnabled = competitive.every(n => mapPool.includes(n));
              updateMapPool(stage.id, allEnabled ? [] : competitive);
            }}
            className="text-[10px] text-[var(--accent)] hover:text-[var(--text-primary)] font-bold transition-colors uppercase tracking-widest">
            {mapPool.length === GAME_MAPS.filter(m => m.competitive).length ? 'Clear' : 'Select All'}
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {GAME_MAPS.filter(m => m.competitive).map(gm => {
              const enabled = mapPool.includes(gm.name);
              return (
                <button key={gm.id}
                  onClick={() => updateMapPool(stage.id, enabled ? mapPool.filter(n => n !== gm.name) : [...mapPool, gm.name])}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-[11px] font-semibold"
                  style={{
                    borderColor: enabled ? gm.color + '55' : 'var(--border)',
                    background: enabled ? gm.color + '14' : 'transparent',
                    color: enabled ? gm.color : 'var(--text-muted)',
                  }}>
                  {enabled && <span className="w-1.5 h-1.5 rounded-full" style={{ background: gm.color }} />}
                  {gm.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Finals: Match list ─── */}
      {stage.stage_type === 'finals' && (
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Matches</span>
            <div className="flex items-center gap-2">
              {mapPool.length > 0 && [6, 12, 18].map(n => (
                <button key={n}
                  onClick={async () => {
                    const pool = GAME_MAPS.filter(m => mapPool.includes(m.name));
                    const rotation = generateRotation(n, pool);
                    const startIndex = stage.matches.length;
                    for (let idx = 0; idx < rotation.length; idx++) {
                      await addMatch(stage.id, undefined, `Match ${startIndex + idx + 1}`, rotation[idx]);
                    }
                  }}
                  className="text-[10px] font-semibold px-2 py-1 rounded border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors">
                  +{n}
                </button>
              ))}
              <button onClick={() => { setAddingMatchTo(stage.id); setMatchName(''); setMatchMap(''); }}
                className="text-[10px] text-[var(--accent)] hover:text-[var(--text-primary)] font-medium transition-colors">
                + Match
              </button>
            </div>
          </div>

          {stage.matches.length > 0 ? (
            <div className="p-3">
              <FinalsMatchesTable
                matches={stage.matches}
                stageId={stage.id}
                tournamentId={id}
                MAP_NAMES={mapPool.length > 0 ? mapPool : MAP_NAMES}
                updateMatchMap={updateMatchMap}
                duplicateMatch={duplicateMatch}
                matchCountdown={matchCountdown}
                selectedMatchIds={selectedMatchIds}
                onToggleMatch={toggleMatchSelection}
              />
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-[12px] text-[var(--text-muted)]">
              No matches yet. Generate from the map pool or add manually.
            </div>
          )}

          {/* Inline add match form */}
          {addingMatchTo === stage.id && (
            <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-hover)] flex flex-wrap items-center gap-2">
              <input type="text" autoFocus placeholder="Match name" value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { addMatch(stage.id, undefined, matchName, matchMap, matchScheduledAt || undefined); setMatchName(''); setMatchMap(''); setMatchScheduledAt(''); }
                  if (e.key === 'Escape') setAddingMatchTo(null);
                }}
                className="input-premium flex-1 min-w-[120px] py-1.5 text-xs" />
              <select value={matchMap} onChange={(e) => setMatchMap(e.target.value)} className="input-premium py-1.5 text-xs w-auto">
                <option value="">Map</option>
                {(mapPool.length > 0 ? mapPool : MAP_NAMES).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="datetime-local" value={matchScheduledAt} onChange={(e) => setMatchScheduledAt(e.target.value)}
                className="input-premium py-1.5 text-xs w-auto" />
              <button onClick={() => { addMatch(stage.id, undefined, matchName, matchMap, matchScheduledAt || undefined); setMatchName(''); setMatchMap(''); setMatchScheduledAt(''); }}
                className="btn-primary py-1.5 px-3 text-[10px]">Add</button>
              <button onClick={() => setAddingMatchTo(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1">&times;</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group Accordion (inline expansion, no modals) ────────────────────────────

type GroupAccordionProps = {
  group: StageWithDetails['groups'][0];
  stage: StageWithDetails;
  stageId: string;
  tournamentId: string;
  MAP_NAMES: string[];
  addMatch: (stageId: string, groupId?: string, name?: string, map?: string, scheduledAt?: string) => Promise<void>;
  duplicateMatch: (source: Match, stageId: string, groupId?: string) => Promise<void>;
  updateMatchMap: (matchId: string, mapName: string | null) => Promise<void>;
  addTeamToGroup: (groupId: string, teamId: string) => Promise<void>;
  removeTeamFromGroup: (groupId: string, teamId: string) => Promise<void>;
  exportGroup: (groupId: string, groupName: string) => Promise<void>;
  availableTeams: { id: string; name: string; short_name: string | null; seed: number | null }[];
  matchCountdown: (scheduledAt: string | null) => string | null;
  addingTeamToGroup: string | null;
  setAddingTeamToGroup: (id: string | null) => void;
  addingMatchTo: string | null;
  setAddingMatchTo: (id: string | null) => void;
  matchName: string;
  setMatchName: (v: string) => void;
  matchMap: string;
  setMatchMap: (v: string) => void;
  matchScheduledAt: string;
  setMatchScheduledAt: (v: string) => void;
};

function GroupAccordion({
  group, stage, stageId, tournamentId, MAP_NAMES,
  addMatch, duplicateMatch, updateMatchMap,
  addTeamToGroup, removeTeamFromGroup, exportGroup,
  availableTeams, matchCountdown,
  addingTeamToGroup, setAddingTeamToGroup,
  addingMatchTo, setAddingMatchTo,
  matchName, setMatchName, matchMap, setMatchMap, matchScheduledAt, setMatchScheduledAt,
}: GroupAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const finished = group.matches.filter(m => m.status === 'finished').length;
  const live = group.matches.filter(m => m.status === 'live').length;

  return (
    <div>
      {/* Group header — click to expand */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] text-[var(--text-muted)] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>&#x25B6;</span>
          <span className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">{group.name}</span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            <span className="font-bold text-[var(--text-primary)]">{group.teams.length}</span>{group.team_count ? `/${group.team_count}` : ''} teams
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            <span className="font-bold text-[var(--text-primary)]">{group.matches.length}</span> matches
          </span>
          {finished > 0 && <span className="text-[10px] text-emerald-400 font-bold">{finished} done</span>}
          {live > 0 && <span className="text-[10px] text-[var(--red)] font-bold">{live} live</span>}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => setAddingTeamToGroup(addingTeamToGroup === group.id ? null : group.id)}
            className="btn-ghost btn-sm text-[11px]">+ Team</button>
          <button onClick={() => { setAddingMatchTo(group.id); setMatchName(''); setMatchMap(''); }}
            className="btn-ghost btn-sm text-[11px]">+ Match</button>
          <button onClick={() => exportGroup(group.id, group.name)} className="icon-btn">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* Expanded: inline spreadsheet-like view */}
      {expanded && (
        <div className="px-4 pb-4 bg-black/5">
          {/* Add team dropdown */}
          {addingTeamToGroup === group.id && (
            <div className="mb-3">
              <select onChange={(e) => { if (e.target.value) addTeamToGroup(group.id, e.target.value); }}
                defaultValue="" className="input-premium w-full py-1.5 px-2 text-xs">
                <option value="">Select team to add...</option>
                {availableTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.short_name ? ` [${t.short_name}]` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-[200px_1fr] gap-3">
            {/* Teams column */}
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Teams</div>
              {group.teams.length === 0 ? (
                <div className="text-[11px] text-[var(--text-muted)] italic">No teams</div>
              ) : (
                <div className="space-y-0.5">
                  {group.teams.map(team => (
                    <div key={team.id} className="flex items-center justify-between py-1 group/t hover:bg-white/5 px-2 -mx-2 rounded transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold flex-shrink-0"
                            style={{ backgroundColor: '#2F6B3F30', color: '#2F6B3F' }}>
                            {(team.short_name ?? team.name).substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[11px] text-[var(--text-primary)] truncate font-medium">{team.short_name || team.name}</span>
                      </div>
                      <button onClick={() => removeTeamFromGroup(group.id, team.id)}
                        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--red)] opacity-0 group-hover/t:opacity-100 transition-all flex-shrink-0">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Matches column — inline spreadsheet rows */}
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Matches</div>
              {group.matches.length === 0 && addingMatchTo !== group.id ? (
                <div className="text-[11px] text-[var(--text-muted)] italic">
                  No matches.{' '}
                  <button onClick={() => { setAddingMatchTo(group.id); setMatchName(''); setMatchMap(''); }}
                    className="text-[var(--accent)] not-italic font-medium">Add one</button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {group.matches.map(match => (
                    <div key={match.id} className="flex items-center gap-2 py-1 group/m hover:bg-white/5 px-2 -mx-2 rounded transition-colors">
                      <span className="text-[11px] font-medium text-[var(--text-primary)] truncate flex-1">{match.name}</span>
                      <select value={match.map_name ?? ''} onChange={(e) => updateMatchMap(match.id, e.target.value || null)}
                        className="input-premium py-0.5 px-1 text-[10px] w-24">
                        <option value="">Map</option>
                        {MAP_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                        match.status === 'finished' ? 'text-emerald-400 border-emerald-500/20'
                        : match.status === 'live' ? 'text-[var(--red)] border-[var(--red)]/20'
                        : 'text-[var(--text-muted)] border-[var(--border)]'
                      }`}>{match.status}</span>
                      <button onClick={() => duplicateMatch(match, stageId, group.id)}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] opacity-0 group-hover/m:opacity-100 transition-all">Dup</button>
                      <Link href={`/tournaments/${tournamentId}/stages/${stageId}/matches/${match.id}`}
                        className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors">
                        Open →
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline add match */}
              {addingMatchTo === group.id && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border)]">
                  <input type="text" autoFocus placeholder="Match name" value={matchName}
                    onChange={(e) => setMatchName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { addMatch(stageId, group.id, matchName, matchMap, matchScheduledAt || undefined); setMatchName(''); setMatchMap(''); setMatchScheduledAt(''); }
                      if (e.key === 'Escape') setAddingMatchTo(null);
                    }}
                    className="input-premium flex-1 min-w-[100px] py-1 px-2 text-xs" />
                  <select value={matchMap} onChange={(e) => setMatchMap(e.target.value)} className="input-premium py-1 px-1 text-xs">
                    <option value="">Map</option>
                    {MAP_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input type="datetime-local" value={matchScheduledAt} onChange={(e) => setMatchScheduledAt(e.target.value)}
                    className="input-premium py-1 px-1 text-xs w-auto" />
                  <button onClick={() => { addMatch(stageId, group.id, matchName, matchMap, matchScheduledAt || undefined); setMatchName(''); setMatchMap(''); setMatchScheduledAt(''); }}
                    className="btn-primary py-1 px-2 text-[10px]">Add</button>
                  <button onClick={() => setAddingMatchTo(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1">&times;</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main StagesTab: Split-Focus Layout ───────────────────────────────────────

export default function StagesTab() {
  const {
    tournamentId: id,
    stages, stageStandings, standingsLoading,
    STAGE_PRESETS,
    createStagesFromPreset, addSingleStage,
    updateStageStatus, fetchStandings,
    showConfirm, showToast,
    linkAllTeamsToTournament, linkingTeams,
  } = useTournament();

  // Selected stage (default to active or first)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [advancingModal, setAdvancingModal] = useState<StageWithDetails | null>(null);

  // Stage creation form
  const [stagePreset, setStagePreset] = useState(STAGE_PRESETS[0]?.id ?? '');
  const [customStageNames, setCustomStageNames] = useState('');
  const [matchesPerStageInput, setMatchesPerStageInput] = useState('6');
  const [addingStage, setAddingStage] = useState(false);
  const [stageName, setStageName] = useState('');

  // Auto-select a stage
  useEffect(() => {
    if (stages.length === 0) { setSelectedStageId(null); return; }
    if (selectedStageId && stages.find(s => s.id === selectedStageId)) return;
    const active = stages.find(s => s.status === 'active');
    setSelectedStageId(active?.id ?? stages[0].id);
  }, [stages, selectedStageId]);

  // Fetch standings when selected stage changes
  useEffect(() => {
    if (selectedStageId) fetchStandings(selectedStageId);
  }, [selectedStageId, fetchStandings]);

  const selectedStage = stages.find(s => s.id === selectedStageId) ?? null;
  const selectedIdx = stages.findIndex(s => s.id === selectedStageId);
  const prevStage = selectedIdx > 0 ? stages[selectedIdx - 1] : null;
  const nextStage = selectedIdx >= 0 && selectedIdx < stages.length - 1 ? stages[selectedIdx + 1] : null;

  // Wire "Complete Stage" button
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const btn = (e.target as HTMLElement).closest('[data-action="complete-stage"]');
      if (!btn || !selectedStage) return;
      e.preventDefault();
      e.stopPropagation();

      const allMatches = [...selectedStage.matches, ...selectedStage.groups.flatMap(g => g.matches)];
      const unfinished = allMatches.filter(m => m.status !== 'finished').length;

      if (allMatches.length === 0) {
        showToast('No matches in this stage yet.');
        return;
      }

      // Fetch fresh standings then open the modal
      fetchStandings(selectedStage.id);
      setAdvancingModal(selectedStage);
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [selectedStage, fetchStandings, showToast]);

  async function handleAdvanceTeams(teamIds: string[]) {
    if (!advancingModal) return;

    // 1) Mark the stage as completed
    await updateStageStatus(advancingModal.id, 'completed');

    // 2) If there's a next stage, add teams to it via API
    if (nextStage && teamIds.length > 0) {
      try {
        await fetch(`/api/advance-teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromStageId: advancingModal.id,
            toStageId: nextStage.id,
            teamIds,
          }),
        });
      } catch {
        showToast('Failed to advance teams — check console.');
      }
    }

    setAdvancingModal(null);
    // Move selection to next stage
    if (nextStage) setSelectedStageId(nextStage.id);
  }

  // ─── Empty state: no stages yet ───
  if (stages.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in pb-32">
        <div className="surface p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="text-sm font-display font-bold uppercase tracking-widest text-[var(--accent)] mb-2">Set Up Tournament Stages</div>
          <p className="text-[13px] text-[var(--text-secondary)] mb-6 max-w-2xl">
            Choose a preset or define your pipeline. Group stages split teams into groups. Elimination and finals stages define how many advance.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <select value={stagePreset} onChange={(e) => setStagePreset(e.target.value)} className="input-premium py-2.5 w-auto">
              {STAGE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">Custom (comma-separated)</option>
            </select>
            {stagePreset === 'custom' && (
              <input type="text" value={customStageNames} onChange={(e) => setCustomStageNames(e.target.value)}
                placeholder="e.g. Groups, Semi-Finals, Grand Finals" className="input-premium py-2.5 w-80" />
            )}
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Matches / stage</label>
              <input type="text" value={matchesPerStageInput} onChange={(e) => setMatchesPerStageInput(e.target.value)}
                placeholder="e.g. 6,4,6" className="input-premium py-2.5 w-32 text-center" />
            </div>
            <button onClick={() => createStagesFromPreset(stagePreset, customStageNames, matchesPerStageInput)} className="btn-primary py-2.5">
              Create Stages
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main: Split-focus layout ───
  return (
    <div className="animate-fade-in pb-32">
      {/* ── Top Bar: Stage Timeline (subway map) ── */}
      <div className="surface mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Pipeline</span>
          <div className="flex items-center gap-2">
            <button onClick={linkAllTeamsToTournament} disabled={linkingTeams}
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors font-medium disabled:opacity-50">
              {linkingTeams ? 'Linking…' : 'Link teams →'}
            </button>
            <button onClick={() => setAddingStage(true)}
              className="text-[10px] text-[var(--accent)] hover:text-[var(--text-primary)] font-bold transition-colors">
              + Stage
            </button>
          </div>
        </div>

        <StageTimeline
          stages={stages}
          activeStageId={selectedStageId}
          onSelectStage={setSelectedStageId}
          stageStandings={stageStandings}
        />

        {/* Add stage form */}
        {addingStage && (
          <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-hover)] flex items-center gap-3">
            <select value={stagePreset} onChange={(e) => setStagePreset(e.target.value)} className="input-premium w-auto text-xs">
              {STAGE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">Custom</option>
            </select>
            {stagePreset === 'custom' && (
              <input type="text" value={customStageNames} onChange={(e) => setCustomStageNames(e.target.value)}
                placeholder="Names, comma-separated" className="input-premium w-48 text-xs" />
            )}
            <input type="text" value={matchesPerStageInput} onChange={(e) => setMatchesPerStageInput(e.target.value)}
              placeholder="Matches/stage" className="input-premium w-28 text-xs text-center" />
            <button onClick={() => { createStagesFromPreset(stagePreset, customStageNames, matchesPerStageInput); setAddingStage(false); }}
              className="btn-primary text-xs py-1.5 px-3">Add</button>
            <div className="w-px h-5 bg-[var(--border)]" />
            <input type="text" value={stageName} onChange={(e) => setStageName(e.target.value)}
              placeholder="Or single stage name..." className="input-premium w-40 text-xs"
              onKeyDown={async (e) => { if (e.key === 'Enter' && stageName.trim()) { await addSingleStage(stageName.trim()); setStageName(''); setAddingStage(false); } }} />
            <button onClick={() => setAddingStage(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm px-1">&times;</button>
          </div>
        )}
      </div>

      {/* ── Split Layout: Action Zone (60%) + Consequence Zone (40%) ── */}
      <div className="grid grid-cols-[1fr_360px] gap-4 items-start">
        {/* Left: Action Zone */}
        <div>
          {selectedStage ? (
            <StageActionZone stage={selectedStage} prevStage={prevStage} />
          ) : (
            <div className="surface p-8 text-center text-[var(--text-muted)]">
              Select a stage from the timeline above.
            </div>
          )}
        </div>

        {/* Right: Consequence Zone — Sticky live leaderboard */}
        <div className="sticky top-4">
          <div className="surface overflow-hidden h-[calc(100vh-200px)]">
            <LiveLeaderboard
              stage={selectedStage}
              stageStandings={stageStandings}
              loading={standingsLoading}
              onRefresh={() => selectedStageId && fetchStandings(selectedStageId)}
            />
          </div>
        </div>
      </div>

      {/* ── Advancing Teams Modal ── */}
      {advancingModal && (
        <AdvancingTeamsModal
          stage={advancingModal}
          nextStage={nextStage}
          standings={stageStandings.find(s => s.id === advancingModal.id)?.standings ?? []}
          advancingCount={advancingModal.advancing_count ?? 16}
          onConfirm={handleAdvanceTeams}
          onCancel={() => setAdvancingModal(null)}
        />
      )}
    </div>
  );
}
