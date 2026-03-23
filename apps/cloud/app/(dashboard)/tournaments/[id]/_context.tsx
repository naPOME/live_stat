'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MAP_NAMES, DEFAULT_FINALS_ROTATION, generateRotation, GAME_MAPS } from '@/lib/config/maps';
import { STAGE_PRESET_MAP, STAGE_PRESETS } from '@/lib/config/tournament';
import type {
  TournamentData, StageWithDetails, StageStandings, Tab, ToastState, ConfirmDialogState,
  PointSystem, TeamApplication, TournamentTemplate, MatchResultFlag, MatchDispute, Team, Match, GroupWithTeams,
} from './_types';

// ─── Context shape ────────────────────────────────────────────────────────────

type TournamentContextValue = {
  // Core data
  tournamentId: string;
  tournament: TournamentData | null;
  setTournament: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  stages: StageWithDetails[];
  pointSystem: PointSystem | null;
  tournamentTeams: (Team & { seed: number | null })[];
  loading: boolean;

  // Lazy-loaded data
  applications: TeamApplication[];
  setApplications: React.Dispatch<React.SetStateAction<TeamApplication[]>>;
  flags: MatchResultFlag[];
  disputes: MatchDispute[];
  templates: TournamentTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<TournamentTemplate[]>>;

  // UI state
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  expandedStages: Set<string>;
  toggleExpanded: (stageId: string) => void;
  accepting: string | null;
  setAccepting: React.Dispatch<React.SetStateAction<string | null>>;
  linkCopied: boolean;
  selectedApplicationIds: string[];
  setSelectedApplicationIds: React.Dispatch<React.SetStateAction<string[]>>;
  linkingTeams: boolean;
  stageStandings: StageStandings[];
  standingsLoading: boolean;
  standingsStageId: string;
  setStandingsStageId: React.Dispatch<React.SetStateAction<string>>;
  exportInclude: Record<string, boolean>;
  setExportInclude: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  applicationsLoaded: boolean;
  templatesLoaded: boolean;

  // Helpers
  showToast: (message: string, type?: 'error' | 'info') => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
  toast: ToastState;
  setToast: React.Dispatch<React.SetStateAction<ToastState>>;
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;

  // Computed
  totalMatches: number;
  liveMatches: number;
  finishedMatches: number;
  pendingApps: number;
  setupSteps: SetupStep[];
  completedSteps: number;
  setupProgress: number;
  nextAction: SetupStep | undefined;
  availableTeams: (stage: StageWithDetails) => (Team & { seed: number | null })[];
  matchCountdown: (scheduledAt: string | null) => string | null;

  // Data refresh
  refreshStages: (includeGroups: boolean) => Promise<void>;
  refreshTournamentTeams: () => Promise<(Team & { seed: number | null })[]>;
  refreshApplications: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
  refreshOps: () => Promise<void>;
  fetchStandings: (stageId?: string) => Promise<void>;

  // Stage actions
  createStagesFromPreset: (preset: string, customNames: string, matchesInput: string) => Promise<void>;
  addSingleStage: (name: string) => Promise<void>;
  deleteStage: (stageId: string) => void;
  updateStageStatus: (stageId: string, status: 'pending' | 'active' | 'completed') => Promise<void>;
  toggleStageAutoAdvance: (stageId: string, next: boolean) => Promise<void>;
  updateStageAdvancing: (stageId: string, advancing: number | null, invitational: number) => Promise<void>;

  // Match actions
  addMatch: (stageId: string, groupId?: string, name?: string, map?: string, scheduledAt?: string) => Promise<void>;
  duplicateMatch: (source: Match, stageId: string, groupId?: string) => Promise<void>;
  updateMatchMap: (matchId: string, mapName: string | null) => Promise<void>;
  generateFinalsRotation: (stage: StageWithDetails, sets: number) => Promise<void>;

  // Group actions
  createDivisions: (stageId: string, groupCount: number, teamCount: number | '', matchCount: number) => Promise<void>;
  addTeamToGroup: (groupId: string, teamId: string) => Promise<void>;
  removeTeamFromGroup: (groupId: string, teamId: string) => Promise<void>;
  autoDistributeTeams: (stageId: string) => void;

  // Application actions
  acceptApplication: (app: TeamApplication) => Promise<void>;
  acceptSelectedApplications: () => Promise<void>;
  autoAcceptFirstN: () => Promise<void>;
  rejectApplication: (appId: string) => Promise<void>;
  copyRegistrationLink: () => void;
  updateRegistrationSettings: () => Promise<void>;
  linkAllTeamsToTournament: () => Promise<void>;

  // Template actions
  createTemplate: (name: string, matchesPerStage: number, teamsPerStage: number | '', autoAssign: boolean) => Promise<void>;

  // Export actions
  exportTournament: () => Promise<void>;
  exportStage: (stageId: string, stageName: string) => Promise<void>;
  exportGroup: (groupId: string, groupName: string) => Promise<void>;

  // Archive
  archiveTournament: () => void;

  // Seeding
  updateTeamSeed: (teamId: string, seed: number | null) => Promise<void>;
  autoSeedTeams: () => Promise<void>;

  // Map pool
  updateMapPool: (stageId: string, pool: string[]) => Promise<void>;
  GAME_MAPS: typeof GAME_MAPS;
  MAP_NAMES: typeof MAP_NAMES;
  STAGE_PRESETS: typeof STAGE_PRESETS;
  generateRotation: typeof generateRotation;
};

type SetupStep = {
  key: string;
  label: string;
  description: string;
  done: boolean;
  action?: () => void;
  actionLabel?: string;
};

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

type Props = {
  children: ReactNode;
  tournamentId: string;
  initialTournament: TournamentData;
  initialPointSystem: PointSystem | null;
};

export function TournamentProvider({ children, tournamentId: id, initialTournament, initialPointSystem }: Props) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Core data
  const [tournament, setTournament] = useState<TournamentData | null>(initialTournament);
  const [stages, setStages] = useState<StageWithDetails[]>([]);
  const [pointSystem] = useState<PointSystem | null>(initialPointSystem);
  const [tournamentTeams, setTournamentTeams] = useState<(Team & { seed: number | null })[]>([]);
  const [loading, setLoading] = useState(true);

  // Lazy-loaded
  const [applications, setApplications] = useState<TeamApplication[]>([]);
  const [flags, setFlags] = useState<MatchResultFlag[]>([]);
  const [disputes, setDisputes] = useState<MatchDispute[]>([]);
  const [templates, setTemplates] = useState<TournamentTemplate[]>([]);

  // UI state
  const [activeTab, setActiveTabState] = useState<Tab>('overview');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [accepting, setAccepting] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [linkingTeams, setLinkingTeams] = useState(false);
  const [stageStandings, setStageStandings] = useState<StageStandings[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsStageId, setStandingsStageId] = useState('all');
  const [exportInclude, setExportInclude] = useState<Record<string, boolean>>({
    tournament: true, stages: true, matches: true, results: true, teams: true, players: true,
  });
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [stagesLoaded, setStagesLoaded] = useState(false);

  // Toast + confirm
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);

  function showToast(message: string, type: 'error' | 'info' = 'error') {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  function showConfirm(message: string, onConfirm: () => void) {
    setConfirmDialog({ message, onConfirm });
  }

  function setActiveTab(tab: Tab) {
    setActiveTabState(tab);
    if (tab === 'standings') {
      if (stageStandings.length === 0) fetchStandings();
      if (!stagesLoaded) refreshStages(true);
    }
    if (tab === 'applications' && !applicationsLoaded) refreshApplications();
    if (tab === 'stages') {
      if (!stagesLoaded) refreshStages(true);
      if (!templatesLoaded) refreshTemplates();
    }
    if (tab === 'ops') refreshOps();
  }

  // ─── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      if (!initialTournament) { router.push('/tournaments'); return; }
      await Promise.all([refreshStages(false), refreshTournamentTeams()]);
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─── Data refresh ───────────────────────────────────────────────────────────

  async function refreshStages(includeGroups: boolean) {
    const { data: stagesData } = await supabase
      .from('stages')
      .select('id, tournament_id, name, stage_order, status, auto_advance, teams_expected, map_rotation, stage_type, advancing_count, invitational_count, match_count, created_at')
      .eq('tournament_id', id)
      .order('stage_order');

    if (!stagesData) { setStages([]); return; }
    const stageIds = stagesData.map((s) => s.id);
    if (stageIds.length === 0) { setStages([]); return; }

    const [{ data: matchesData }, groupsData] = await Promise.all([
      supabase.from('matches').select('id, stage_id, group_id, name, map_name, status, point_system_id, scheduled_at, created_at').in('stage_id', stageIds),
      includeGroups
        ? supabase.from('stage_groups')
            .select('id, stage_id, name, group_order, team_count, created_at, group_teams(team_id, teams(id, name, short_name, logo_url, brand_color))')
            .in('stage_id', stageIds)
            .order('group_order')
        : Promise.resolve({ data: [] as GroupWithTeams[] }),
    ]);

    const allMatches = matchesData ?? [];
    const groupsRows = Array.isArray((groupsData as { data?: unknown })?.data)
      ? (groupsData as { data: GroupWithTeams[] }).data
      : (Array.isArray(groupsData) ? groupsData as GroupWithTeams[] : []);

    const enriched: StageWithDetails[] = stagesData.map((s) => {
      const stageMatches = allMatches.filter((m) => m.stage_id === s.id);
      return {
        ...s,
        matches: stageMatches,
        groups: groupsRows
          .filter((g: GroupWithTeams) => g.stage_id === s.id)
          .map((g: GroupWithTeams) => ({
            ...g,
            teams: ((g as GroupWithTeams & { group_teams?: { teams: Team }[] }).group_teams ?? [])
              .map((gt) => gt.teams as Team)
              .filter(Boolean),
            matches: stageMatches.filter((m) => m.group_id === g.id),
          })),
      };
    });

    setStages(enriched);
    setStagesLoaded(true);
    setExpandedStages((prev) => prev.size === 0 ? new Set(enriched.map((s) => s.id)) : prev);
  }

  async function refreshTournamentTeams(): Promise<(Team & { seed: number | null })[]> {
    const res = await fetch(`/api/tournaments/${id}/teams`);
    if (!res.ok) { setTournamentTeams([]); return []; }
    const payload = await res.json();
    const teams = (payload.teams ?? []) as (Team & { seed: number | null })[];
    setTournamentTeams(teams);
    return teams;
  }

  async function refreshApplications() {
    const { data } = await supabase
      .from('team_applications')
      .select('id, team_name, short_name, brand_color, logo_url, contact_email, players, status, created_at, notes')
      .eq('tournament_id', id)
      .order('created_at', { ascending: false });
    setApplications((data as TeamApplication[]) ?? []);
    setApplicationsLoaded(true);
  }

  async function refreshTemplates() {
    const { data } = await supabase
      .from('tournament_templates')
      .select('id, tournament_id, name, map_rotation, matches_per_stage, teams_per_stage, auto_assign, created_at')
      .eq('tournament_id', id)
      .order('created_at', { ascending: false });
    setTemplates((data as TournamentTemplate[]) ?? []);
    setTemplatesLoaded(true);
  }

  async function refreshOps() {
    const matchIds = stages.flatMap((s) => s.matches.map((m) => m.id));
    if (matchIds.length === 0) { setFlags([]); setDisputes([]); return; }
    const [{ data: flagRows }, { data: disputeRows }] = await Promise.all([
      supabase.from('match_result_flags').select('*').in('match_id', matchIds),
      supabase.from('match_disputes').select('*').in('match_id', matchIds),
    ]);
    setFlags((flagRows as MatchResultFlag[]) ?? []);
    setDisputes((disputeRows as MatchDispute[]) ?? []);
  }

  async function fetchStandings(stageId?: string) {
    setStandingsLoading(true);
    try {
      const qs = stageId && stageId !== 'all' ? `?stageId=${stageId}` : '';
      const res = await fetch(`/api/standings/${id}${qs}`);
      if (res.ok) {
        const data = await res.json();
        setStageStandings(data.stages ?? []);
      }
    } catch { /* ignore */ }
    setStandingsLoading(false);
  }

  // ─── Stage actions ──────────────────────────────────────────────────────────

  async function createStagesFromPreset(preset: string, customNames: string, matchesInput: string) {
    let stageConfigs: { name: string; type: 'group' | 'elimination' | 'finals' }[] = [];
    if (preset === 'custom') {
      stageConfigs = customNames.split(',').map((n) => n.trim()).filter(Boolean).map((name) => ({ name, type: 'group' as const }));
    } else {
      stageConfigs = STAGE_PRESET_MAP[preset]?.stages ?? [];
    }
    if (stageConfigs.length === 0) { showToast('Please provide at least one stage name.'); return; }

    const rawMatchCounts = matchesInput.trim();
    let matchCounts = stageConfigs.map(() => 0);
    if (rawMatchCounts) {
      const parsed = rawMatchCounts.split(',').map((n) => Number(n.trim())).filter((n) => Number.isFinite(n) && n >= 0);
      if (parsed.length === 1) {
        const finalsIdx = stageConfigs.map((cfg, idx) => (cfg.type === 'finals' ? idx : -1)).filter((idx) => idx >= 0);
        if (finalsIdx.length === 0) { showToast('No finals stage to apply match count.'); return; }
        for (const idx of finalsIdx) matchCounts[idx] = parsed[0];
      } else if (parsed.length === stageConfigs.length) {
        matchCounts = parsed;
      } else {
        showToast('Matches per stage must match the number of stages, or be a single finals value.');
        return;
      }
    }

    const existingCount = stages.length;
    const hasActiveStage = stages.some((s) => s.status === 'active');
    const stageRows = stageConfigs.map((cfg, idx) => ({
      tournament_id: id,
      name: cfg.name,
      stage_order: existingCount + idx + 1,
      status: hasActiveStage || existingCount > 0 || idx > 0 ? 'pending' : 'active',
      stage_type: cfg.type,
      match_count: cfg.type === 'finals' ? matchCounts[idx] : null,
    }));

    const { data: createdStages, error } = await supabase.from('stages').insert(stageRows).select('id, stage_type');
    if (error || !createdStages) { showToast(error?.message ?? 'Failed to create stages'); return; }

    const allMatchRows = createdStages.flatMap((created, i) => {
      const cfg = stageConfigs[i];
      if (cfg.type !== 'finals') return [];
      const perStage = matchCounts[i] ?? 0;
      if (perStage <= 0) return [];
      return Array.from({ length: perStage }).map((_, idx) => ({
        stage_id: created.id,
        name: `Match ${idx + 1}`,
        map_name: DEFAULT_FINALS_ROTATION[idx % DEFAULT_FINALS_ROTATION.length],
        point_system_id: pointSystem?.id ?? null,
      }));
    });
    if (allMatchRows.length > 0) await supabase.from('matches').insert(allMatchRows);
    await refreshStages(true);
  }

  async function addSingleStage(name: string) {
    if (!name.trim()) return;
    const existingCount = stages.length;
    const hasActiveStage = stages.some((s) => s.status === 'active');
    const status = (hasActiveStage || existingCount > 0 ? 'pending' : 'active') as 'pending' | 'active';

    const tempId = `temp-${Date.now()}`;
    const optimistic: StageWithDetails = {
      id: tempId, tournament_id: id, name: name.trim(), stage_order: existingCount + 1, status,
      auto_advance: false, teams_expected: null, map_rotation: null, stage_type: 'group',
      advancing_count: null, invitational_count: 0, match_count: null,
      created_at: new Date().toISOString(), matches: [], groups: [],
    };
    setStages((prev) => [...prev, optimistic]);
    await supabase.from('stages').insert({ tournament_id: id, name: name.trim(), stage_order: existingCount + 1, status, stage_type: 'group' });
    await refreshStages(true);
  }

  function deleteStage(stageId: string) {
    showConfirm('Delete this stage and all its matches?', async () => {
      const prev = stages;
      setStages((s) => s.filter((x) => x.id !== stageId));
      const { error } = await supabase.from('stages').delete().eq('id', stageId);
      if (error) { setStages(prev); showToast(error.message); }
      else await refreshStages(true);
    });
  }

  async function updateStageStatus(stageId: string, status: 'pending' | 'active' | 'completed') {
    // Enforce: only one stage active at a time, and previous stage must be completed to activate
    if (status === 'active') {
      const stageIdx = stages.findIndex((s) => s.id === stageId);
      const prevStage = stageIdx > 0 ? stages[stageIdx - 1] : null;
      if (prevStage && prevStage.status !== 'completed') {
        showToast(`Cannot activate — "${prevStage.name}" must be completed first.`);
        return;
      }
      if (stages.some((s) => s.status === 'active' && s.id !== stageId)) {
        showToast('Another stage is already active. Complete it first.');
        return;
      }
    }
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, status } : s));
    await supabase.from('stages').update({ status }).eq('id', stageId);
    await refreshStages(true);
  }

  async function toggleStageAutoAdvance(stageId: string, next: boolean) {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, auto_advance: next } : s));
    await supabase.from('stages').update({ auto_advance: next }).eq('id', stageId);
  }

  async function updateStageAdvancing(stageId: string, advancing: number | null, invitational: number) {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, advancing_count: advancing, invitational_count: invitational } : s));
    await supabase.from('stages').update({ advancing_count: advancing, invitational_count: invitational }).eq('id', stageId);
  }

  // ─── Match actions ──────────────────────────────────────────────────────────

  async function addMatch(stageId: string, groupId?: string, name = '', map = '', scheduledAt?: string) {
    if (!name.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: Match = {
      id: tempId, stage_id: stageId, group_id: groupId ?? null, name: name.trim(),
      map_name: map || null, status: 'pending', point_system_id: pointSystem?.id ?? null,
      scheduled_at: scheduledAt ?? null, created_at: new Date().toISOString(),
    };
    setStages((prev) => prev.map((s) => {
      if (s.id !== stageId) return s;
      if (groupId) return { ...s, groups: s.groups.map((g) => g.id === groupId ? { ...g, matches: [...g.matches, optimistic] } : g) };
      return { ...s, matches: [...s.matches, optimistic] };
    }));
    await supabase.from('matches').insert({ stage_id: stageId, group_id: groupId ?? null, name: name.trim(), map_name: map || null, point_system_id: pointSystem?.id ?? null, scheduled_at: scheduledAt ?? null });
    await refreshStages(true);
  }

  async function duplicateMatch(source: Match, stageId: string, groupId?: string) {
    const stage = stages.find((s) => s.id === stageId);
    const existing = groupId ? stage?.groups.find((g) => g.id === groupId)?.matches ?? [] : stage?.matches ?? [];
    const newName = `Match ${existing.length + 1}`;
    const { data: created, error } = await supabase.from('matches').insert({
      stage_id: stageId, group_id: groupId ?? null, name: newName,
      map_name: source.map_name, point_system_id: pointSystem?.id ?? null,
    }).select('id').single();
    if (error || !created) return;
    const { data: sourceSlots } = await supabase.from('match_slots').select('team_id, slot_number').eq('match_id', source.id);
    if (sourceSlots && sourceSlots.length > 0) {
      await supabase.from('match_slots').insert(sourceSlots.map((sl) => ({ match_id: created.id, team_id: sl.team_id, slot_number: sl.slot_number })));
    }
    await refreshStages(true);
  }

  async function updateMatchMap(matchId: string, mapName: string | null) {
    setStages((prev) => prev.map((s) => ({
      ...s,
      matches: s.matches.map((m) => m.id === matchId ? { ...m, map_name: mapName } : m),
      groups: s.groups.map((g) => ({ ...g, matches: g.matches.map((m) => m.id === matchId ? { ...m, map_name: mapName } : m) })),
    })));
    await supabase.from('matches').update({ map_name: mapName }).eq('id', matchId);
  }

  async function generateFinalsRotation(stage: StageWithDetails, sets: number) {
    if (sets <= 0) return;
    const startIndex = stage.matches.length;
    const count = DEFAULT_FINALS_ROTATION.length * sets;
    const rows = Array.from({ length: count }).map((_, idx) => ({
      stage_id: stage.id, name: `Match ${startIndex + idx + 1}`,
      map_name: DEFAULT_FINALS_ROTATION[(startIndex + idx) % DEFAULT_FINALS_ROTATION.length],
      point_system_id: pointSystem?.id ?? null,
    }));
    await supabase.from('matches').insert(rows);
    await refreshStages(true);
  }

  // ─── Group actions ──────────────────────────────────────────────────────────

  async function createDivisions(stageId: string, groupCount: number, teamCount: number | '', matchCount: number) {
    const groupNames = Array.from({ length: groupCount }).map((_, i) => String.fromCharCode(65 + i));
    const tc = teamCount === '' ? null : Number(teamCount);
    const mc = Math.max(0, matchCount || 0);

    await supabase.from('stages').update({ match_count: mc }).eq('id', stageId);
    const { data: createdGroups } = await supabase.from('stage_groups').insert(
      groupNames.map((name, idx) => ({ stage_id: stageId, name: `Group ${name}`, group_order: idx + 1, team_count: tc })),
    ).select('id, name');

    if (createdGroups && mc > 0) {
      const allMatchRows = createdGroups.flatMap((group) =>
        Array.from({ length: mc }).map((_, idx) => ({
          stage_id: stageId, group_id: group.id,
          name: `${group.name} - Match ${idx + 1}`, map_name: null,
          point_system_id: pointSystem?.id ?? null,
        }))
      );
      await supabase.from('matches').insert(allMatchRows);
    }
    await refreshStages(true);
  }

  async function addTeamToGroup(groupId: string, teamId: string) {
    await supabase.from('group_teams').insert({ group_id: groupId, team_id: teamId });
    await refreshStages(true);
  }

  async function removeTeamFromGroup(groupId: string, teamId: string) {
    await supabase.from('group_teams').delete().match({ group_id: groupId, team_id: teamId });
    await refreshStages(true);
  }

  function autoDistributeTeams(stageId: string) {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage || stage.groups.length === 0) return;
    refreshTournamentTeams().then((freshTeams) => {
      if (freshTeams.length === 0) {
        showToast('No teams linked. Link teams first.', 'error');
        return;
      }
      showConfirm(
        `Distribute ${freshTeams.length} team${freshTeams.length !== 1 ? 's' : ''} across ${stage.groups.length} group${stage.groups.length !== 1 ? 's' : ''}? This clears existing assignments.`,
        async () => {
          try {
            const res = await fetch(`/api/tournaments/${id}/auto-distribute`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stageId }),
            });
            if (!res.ok) { const err = await res.json(); showToast('Failed: ' + (err.error ?? res.statusText)); return; }
          } catch (e) { showToast('Failed: ' + String(e)); return; }
          await refreshStages(true);
        },
      );
    });
  }

  // ─── Application actions ─────────────────────────────────────────────────────

  async function acceptApplications(apps: TeamApplication[]) {
    if (apps.length === 0) return;
    let remainingSlots = Number.POSITIVE_INFINITY;
    if (tournament?.registration_mode !== 'open' && tournament?.registration_limit) {
      const { count } = await supabase.from('team_applications').select('id', { count: 'exact', head: true }).eq('tournament_id', id).eq('status', 'accepted');
      remainingSlots = Math.max(0, tournament.registration_limit - (count ?? 0));
    }
    const toAccept = remainingSlots === Number.POSITIVE_INFINITY ? apps : apps.slice(0, remainingSlots);
    if (toAccept.length === 0) { showToast('Acceptance limit reached.', 'info'); setAccepting(null); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
    if (!profile?.org_id) { setAccepting(null); return; }

    for (const app of toAccept) {
      const { data: team, error: teamError } = await supabase.from('teams')
        .insert({ org_id: profile.org_id, name: app.team_name, short_name: app.short_name || null, brand_color: app.brand_color, logo_url: app.logo_url || null })
        .select('id').single();
      if (teamError || !team) continue;
      await supabase.from('tournament_teams').upsert({ tournament_id: id, team_id: team.id }, { onConflict: 'tournament_id,team_id' });
      if (app.players.length > 0) {
        await supabase.from('players').insert(app.players.map((p) => ({ team_id: team.id, display_name: p.display_name, player_open_id: p.player_open_id })));
      }
      await supabase.from('team_applications').update({ status: 'accepted' }).eq('id', app.id);
    }
    setAccepting(null);
    setSelectedApplicationIds([]);
    await Promise.all([refreshApplications(), refreshTournamentTeams()]);
  }

  async function acceptApplication(app: TeamApplication) {
    setAccepting(app.id);
    await acceptApplications([app]);
  }

  async function acceptSelectedApplications() {
    const selected = applications.filter((a) => selectedApplicationIds.includes(a.id) && a.status === 'pending');
    await acceptApplications(selected);
  }

  async function autoAcceptFirstN() {
    const pending = applications.filter((a) => a.status === 'pending').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    await acceptApplications(pending);
  }

  async function rejectApplication(appId: string) {
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: 'rejected' as const } : a));
    await supabase.from('team_applications').update({ status: 'rejected' }).eq('id', appId);
  }

  function copyRegistrationLink() {
    navigator.clipboard.writeText(`${window.location.origin}/apply/${id}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function updateRegistrationSettings() {
    if (!tournament) return;
    await supabase.from('tournaments').update({
      registration_open: tournament.registration_open,
      registration_mode: tournament.registration_mode,
      registration_limit: tournament.registration_limit,
    }).eq('id', id);
  }

  async function linkAllTeamsToTournament() {
    setLinkingTeams(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/link-registered-teams`, { method: 'POST' });
      if (!res.ok) { const err = await res.json(); showToast('Link failed: ' + (err.error ?? res.statusText)); setLinkingTeams(false); return; }
      await refreshTournamentTeams();
    } catch (e) { showToast('Link failed: ' + String(e)); }
    setLinkingTeams(false);
  }

  // ─── Template actions ────────────────────────────────────────────────────────

  async function createTemplate(name: string, matchesPerStage: number, teamsPerStage: number | '', autoAssign: boolean) {
    if (!name.trim()) return;
    await supabase.from('tournament_templates').insert({
      tournament_id: id, name: name.trim(), map_rotation: [],
      matches_per_stage: Math.max(0, Number(matchesPerStage) || 0),
      teams_per_stage: teamsPerStage === '' ? null : Number(teamsPerStage),
      auto_assign: autoAssign,
    });
    await refreshTemplates();
  }

  // ─── Export actions ──────────────────────────────────────────────────────────

  async function exportTournament() {
    const include = Object.entries(exportInclude).filter(([, e]) => e).map(([k]) => k).join(',');
    const res = await fetch(`/api/export-tournament/${id}?include=${encodeURIComponent(include)}`);
    if (!res.ok) { showToast('Export failed: ' + ((await res.json()).error ?? res.statusText)); return; }
    const blob = await res.blob();
    triggerDownload(blob, `${tournament?.name ?? 'tournament'}_export.zip`);
  }

  async function exportStage(stageId: string, stageName: string) {
    const res = await fetch(`/api/export-stage/${stageId}`);
    if (!res.ok) { const err = await res.json(); showToast('Export failed: ' + (err.error ?? res.statusText)); return; }
    triggerDownload(await res.blob(), `${stageName}_export.zip`);
  }

  async function exportGroup(groupId: string, groupName: string) {
    const res = await fetch(`/api/export-group/${groupId}`);
    if (!res.ok) { const err = await res.json(); showToast('Export failed: ' + (err.error ?? res.statusText)); return; }
    triggerDownload(await res.blob(), `${groupName}_export.zip`);
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Seeding ─────────────────────────────────────────────────────────────────

  async function updateTeamSeed(teamId: string, seed: number | null) {
    setTournamentTeams((prev) => prev.map((t) => t.id === teamId ? { ...t, seed } : t));
    await supabase.from('tournament_teams').update({ seed }).match({ tournament_id: id, team_id: teamId });
  }

  async function autoSeedTeams() {
    const updates = tournamentTeams.map((t, i) => ({ ...t, seed: i + 1 }));
    setTournamentTeams(updates);
    await Promise.all(updates.map((t) => supabase.from('tournament_teams').update({ seed: t.seed }).match({ tournament_id: id, team_id: t.id })));
  }

  // ─── Map pool ────────────────────────────────────────────────────────────────

  async function updateMapPool(stageId: string, pool: string[]) {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, map_rotation: pool } : s));
    await supabase.from('stages').update({ map_rotation: pool }).eq('id', stageId);
  }

  // ─── Archive ─────────────────────────────────────────────────────────────────

  function archiveTournament() {
    showConfirm('Archive this tournament?', async () => {
      await supabase.from('tournaments').update({ status: 'archived' }).eq('id', id);
      setTournament((t) => t ? { ...t, status: 'archived' } : t);
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function toggleExpanded(stageId: string) {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId); else next.add(stageId);
      return next;
    });
  }

  function matchCountdown(scheduledAt: string | null): string | null {
    if (!scheduledAt) return null;
    const diff = new Date(scheduledAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function availableTeams(stage: StageWithDetails): (Team & { seed: number | null })[] {
    const assigned = new Set(stage.groups.flatMap((g) => g.teams.map((t) => t.id)));
    return tournamentTeams.filter((t) => !assigned.has(t.id));
  }

  // ─── Computed ─────────────────────────────────────────────────────────────────

  const totalMatches = stages.flatMap((s) => s.matches).length;
  const liveMatches = stages.flatMap((s) => s.matches).filter((m) => m.status === 'live').length;
  const finishedMatches = stages.flatMap((s) => s.matches).filter((m) => m.status === 'finished').length;
  const pendingApps = applications.filter((a) => a.status === 'pending').length;

  const setupSteps: SetupStep[] = [
    {
      key: 'teams', label: 'Register Teams',
      description: tournamentTeams.length > 0 ? `${tournamentTeams.length} team${tournamentTeams.length !== 1 ? 's' : ''} registered` : 'No teams registered yet — share the registration link or add teams manually',
      done: tournamentTeams.length >= 2,
      action: tournamentTeams.length === 0 ? () => setActiveTab('applications') : undefined, actionLabel: 'Go to Applications',
    },
    {
      key: 'stages', label: 'Create Stages',
      description: stages.length > 0 ? `${stages.length} stage${stages.length !== 1 ? 's' : ''} configured` : 'Define your tournament pipeline — group stages, elimination, finals',
      done: stages.length > 0,
      action: stages.length === 0 ? () => setActiveTab('stages') : undefined, actionLabel: 'Set Up Stages',
    },
    {
      key: 'groups', label: 'Assign Teams to Groups',
      description: (() => {
        const total = stages.reduce((sum, s) => sum + s.groups.length, 0);
        const filled = stages.reduce((sum, s) => sum + s.groups.filter((g) => g.teams.length > 0).length, 0);
        if (total === 0) return stages.length > 0 ? 'Create groups within your stages first' : 'Create stages first';
        return `${filled}/${total} groups have teams assigned`;
      })(),
      done: (() => {
        const total = stages.reduce((sum, s) => sum + s.groups.length, 0);
        if (total === 0) return stages.length > 0 && stages.every((s) => s.stage_type === 'finals');
        return stages.every((s) => s.groups.every((g) => g.teams.length > 0));
      })(),
    },
    {
      key: 'matches', label: 'Schedule Matches',
      description: totalMatches > 0 ? `${totalMatches} match${totalMatches !== 1 ? 'es' : ''} created (${finishedMatches} finished, ${liveMatches} live)` : 'No matches created yet',
      done: totalMatches > 0,
      action: totalMatches === 0 ? () => setActiveTab('stages') : undefined, actionLabel: 'Go to Stages',
    },
    {
      key: 'points', label: 'Point System',
      description: pointSystem ? `${pointSystem.name} — ${pointSystem.kill_points} pt/kill` : 'No point system configured',
      done: !!pointSystem,
    },
  ];
  const completedSteps = setupSteps.filter((s) => s.done).length;
  const setupProgress = Math.round((completedSteps / setupSteps.length) * 100);
  const nextAction = setupSteps.find((s) => !s.done);

  // ─── Provide ─────────────────────────────────────────────────────────────────

  const value: TournamentContextValue = {
    tournamentId: id, tournament, setTournament, stages, pointSystem, tournamentTeams, loading,
    applications, setApplications, flags, disputes, templates, setTemplates,
    activeTab, setActiveTab, expandedStages, toggleExpanded,
    accepting, setAccepting, linkCopied, selectedApplicationIds, setSelectedApplicationIds,
    linkingTeams, stageStandings, standingsLoading, standingsStageId, setStandingsStageId,
    exportInclude, setExportInclude, applicationsLoaded, templatesLoaded,
    showToast, showConfirm, toast, setToast, confirmDialog, setConfirmDialog,
    totalMatches, liveMatches, finishedMatches, pendingApps,
    setupSteps, completedSteps, setupProgress, nextAction, availableTeams, matchCountdown,
    refreshStages, refreshTournamentTeams, refreshApplications, refreshTemplates, refreshOps, fetchStandings,
    createStagesFromPreset, addSingleStage, deleteStage, updateStageStatus, toggleStageAutoAdvance, updateStageAdvancing,
    addMatch, duplicateMatch, updateMatchMap, generateFinalsRotation,
    createDivisions, addTeamToGroup, removeTeamFromGroup, autoDistributeTeams,
    acceptApplication, acceptSelectedApplications, autoAcceptFirstN, rejectApplication,
    copyRegistrationLink, updateRegistrationSettings, linkAllTeamsToTournament,
    createTemplate,
    exportTournament, exportStage, exportGroup,
    archiveTournament,
    updateTeamSeed, autoSeedTeams,
    updateMapPool,
    GAME_MAPS, MAP_NAMES, STAGE_PRESETS, generateRotation,
  };

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}
