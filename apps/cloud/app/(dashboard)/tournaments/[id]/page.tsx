'use client';

import { useEffect, useState, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { MatchResultFlag, MatchDispute, Stage, Match, PointSystem, TeamApplication, TournamentTemplate, Team, StageGroup } from '@/lib/types';

type GroupWithTeams = StageGroup & { teams: Team[]; matches: Match[] };
type StageWithDetails = Stage & { matches: Match[]; groups: GroupWithTeams[] };
type Tab = 'overview' | 'stages' | 'applications' | 'ops';

const MAPS = ['Erangel', 'Miramar', 'Vikendi', 'Sanhok', 'Rondo', 'Deston', 'Nusa', 'Taego'];
const STAGE_PRESETS: Record<string, { name: string; type: Stage['stage_type'] }[]> = {
  groups_semis_finals: [
    { name: 'Groups', type: 'group' },
    { name: 'Semi-Finals', type: 'group' },
    { name: 'Grand Finals', type: 'finals' },
  ],
  groups_finals: [
    { name: 'Groups', type: 'group' },
    { name: 'Grand Finals', type: 'finals' },
  ],
  swiss_playoffs: [
    { name: 'Swiss', type: 'group' },
    { name: 'Playoffs', type: 'finals' },
  ],
};

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [tournament, setTournament] = useState<{
    id: string;
    name: string;
    status: string;
    api_key: string;
    registration_open: boolean;
    registration_mode: 'open' | 'cap' | 'pick_first';
    registration_limit: number | null;
    target_team_count: number | null;
    org_id: string;
  } | null>(null);
  const [stages, setStages] = useState<StageWithDetails[]>([]);
  const [pointSystem, setPointSystem] = useState<PointSystem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('stages');

  // Tournament teams (accepted teams linked to this tournament)
  const [tournamentTeams, setTournamentTeams] = useState<(Team & { seed: number | null })[]>([]);

  // Applications
  const [applications, setApplications] = useState<TeamApplication[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [selectFirstCount, setSelectFirstCount] = useState<number | ''>('');

  // Ops
  const [flags, setFlags] = useState<MatchResultFlag[]>([]);
  const [disputes, setDisputes] = useState<MatchDispute[]>([]);

  // Templates
  const [templates, setTemplates] = useState<TournamentTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateMatchesPerStage, setTemplateMatchesPerStage] = useState(4);
  const [templateTeamsPerStage, setTemplateTeamsPerStage] = useState<number | ''>('');
  const [templateAutoAssign, setTemplateAutoAssign] = useState(true);
  const [linkingTeams, setLinkingTeams] = useState(false);

  // Stage creation
  const [stagePreset, setStagePreset] = useState<'groups_semis_finals' | 'groups_finals' | 'swiss_playoffs' | 'custom'>('groups_semis_finals');
  const [customStageNames, setCustomStageNames] = useState('');
  const [matchesPerStageInput, setMatchesPerStageInput] = useState('6,4,6');
  const [addingStage, setAddingStage] = useState(false);
  const [stageName, setStageName] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);

  // Match form
  const [addingMatchTo, setAddingMatchTo] = useState<string | null>(null);
  const [matchName, setMatchName] = useState('');
  const [matchMap, setMatchMap] = useState('');

  // Group management
  const [creatingGroupFor, setCreatingGroupFor] = useState<string | null>(null);
  const [newGroupCount, setNewGroupCount] = useState(3);
  const [newGroupTeamCount, setNewGroupTeamCount] = useState<number | ''>(16);
  const [newGroupMatchCount, setNewGroupMatchCount] = useState(6);
  const [addingTeamToGroup, setAddingTeamToGroup] = useState<string | null>(null);

  // Expanded stage cards
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  // Export
  const [exportInclude, setExportInclude] = useState({
    tournament: true, stages: true, matches: true, results: true, teams: true, players: true,
  });

  // Inline toast (replaces alert())
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function showToast(message: string, type: 'error' | 'info' = 'error') {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  // Inline confirm dialog (replaces confirm())
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('tournaments').select('*').eq('id', id).single();
      if (!t) { router.push('/tournaments'); return; }
      setTournament(t);

      const { data: ps } = await supabase
        .from('point_systems').select('*').eq('tournament_id', id).limit(1).single();
      setPointSystem(ps);

      await Promise.all([refreshStages(), refreshApplications(), refreshTemplates(), refreshOps(), refreshTournamentTeams()]);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'ops') refreshOps();
  }, [activeTab]);

  // ─── Data refresh ───

  async function refreshStages() {
    const { data: stagesData } = await supabase
      .from('stages')
      .select('*')
      .eq('tournament_id', id)
      .order('stage_order');

    if (!stagesData) { setStages([]); return; }

    const stageIds = stagesData.map((s) => s.id);
    if (stageIds.length === 0) { setStages([]); return; }

    // Parallel: matches, groups (with nested group_teams→teams join)
    const [{ data: matchesData }, { data: groupsData }] = await Promise.all([
      supabase.from('matches').select('*').in('stage_id', stageIds),
      supabase.from('stage_groups').select('*, group_teams(team_id, teams(*))').in('stage_id', stageIds).order('group_order'),
    ]);

    const allMatches = matchesData ?? [];

    const enriched: StageWithDetails[] = stagesData.map((s) => {
      const stageMatches = allMatches.filter((m) => m.stage_id === s.id);
      return {
        ...s,
        matches: stageMatches,
        groups: (groupsData ?? [])
          .filter((g: any) => g.stage_id === s.id)
          .map((g: any) => ({
            id: g.id,
            stage_id: g.stage_id,
            name: g.name,
            group_order: g.group_order,
            team_count: g.team_count,
            created_at: g.created_at,
            teams: (g.group_teams ?? [])
              .map((gt: any) => gt.teams as Team)
              .filter(Boolean),
            matches: stageMatches.filter((m) => m.group_id === g.id),
          })),
      };
    });

    setStages(enriched);
    // Only auto-expand on first load (when nothing is expanded yet)
    setExpandedStages((prev) => prev.size === 0 ? new Set(enriched.map((s) => s.id)) : prev);
  }

  async function refreshTournamentTeams(): Promise<(Team & { seed: number | null })[]> {
    const res = await fetch(`/api/tournaments/${id}/teams`);
    if (!res.ok) {
      setTournamentTeams([]);
      return [];
    }
    const payload = await res.json();
    const teams = (payload.teams ?? []) as (Team & { seed: number | null })[];
    setTournamentTeams(teams);
    return teams;
  }

  async function refreshApplications() {
    const { data } = await supabase
      .from('team_applications')
      .select('*')
      .eq('tournament_id', id)
      .order('created_at', { ascending: false });
    setApplications((data as TeamApplication[]) ?? []);
  }

  async function refreshTemplates() {
    const { data } = await supabase
      .from('tournament_templates')
      .select('*')
      .eq('tournament_id', id)
      .order('created_at', { ascending: false });
    setTemplates((data as TournamentTemplate[]) ?? []);
  }

  async function refreshOps() {
    // Use cached stages to avoid extra query
    const matchIds = stages.flatMap((s) => s.matches.map((m) => m.id));
    if (matchIds.length === 0) { setFlags([]); setDisputes([]); return; }

    const [{ data: flagRows }, { data: disputeRows }] = await Promise.all([
      supabase.from('match_result_flags').select('*').in('match_id', matchIds),
      supabase.from('match_disputes').select('*').in('match_id', matchIds),
    ]);
    setFlags((flagRows as MatchResultFlag[]) ?? []);
    setDisputes((disputeRows as MatchDispute[]) ?? []);
  }

  // ─── Stage CRUD ───

  async function createStagesFromPreset() {
    let stageConfigs: { name: string; type: Stage['stage_type'] }[] = [];
    if (stagePreset === 'custom') {
      stageConfigs = customStageNames
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
        .map((name) => ({ name, type: 'group' as const }));
    } else {
      stageConfigs = STAGE_PRESETS[stagePreset] ?? [];
    }

    if (stageConfigs.length === 0) { showToast('Please provide at least one stage name.'); return; }

    const rawMatchCounts = matchesPerStageInput.trim();
    let matchCounts = stageConfigs.map(() => 0);
    if (rawMatchCounts) {
      const parsed = rawMatchCounts.split(',')
        .map((n) => Number(n.trim()))
        .filter((n) => Number.isFinite(n) && n >= 0);
      if (parsed.length === 1) {
        const finalsIdx = stageConfigs
          .map((cfg, idx) => (cfg.type === 'finals' ? idx : -1))
          .filter((idx) => idx >= 0);
        if (finalsIdx.length === 0) {
          showToast('No finals stage to apply match count.');
          return;
        }
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

    const { data: createdStages, error: stageError } = await supabase
      .from('stages')
      .insert(stageRows)
      .select('id, stage_type');

    if (stageError || !createdStages) {
      showToast(stageError?.message ?? 'Failed to create stages');
      return;
    }

    // Auto-create matches only for finals (group + elimination use divisions) — batched
    const allMatchRows = createdStages.flatMap((created, i) => {
      const cfg = stageConfigs[i];
      if (cfg.type !== 'finals') return [];
      const perStage = matchCounts[i] ?? 0;
      if (perStage <= 0) return [];
      const rotation = ['Erangel', 'Erangel', 'Erangel', 'Rondo', 'Miramar', 'Miramar'];
      return Array.from({ length: perStage }).map((_, idx) => ({
        stage_id: created.id,
        name: `Match ${idx + 1}`,
        map_name: rotation[idx % rotation.length],
        point_system_id: pointSystem?.id ?? null,
      }));
    });
    if (allMatchRows.length > 0) {
      await supabase.from('matches').insert(allMatchRows);
    }

    await refreshStages();
  }

  async function addSingleStage() {
    if (!stageName.trim()) return;
    const existingCount = stages.length;
    const hasActiveStage = stages.some((s) => s.status === 'active');

    await supabase.from('stages').insert({
      tournament_id: id,
      name: stageName.trim(),
      stage_order: existingCount + 1,
      status: hasActiveStage || existingCount > 0 ? 'pending' : 'active',
      stage_type: 'group',
    });

    setStageName('');
    setAddingStage(false);
    await refreshStages();
  }

  async function deleteStage(stageId: string) {
    setConfirmDialog({
      message: 'Delete this stage and all its matches?',
      onConfirm: async () => {
        setConfirmDialog(null);
        await supabase.from('stages').delete().eq('id', stageId);
        await refreshStages();
      },
    });
  }

  async function updateStageStatus(stageId: string, status: 'pending' | 'active' | 'completed') {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, status } : s));
    await supabase.from('stages').update({ status }).eq('id', stageId);
  }

  async function toggleStageAutoAdvance(stageId: string, nextValue: boolean) {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, auto_advance: nextValue } : s));
    await supabase.from('stages').update({ auto_advance: nextValue }).eq('id', stageId);
  }

  async function updateStageAdvancing(stageId: string, advancingCount: number | null, invitationalCount: number) {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, advancing_count: advancingCount, invitational_count: invitationalCount } : s));
    await supabase.from('stages').update({ advancing_count: advancingCount, invitational_count: invitationalCount }).eq('id', stageId);
  }

  // ─── Match CRUD ───

  async function addMatch(stageId: string, groupId?: string) {
    if (!matchName.trim()) return;
    await supabase.from('matches').insert({
      stage_id: stageId,
      group_id: groupId ?? null,
      name: matchName.trim(),
      map_name: matchMap || null,
      point_system_id: pointSystem?.id ?? null,
    });
    setMatchName('');
    setMatchMap('');
    setAddingMatchTo(null);
    await refreshStages();
  }

  async function updateMatchMap(matchId: string, mapName: string | null) {
    // Optimistic update — no full refresh needed
    setStages((prev) => prev.map((s) => ({
      ...s,
      matches: s.matches.map((m) => m.id === matchId ? { ...m, map_name: mapName } : m),
      groups: s.groups.map((g) => ({
        ...g,
        matches: g.matches.map((m) => m.id === matchId ? { ...m, map_name: mapName } : m),
      })),
    })));
    await supabase.from('matches').update({ map_name: mapName }).eq('id', matchId);
  }

  async function generateFinalsRotation(stage: StageWithDetails, sets: number) {
    if (sets <= 0) return;
    const rotation = ['Erangel', 'Erangel', 'Erangel', 'Rondo', 'Miramar', 'Miramar'];
    const startIndex = stage.matches.length;
    const count = rotation.length * sets;

    const rows = Array.from({ length: count }).map((_, idx) => ({
      stage_id: stage.id,
      name: `Match ${startIndex + idx + 1}`,
      map_name: rotation[(startIndex + idx) % rotation.length],
      point_system_id: pointSystem?.id ?? null,
    }));

    await supabase.from('matches').insert(rows);
    await refreshStages();
  }

  // ─── Group (Division) CRUD ───

  async function createDivisions(stageId: string) {
    const groupNames = Array.from({ length: newGroupCount }).map((_, i) => String.fromCharCode(65 + i));
    const teamCount = newGroupTeamCount === '' ? null : Number(newGroupTeamCount);
    const numMatches = Math.max(0, newGroupMatchCount || 0);

    await supabase.from('stages').update({ match_count: numMatches }).eq('id', stageId);

    const { data: createdGroups } = await supabase.from('stage_groups').insert(
      groupNames.map((name, idx) => ({
        stage_id: stageId,
        name: `Group ${name}`,
        group_order: idx + 1,
        team_count: teamCount,
      })),
    ).select('id, name');

    // Auto-create matches for all groups in one batch insert
    if (createdGroups && numMatches > 0) {
      const allMatchRows = createdGroups.flatMap((group) =>
        Array.from({ length: numMatches }).map((_, idx) => ({
          stage_id: stageId,
          group_id: group.id,
          name: `${group.name} - Match ${idx + 1}`,
          map_name: null,
          point_system_id: pointSystem?.id ?? null,
        }))
      );
      await supabase.from('matches').insert(allMatchRows);
    }

    setCreatingGroupFor(null);
    setNewGroupCount(3);
    setNewGroupTeamCount(16);
    setNewGroupMatchCount(6);
    await refreshStages();
  }

  async function addTeamToGroup(groupId: string, teamId: string) {
    await supabase.from('group_teams').insert({ group_id: groupId, team_id: teamId });
    setAddingTeamToGroup(null);
    await refreshStages();
  }

  async function removeTeamFromGroup(groupId: string, teamId: string) {
    await supabase.from('group_teams').delete().match({ group_id: groupId, team_id: teamId });
    await refreshStages();
  }

  async function autoDistributeTeams(stageId: string) {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage || stage.groups.length === 0) return;

    const freshTeams = await refreshTournamentTeams();

    if (freshTeams.length === 0) {
      showToast('No teams linked to this tournament. Link teams first before distributing.', 'error');
      return;
    }

    setConfirmDialog({
      message: `Distribute ${freshTeams.length} team${freshTeams.length !== 1 ? 's' : ''} across ${stage.groups.length} group${stage.groups.length !== 1 ? 's' : ''}? This clears existing assignments.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/tournaments/${id}/auto-distribute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stageId }),
          });
          if (!res.ok) {
            const err = await res.json();
            showToast('Failed to distribute: ' + (err.error ?? res.statusText));
            return;
          }
        } catch (e) {
          showToast('Failed to distribute: ' + String(e));
          return;
        }
        await refreshStages();
      },
    });
  }

  // ─── Application management ───

  async function acceptApplications(apps: TeamApplication[]) {
    if (apps.length === 0) return;

    let remainingSlots = Number.POSITIVE_INFINITY;
    if (tournament?.registration_mode !== 'open' && tournament?.registration_limit) {
      const { count } = await supabase
        .from('team_applications')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', id)
        .eq('status', 'accepted');
      remainingSlots = Math.max(0, tournament.registration_limit - (count ?? 0));
    }

    const toAccept = remainingSlots === Number.POSITIVE_INFINITY ? apps : apps.slice(0, remainingSlots);
    if (toAccept.length === 0) { showToast('Acceptance limit reached.', 'info'); setAccepting(null); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
    if (!profile?.org_id) { setAccepting(null); return; }

    for (const app of toAccept) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ org_id: profile.org_id, name: app.team_name, short_name: app.short_name || null, brand_color: app.brand_color })
        .select('id')
        .single();

      if (teamError || !team) continue;

      await supabase.from('tournament_teams').upsert(
        { tournament_id: id, team_id: team.id },
        { onConflict: 'tournament_id,team_id' },
      );

      if (app.players.length > 0) {
        await supabase.from('players').insert(
          app.players.map((p) => ({ team_id: team.id, display_name: p.display_name, player_open_id: p.player_open_id })),
        );
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
    const pending = applications
      .filter((a) => a.status === 'pending')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    await acceptApplications(pending);
  }

  function selectFirstNApplications() {
    const pending = applications
      .filter((a) => a.status === 'pending')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const count = Math.max(0, Number(selectFirstCount) || 0);
    setSelectedApplicationIds(pending.slice(0, count).map((a) => a.id));
  }

  async function rejectApplication(appId: string) {
    await supabase.from('team_applications').update({ status: 'rejected' }).eq('id', appId);
    await refreshApplications();
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

  // ─── Templates ───

  async function createTemplate() {
    if (!templateName.trim()) return;
    setTemplateSaving(true);
    await supabase.from('tournament_templates').insert({
      tournament_id: id,
      name: templateName.trim(),
      map_rotation: [],
      matches_per_stage: Math.max(0, Number(templateMatchesPerStage) || 0),
      teams_per_stage: templateTeamsPerStage === '' ? null : Number(templateTeamsPerStage),
      auto_assign: templateAutoAssign,
    });
    setTemplateName('');
    setTemplateMatchesPerStage(4);
    setTemplateTeamsPerStage('');
    setTemplateAutoAssign(true);
    await refreshTemplates();
    setTemplateSaving(false);
  }

  async function linkAllTeamsToTournament() {
    setLinkingTeams(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/link-registered-teams`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        showToast('Link failed: ' + (err.error ?? res.statusText));
        setLinkingTeams(false);
        return;
      }
      await refreshTournamentTeams();
    } catch (e) {
      showToast('Link failed: ' + String(e));
    }
    setLinkingTeams(false);
  }

  // ─── Other ───

  async function archiveTournament() {
    setConfirmDialog({
      message: 'Archive this tournament?',
      onConfirm: async () => {
        setConfirmDialog(null);
        await supabase.from('tournaments').update({ status: 'archived' }).eq('id', id);
        setTournament((t) => t ? { ...t, status: 'archived' } : t);
      },
    });
  }

  async function exportTournament() {
    const include = Object.entries(exportInclude).filter(([, e]) => e).map(([k]) => k).join(',');
    const res = await fetch(`/api/export-tournament/${id}?include=${encodeURIComponent(include)}`);
    if (!res.ok) { showToast('Export failed: ' + ((await res.json()).error ?? res.statusText)); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament?.name ?? 'tournament'}_export.zip`.replace(/[^a-zA-Z0-9._-]/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportGroup(groupId: string, groupName: string) {
    const res = await fetch(`/api/export-group/${groupId}`);
    if (!res.ok) {
      const err = await res.json();
      showToast('Export failed: ' + (err.error ?? res.statusText));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${groupName}_export.zip`.replace(/[^a-zA-Z0-9._-]/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportStage(stageId: string, stageName: string) {
    const res = await fetch(`/api/export-stage/${stageId}`);
    if (!res.ok) {
      const err = await res.json();
      showToast('Export failed: ' + (err.error ?? res.statusText));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stageName}_export.zip`.replace(/[^a-zA-Z0-9._-]/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleExpanded(stageId: string) {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  // ─── Render ───

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh]">
        <span className="loader" aria-label="Loading" />
      </div>
    );
  }
  if (!tournament) return null;

  const pendingApps = applications.filter((a) => a.status === 'pending').length;
  const totalMatches = stages.flatMap((s) => s.matches ?? []).length;
  const liveMatches = stages.flatMap((s) => s.matches ?? []).filter((m) => m.status === 'live').length;
  const finishedMatches = stages.flatMap((s) => s.matches ?? []).filter((m) => m.status === 'finished').length;

  // Teams already assigned to any group in a stage
  function assignedTeamIds(stage: StageWithDetails): Set<string> {
    const ids = new Set<string>();
    for (const g of stage.groups) {
      for (const t of g.teams) ids.add(t.id);
    }
    return ids;
  }

  // Teams available for group assignment (tournament teams not yet in any group of this stage)
  function availableTeams(stage: StageWithDetails): (Team & { seed: number | null })[] {
    const assigned = assignedTeamIds(stage);
    return tournamentTeams.filter((t) => !assigned.has(t.id));
  }

  return (
    <div className="p-10 max-w-[1400px] mx-auto page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-8 text-xs text-[var(--text-muted)]">
        <Link href="/tournaments" className="hover:text-[var(--text-primary)] transition-colors">Tournaments</Link>
        <span className="opacity-40">/</span>
        <span className="text-[var(--text-primary)]">{tournament.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{tournament.name}</h1>
            <span className={`text-[11px] uppercase font-semibold tracking-wide px-2.5 py-1 rounded-full border ${
              tournament.status === 'active' ? 'bg-[var(--bg-hover)] text-[var(--accent)] border-[var(--accent-border)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border)]'
            }`}>
              {tournament.status}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm flex items-center gap-3">
            <span>{stages.length} Stage{stages.length !== 1 ? 's' : ''}</span>
            <span className="text-[var(--border)]">&bull;</span>
            <span>{tournamentTeams.length} Team{tournamentTeams.length !== 1 ? 's' : ''}</span>
            <span className="text-[var(--border)]">&bull;</span>
            <span>{totalMatches} Match{totalMatches !== 1 ? 'es' : ''}</span>
          </p>
        </div>
        {tournament.status === 'active' && (
          <button onClick={archiveTournament}
            className="btn-ghost py-2">
            Archive Output
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-[var(--border)]">
        {(['overview', 'stages', 'applications', 'ops'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
              activeTab === tab ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="relative z-10 block translate-y-px">
              {tab === 'overview' ? 'Overview' : tab === 'stages' ? 'Stages' : tab === 'applications' ? 'Applications' : 'Ops'}
            </span>
            {tab === 'applications' && pendingApps > 0 && (
              <span className="relative z-10 bg-[var(--accent)] text-black text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center ml-1">
                {pendingApps}
              </span>
            )}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════ OVERVIEW TAB ════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in pb-32">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Teams', value: tournamentTeams.length, color: 'var(--text-primary)' },
              { label: 'Stages', value: stages.length, color: 'var(--text-primary)' },
              { label: 'Total Matches', value: totalMatches, color: 'var(--text-primary)' },
              { label: 'Live / Finished', value: `${liveMatches} / ${finishedMatches}`, color: liveMatches > 0 ? 'var(--red)' : 'var(--text-secondary)' },
            ].map((stat) => (
              <div key={stat.label} className="surface p-5 flex flex-col justify-between h-[92px]">
                <div className="text-xs font-semibold text-[var(--text-muted)]">{stat.label}</div>
                <div className="text-2xl font-semibold tracking-tight" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="surface p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-1.5 bg-[var(--text-primary)]" />
                <span className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)]">Cloud API Key</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/40 border border-[var(--border)] rounded-lg px-4 py-2.5 text-[13px] text-[var(--accent)] font-mono truncate">
                  {tournament.api_key}
                </code>
                <button onClick={() => navigator.clipboard.writeText(tournament.api_key)}
                  className="flex-shrink-0 text-xs font-display font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-white border border-[var(--border)] bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-lg transition-all">
                  Copy
                </button>
              </div>
            </div>
            <div className="surface p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 ${tournament.registration_open ? 'bg-[var(--accent)]' : 'bg-[var(--text-muted)]'}`} />
                  <span className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)]">Registration Link</span>
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${tournament.registration_open ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border)]'}`}>
                  {tournament.registration_open ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/40 border border-[var(--border)] rounded-lg px-4 py-2.5 text-[13px] text-[var(--accent)] font-mono truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/apply/${id}` : `/apply/${id}`}
                </code>
                <button onClick={copyRegistrationLink}
                  className={`flex-shrink-0 text-xs font-display font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all border ${
                    linkCopied 
                      ? 'text-[var(--accent)] border-[var(--accent)]/50 bg-[var(--accent)]/10' 
                      : 'text-[var(--text-muted)] hover:text-white border-[var(--border)] bg-white/5 hover:bg-white/10'
                  }`}>
                  {linkCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Point System */}
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
                {[
                  { rank: '1st', pts: 10 }, { rank: '2nd', pts: 6 }, { rank: '3rd', pts: 5 },
                  { rank: '4th', pts: 4 }, { rank: '5th', pts: 3 }, { rank: '6th', pts: 2 },
                  { rank: '7th', pts: 1 }, { rank: '8th', pts: 1 }, { rank: '9th+', pts: 0 },
                ].map(({ rank, pts }) => (
                  <div key={rank} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 text-center min-w-[60px]">
                    <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1">{rank}</div>
                    <div className={`text-base font-display font-black ${pts > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{pts}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage overview */}
          <div className="surface p-6">
            <h2 className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)] mb-4">Stage Pipeline</h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-2 shrink-0">
                  {i > 0 && <div className="text-[var(--text-muted)] text-xs mx-1 font-bold">...</div>}
                  <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 ${
                    stage.status === 'active' ? 'bg-[var(--bg-hover)] text-[var(--accent)] border-[var(--accent-border)]'
                    : stage.status === 'completed' ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--amber)] border-[var(--amber)]/20'
                  }`}>
                    <span className="text-xs font-display font-bold uppercase tracking-wider">{stage.name}</span>
                    <div className={`text-[10px] font-bold px-1.5 rounded-sm ${stage.status === 'active' ? 'bg-[var(--accent)]/20' : 'bg-black/40'}`}>
                      {stage.matches.length}
                    </div>
                  </div>
                </div>
              ))}
              {stages.length === 0 && <span className="text-[13px] text-[var(--text-secondary)] italic">No stages yet. Go to the Stages tab to create them.</span>}
            </div>
          </div>

          {/* Registered teams */}
          {tournamentTeams.length > 0 && (
            <div className="surface p-6">
              <h2 className="text-sm font-display font-bold uppercase tracking-widest text-[var(--text-primary)] mb-4 flex items-center justify-between">
                <span>Registered Teams</span>
                <div className="bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2 py-0.5 rounded text-[10px]">
                  {tournamentTeams.length} TOTAL
                </div>
              </h2>
              <div className="flex flex-wrap gap-2">
                {tournamentTeams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-hover)] rounded-md px-3 py-1.5 transition-colors">
                    <div className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: team.brand_color }} />
                    <span className="text-xs text-[var(--text-primary)] font-medium">{team.name}</span>
                    {team.short_name && <span className="text-[10px] text-[var(--text-muted)] font-bold">[{team.short_name}]</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ STAGES TAB ════════════════════ */}
      {activeTab === 'stages' && (
        <div className="space-y-6 animate-fade-in pb-32">
          {/* Stage creation bar */}
          {stages.length === 0 && (
            <div className="surface p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="text-sm font-display font-bold uppercase tracking-widest text-[var(--accent)] mb-2">Create Your Stage Pipeline</div>
              <p className="text-[13px] text-[var(--text-secondary)] mb-6 max-w-2xl">
                Choose a preset to create stages. Group stages support divisions (A, B, C...) for team grouping.
                Elimination and finals stages define how many teams advance.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={stagePreset}
                  onChange={(e) => setStagePreset(e.target.value as typeof stagePreset)}
                  className="input-premium py-2.5 w-auto"
                >
                  <option value="groups_semis_finals">Groups &rarr; Semi-Finals &rarr; Grand Finals</option>
                  <option value="groups_finals">Groups &rarr; Grand Finals</option>
                  <option value="swiss_playoffs">Swiss &rarr; Playoffs</option>
                  <option value="custom">Custom (comma-separated)</option>
                </select>
                {stagePreset === 'custom' && (
                  <input
                    type="text"
                    value={customStageNames}
                    onChange={(e) => setCustomStageNames(e.target.value)}
                    placeholder="e.g. Groups, Semi-Finals, Grand Finals"
                    className="input-premium py-2.5 w-80"
                  />
                )}
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Matches / stage</label>
                  <input
                    type="text"
                    value={matchesPerStageInput}
                    onChange={(e) => setMatchesPerStageInput(e.target.value)}
                    placeholder="e.g. 6,4,6"
                    className="input-premium py-2.5 w-32 text-center"
                  />
                </div>
                <button onClick={createStagesFromPreset}
                  className="btn-primary py-2.5">
                  Create Stages
                </button>
              </div>
            </div>
          )}

          {/* Existing stages - add more */}
          {stages.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 surface">
              <span className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mr-2">Pipeline Builder</span>
              <select
                value={stagePreset}
                onChange={(e) => setStagePreset(e.target.value as typeof stagePreset)}
                className="input-premium w-auto text-sm"
              >
                <option value="groups_semis_finals">Groups &rarr; Semis &rarr; Finals</option>
                <option value="groups_finals">Groups &rarr; Finals</option>
                <option value="swiss_playoffs">Swiss &rarr; Playoffs</option>
                <option value="custom">Custom</option>
              </select>
              {stagePreset === 'custom' && (
                <input type="text" value={customStageNames} onChange={(e) => setCustomStageNames(e.target.value)}
                  placeholder="Stage names (comma-separated)"
                  className="input-premium w-64 text-sm" />
              )}
              <button onClick={createStagesFromPreset}
                className="btn-primary">
                + Add Stages
              </button>
              <div className="w-[1px] h-6 bg-[var(--border)] mx-1" />
              <button onClick={linkAllTeamsToTournament} disabled={linkingTeams}
                className="btn-ghost text-xs">
                {linkingTeams ? 'Linking...' : 'Link registered teams'}
              </button>
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
                  ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border)]'
                  : 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20';
              const typeLabel = stage.stage_type === 'group' ? 'GROUP' : stage.stage_type === 'elimination' ? 'ELIMINATION' : 'FINALS';
              const typeColor = stage.stage_type === 'group' ? 'var(--accent)' : stage.stage_type === 'elimination' ? 'var(--amber)' : 'var(--red)';
              const canStart = stage.status === 'pending' && !stages.some((s) => s.status === 'active');

              return (
                <div key={stage.id} className={`surface transition-colors ${isExpanded ? 'border-[var(--border-hover)]' : ''}`}>
                  {/* Stage header */}
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                    onClick={() => toggleExpanded(stage.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-[10px] text-[var(--text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                        &#x25B6;
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeColor, boxShadow: `0 0 8px ${typeColor}80` }} />
                      <span className="font-display font-bold uppercase tracking-wider text-white text-sm">{stage.name}</span>
                      <span className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded border" style={{ color: typeColor, backgroundColor: 'transparent', borderColor: `${typeColor}40` }}>
                        {typeLabel}
                      </span>
                      <span className={`text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${statusClass}`}>
                        {stage.status}
                      </span>
                      
                      <div className="h-4 w-[1px] bg-[var(--border)] mx-1" />
                      
                      <span className="text-xs text-[var(--text-secondary)]">{stage.matches.length} match{stage.matches.length !== 1 ? 'es' : ''}</span>
                      {stage.groups.length > 0 && (
                        <>
                          <span className="text-[var(--border)]">&bull;</span>
                          <span className="text-xs text-[var(--text-secondary)]">{stage.groups.length} group{stage.groups.length !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleStageAutoAdvance(stage.id, !stage.auto_advance)}
                        className={`text-[10px] font-display font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-colors ${
                          stage.auto_advance ? 'border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-white bg-white/5'
                        }`}>
                        Auto-advance {stage.auto_advance ? 'On' : 'Off'}
                      </button>
                      {canStart && (
                        <button onClick={() => updateStageStatus(stage.id, 'active')}
                          className="text-xs font-display font-bold uppercase tracking-widest text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors px-2">
                          Start
                        </button>
                      )}
                      {stage.status === 'active' && (
                        <button onClick={() => updateStageStatus(stage.id, 'completed')}
                          className="text-xs font-display font-bold uppercase tracking-widest text-[var(--amber)] hover:text-white transition-colors px-2">
                          Complete
                        </button>
                      )}
                      <button onClick={() => deleteStage(stage.id)}
                        className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--red)] transition-colors px-2">
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)]">
                      {/* ─── Division management (all stages except finals) ─── */}
                      {stage.stage_type !== 'finals' && (
                        <div className="px-6 py-5 border-b border-[var(--border)] bg-black/20">
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest">Divisions</div>
                            <div className="flex items-center gap-3">
                              {stage.groups.length > 0 && (
                                <button onClick={() => autoDistributeTeams(stage.id)}
                                  className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors">
                                  Auto-distribute teams
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const next = creatingGroupFor === stage.id ? null : stage.id;
                                  setCreatingGroupFor(next);
                                  if (next) {
                                    setNewGroupMatchCount(stage.match_count ?? 6);
                                  }
                                }}
                                className="text-xs font-display font-bold uppercase tracking-widest text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors">
                                + Create Divisions
                              </button>
                            </div>
                          </div>

                          {/* Create divisions form */}
                          {creatingGroupFor === stage.id && (
                            <div className="surface p-5 mb-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Number of Groups</label>
                                  <input type="number" min={1} max={26} value={newGroupCount}
                                    onChange={(e) => setNewGroupCount(Number(e.target.value))}
                                    className="input-premium w-full" />
                                  <div className="text-[10px] text-[var(--text-muted)] mt-1.5 font-mono">
                                    {Array.from({ length: Math.min(newGroupCount, 26) }).map((_, i) => String.fromCharCode(65 + i)).join(', ')}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Teams per Group</label>
                                  <input type="number" min={1} value={newGroupTeamCount}
                                    onChange={(e) => setNewGroupTeamCount(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="e.g. 16"
                                    className="input-premium w-full" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-display font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Matches per Group</label>
                                  <input type="number" min={0} max={20} value={newGroupMatchCount}
                                    onChange={(e) => setNewGroupMatchCount(Number(e.target.value))}
                                    className="input-premium w-full" />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button onClick={() => createDivisions(stage.id)}
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

                          {/* Group cards — each with teams + matches */}
                          {stage.groups.length > 0 ? (
                            <div className="space-y-4">
                              {stage.groups.map((group) => (
                                <div key={group.id} className="surface overflow-hidden">
                                  {/* Group header */}
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
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => exportGroup(group.id, group.name)}
                                        className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                      >
                                        Export
                                      </button>
                                      <button onClick={() => setAddingTeamToGroup(addingTeamToGroup === group.id ? null : group.id)}
                                        className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors">
                                        + Team
                                      </button>
                                      <button onClick={() => { setAddingMatchTo(group.id); setMatchName(''); setMatchMap(''); }}
                                        className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors">
                                        + Match
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
                                    {/* Left: Teams */}
                                    <div className="px-4 py-3 bg-black/10">
                                      <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Teams</div>
                                      {addingTeamToGroup === group.id && (
                                        <div className="mb-3">
                                          <select
                                            onChange={(e) => { if (e.target.value) addTeamToGroup(group.id, e.target.value); }}
                                            defaultValue=""
                                            className="input-premium w-full py-1.5 px-2 text-xs"
                                          >
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
                                                <div className="w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: team.brand_color }} />
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
                                                <select
                                                  value={match.map_name ?? ''}
                                                  onChange={(e) => updateMatchMap(match.id, e.target.value || null)}
                                                  className="input-premium py-0.5 px-1.5 text-[10px]"
                                                >
                                                  <option value="">No map</option>
                                                  {MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <span className={`text-[9px] font-display font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                                                  match.status === 'finished' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
                                                  : match.status === 'live' ? 'bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/30'
                                                  : 'bg-white/5 text-[var(--text-muted)] border-[var(--border)]'
                                                }`}>
                                                  {match.status}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover/match:opacity-100 transition-all">
                                                <Link href={`/tournaments/${id}/stages/${stage.id}/matches/${match.id}`}
                                                  className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-white transition-colors">
                                                  View
                                                </Link>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {/* Add match to group form */}
                                      {addingMatchTo === group.id && (
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                                          <input type="text" autoFocus placeholder="Match name" value={matchName}
                                            onChange={(e) => setMatchName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') addMatch(stage.id, group.id); if (e.key === 'Escape') setAddingMatchTo(null); }}
                                            className="input-premium flex-1 py-1 px-2 text-xs" />
                                          <select value={matchMap} onChange={(e) => setMatchMap(e.target.value)}
                                            className="input-premium py-1 px-2 text-xs">
                                            <option value="">Map</option>
                                            {MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
                                          </select>
                                          <button onClick={() => addMatch(stage.id, group.id)}
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
                              No divisions created yet.<br/><span className="mt-1 block opcaity-70">Click &quot;Create Divisions&quot; to set up groups.</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ─── ELIMINATION / FINALS stage: Advancing config ─── */}
                      {(stage.stage_type === 'elimination' || stage.stage_type === 'finals') && (() => {
                        const prevGroupCount = prevStage?.groups?.length ?? 0;
                        const advCount = stage.advancing_count ?? 0;
                        const perGroup = prevGroupCount > 0 ? Math.ceil(advCount / prevGroupCount) : 0;
                        const totalAdvancing = advCount + (stage.stage_type === 'finals' ? stage.invitational_count : 0);

                        return (
                          <div className="px-5 py-4 border-b border-white/5 bg-black/10">
                            <div className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-3">Advancement Configuration</div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1">
                                  Teams advancing
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={stage.advancing_count ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    updateStageAdvancing(stage.id, val, stage.invitational_count);
                                  }}
                                  placeholder="e.g. 16"
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                                />
                                <div className="text-[10px] text-[#8b8da6] mt-1">
                                  From {prevStage?.name ?? 'previous stage'}
                                </div>
                              </div>

                              {/* Per-group qualification breakdown */}
                              {prevGroupCount > 0 && advCount > 0 && (
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1">
                                    Per Group
                                  </label>
                                  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                    <div className="text-lg font-bold text-[#ffd166]">Top {perGroup}</div>
                                    <div className="text-[10px] text-[#8b8da6]">
                                      from each of {prevGroupCount} group{prevGroupCount !== 1 ? 's' : ''} qualify
                                    </div>
                                  </div>
                                </div>
                              )}

                              {stage.stage_type === 'finals' && (
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1">
                                    Invitational Teams
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={stage.invitational_count}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      updateStageAdvancing(stage.id, stage.advancing_count, val);
                                    }}
                                    placeholder="0"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                                  />
                                  <div className="text-[10px] text-[#8b8da6] mt-1">
                                    Directly invited teams
                                  </div>
                                </div>
                              )}

                              <div className="flex items-end">
                                <div className="bg-[#00ffc3]/5 border border-[#00ffc3]/20 rounded-lg px-3 py-2 w-full">
                                  <div className="text-[10px] text-[#8b8da6] uppercase tracking-wider">Total in {stage.name}</div>
                                  <div className="text-xl font-black text-[#00ffc3]">{totalAdvancing}</div>
                                  {stage.stage_type === 'finals' && stage.invitational_count > 0 && (
                                    <div className="text-[10px] text-[#8b8da6]">
                                      {advCount} qualified + {stage.invitational_count} invited
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ─── Matches list (finals only) ─── */}
                      {stage.stage_type === 'finals' && (
                        <div>
                          <div className="flex items-center justify-between px-5 py-2.5 bg-black/10 border-b border-white/5">
                            <span className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider">Matches</span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">Rotation set</span>
                                <button
                                  onClick={() => generateFinalsRotation(stage, 1)}
                                  className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors"
                                >
                                  +6
                                </button>
                                <button
                                  onClick={() => generateFinalsRotation(stage, 2)}
                                  className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors"
                                >
                                  +12
                                </button>
                                <button
                                  onClick={() => generateFinalsRotation(stage, 3)}
                                  className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors"
                                >
                                  +18
                                </button>
                              </div>
                              <button
                                onClick={() => exportStage(stage.id, stage.name)}
                                className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors">
                                Export Stage
                              </button>
                              <button onClick={() => { setAddingMatchTo(stage.id); setMatchName(''); setMatchMap(''); }}
                                className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors">
                                + Add Match
                              </button>
                            </div>
                          </div>

                          {stage.matches.length > 0 ? (
                            stage.matches.map((match, i) => (
                              <div key={match.id}
                                className={`flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors ${i > 0 ? 'border-t border-white/5' : ''}`}>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-white">{match.name}</span>
                                  <select
                                    value={match.map_name ?? ''}
                                    onChange={(e) => updateMatchMap(match.id, e.target.value || null)}
                                    className="bg-[#0e1621] border border-white/10 rounded px-2 py-1 text-xs text-[#8b8da6] hover:text-white cursor-pointer focus:outline-none focus:border-[#00ffc3]/60 [&>option]:bg-[#0e1621] [&>option]:text-white"
                                  >
                                    <option value="">No map</option>
                                    {MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    match.status === 'finished' ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
                                    : match.status === 'live' ? 'bg-[#ff4e4e]/10 text-[#ff4e4e]'
                                    : 'bg-white/5 text-[#8b8da6]'
                                  }`}>
                                    {match.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Link href={`/tournaments/${id}/stages/${stage.id}/matches/${match.id}`}
                                    className="text-xs text-[#8b8da6] hover:text-white font-medium transition-colors">
                                    View
                                  </Link>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-5 py-4 text-center text-[#8b8da6] text-sm">
                              No matches yet.{' '}
                              <button onClick={() => setAddingMatchTo(stage.id)} className="text-[#00ffc3] hover:text-[#8b7ffe] transition-colors">
                                Add the first one
                              </button>
                            </div>
                          )}

                          {/* Add match form */}
                          {addingMatchTo === stage.id && (
                            <div className="border-t border-white/5 px-5 py-3 bg-black/20 flex items-center gap-3">
                              <input type="text" autoFocus placeholder="Match name (e.g. Game 1)" value={matchName}
                                onChange={(e) => setMatchName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addMatch(stage.id); if (e.key === 'Escape') setAddingMatchTo(null); }}
                                className="flex-1 bg-[#0e1621] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                              <select value={matchMap} onChange={(e) => setMatchMap(e.target.value)}
                                className="bg-[#0e1621] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffc3]/60 [&>option]:bg-[#0e1621] [&>option]:text-white">
                                <option value="">Map (optional)</option>
                                {MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <button onClick={() => addMatch(stage.id)}
                                className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
                                Add
                              </button>
                              <button onClick={() => setAddingMatchTo(null)}
                                className="text-[#8b8da6] hover:text-white text-sm px-2 transition-colors">
                                x
                              </button>
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

          {/* Manual add stage */}
          <details className="mt-3">
            <summary className="text-xs text-[#8b8da6] hover:text-white cursor-pointer select-none">
              Manual add stage (advanced)
            </summary>
            <div className="mt-3">
              {addingStage ? (
                <div className="bg-[#213448] border border-[#00ffc3]/30 rounded-2xl p-4 flex items-center gap-3">
                  <input type="text" autoFocus placeholder="Stage name" value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addSingleStage(); if (e.key === 'Escape') setAddingStage(false); }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                  <button onClick={addSingleStage}
                    className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                    Add Stage
                  </button>
                  <button onClick={() => setAddingStage(false)} className="text-[#8b8da6] hover:text-white text-sm px-2">x</button>
                </div>
              ) : (
                <button onClick={() => setAddingStage(true)}
                  className="w-full border border-dashed border-white/10 hover:border-[#00ffc3]/40 rounded-2xl py-3.5 text-[#8b8da6] hover:text-[#00ffc3] text-sm font-medium transition-colors">
                  + Add Stage
                </button>
              )}
            </div>
          </details>

          {/* Template management */}
          <details className="mt-3">
            <summary className="text-xs text-[#8b8da6] hover:text-white cursor-pointer select-none">
              Match templates
            </summary>
            <div className="mt-3 bg-[#213448] border border-white/10 rounded-2xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">Template Name</label>
                  <input type="text" placeholder="Template name" value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">Matches/Stage</label>
                    <input type="number" min={0} value={templateMatchesPerStage}
                      onChange={(e) => setTemplateMatchesPerStage(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">Teams/Stage</label>
                    <input type="number" min={0} value={templateTeamsPerStage}
                      onChange={(e) => setTemplateTeamsPerStage(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="All"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <label className="flex items-center gap-2 text-xs text-[#8b8da6]">
                  <input type="checkbox" checked={templateAutoAssign}
                    onChange={(e) => setTemplateAutoAssign(e.target.checked)} className="accent-[#00ffc3]" />
                  Auto-assign teams
                </label>
                <button onClick={createTemplate} disabled={templateSaving || !templateName.trim()}
                  className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  {templateSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
              {templates.length > 0 && (
                <div className="mt-3 border-t border-white/5 pt-3">
                  <div className="text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">Saved Templates</div>
                  {templates.map((t) => (
                    <div key={t.id} className="text-xs text-white/70 py-0.5">
                      {t.name} &mdash; {t.matches_per_stage} matches{t.teams_per_stage ? `, ${t.teams_per_stage} teams` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* ════════════════════ APPLICATIONS TAB ════════════════════ */}
      {activeTab === 'applications' && (
        <div className="space-y-3">
          <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-white">Registration Settings</div>
                <div className="text-xs text-[#8b8da6] mt-0.5">Flexible modes for team intake</div>
              </div>
              <div className="flex items-center gap-2">
                {tournament?.registration_mode === 'pick_first' && (
                  <>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} value={selectFirstCount}
                        onChange={(e) => setSelectFirstCount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="N"
                        className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                      <button onClick={selectFirstNApplications}
                        className="bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                        Select first N
                      </button>
                    </div>
                    <button onClick={autoAcceptFirstN}
                      className="bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                      Auto-accept
                    </button>
                    <button onClick={acceptSelectedApplications}
                      className="bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                      Accept selected
                    </button>
                  </>
                )}
                <button onClick={updateRegistrationSettings}
                  className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  Save
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">Mode</label>
                <select value={tournament?.registration_mode ?? 'open'}
                  onChange={(e) => setTournament((t) => t ? { ...t, registration_mode: e.target.value as 'open' | 'cap' | 'pick_first' } : t)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffc3]/60 transition-colors">
                  <option value="open">Open (no cap)</option>
                  <option value="cap">Fixed slots (auto-close)</option>
                  <option value="pick_first">Open + pick first N</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">Limit</label>
                <input type="number" min={0} value={tournament?.registration_limit ?? ''}
                  onChange={(e) => setTournament((t) => t ? { ...t, registration_limit: e.target.value === '' ? null : Number(e.target.value) } : t)}
                  placeholder="e.g. 60"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-xs text-[#8b8da6]">
                  <input type="checkbox" checked={tournament?.registration_open ?? true}
                    onChange={(e) => setTournament((t) => t ? { ...t, registration_open: e.target.checked } : t)}
                    className="accent-[#00ffc3]" />
                  Registration open
                </label>
              </div>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="bg-[#213448] border border-dashed border-white/10 rounded-2xl p-12 text-center">
              <h3 className="text-white font-semibold mb-1">No applications yet</h3>
              <p className="text-[#8b8da6] text-sm mb-4">Share the registration link with teams to start receiving applications.</p>
              <button onClick={copyRegistrationLink}
                className="inline-flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
                {linkCopied ? 'Copied!' : 'Copy Registration Link'}
              </button>
            </div>
          ) : (
            applications.map((app) => {
              const isPending = app.status === 'pending';
              const isAccepted = app.status === 'accepted';
              return (
                <div key={app.id}
                  className={`bg-[#213448] border rounded-2xl overflow-hidden ${isPending ? 'border-[#00ffc3]/20' : 'border-white/10'}`}>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {tournament?.registration_mode === 'pick_first' && (
                        <input type="checkbox" checked={selectedApplicationIds.includes(app.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedApplicationIds((p) => [...p, app.id]);
                            else setSelectedApplicationIds((p) => p.filter((x) => x !== app.id));
                          }}
                          disabled={!isPending} className="accent-[#00ffc3]" />
                      )}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ backgroundColor: app.brand_color + '33', border: `1.5px solid ${app.brand_color}55` }}>
                        <span style={{ color: app.brand_color }}>
                          {(app.short_name ?? app.team_name).substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate">{app.team_name}</span>
                          {app.short_name && <span className="text-xs text-[#8b8da6]">[{app.short_name}]</span>}
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isPending ? 'bg-amber-500/15 text-amber-400'
                            : isAccepted ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
                            : 'bg-[#ff4e4e]/10 text-[#ff4e4e]'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-[#8b8da6]">{app.players.length} player{app.players.length !== 1 ? 's' : ''}</span>
                          {app.contact_email && <span className="text-xs text-[#8b8da6]">{app.contact_email}</span>}
                          <span className="text-xs text-[#8b8da6]">{new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {isPending && (
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <button onClick={() => acceptApplication(app)} disabled={accepting === app.id}
                          className="bg-[#00ffc3] hover:bg-[#00e6af] disabled:opacity-50 text-[#0e1621] text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                          {accepting === app.id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button onClick={() => rejectApplication(app.id)}
                          className="text-xs text-[#8b8da6] hover:text-[#ff4e4e] border border-white/10 hover:border-[#ff4e4e]/30 px-3 py-2 rounded-lg transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-white/5 px-5 py-3 bg-black/10">
                    <div className="grid grid-cols-[1fr_1fr] gap-2 mb-1.5">
                      <span className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">Display Name</span>
                      <span className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">In-Game ID</span>
                    </div>
                    {app.players.map((p, pi) => (
                      <div key={pi} className="grid grid-cols-[1fr_1fr] gap-2 py-1">
                        <span className="text-sm text-white">{p.display_name}</span>
                        <span className="text-sm text-[#8b8da6] font-mono">{p.player_open_id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ════════════════════ OPS TAB ════════════════════ */}
      {activeTab === 'ops' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Stages', value: stages.length, color: '#00ffc3' },
              { label: 'Matches', value: totalMatches, color: '#8b8da6' },
              { label: 'Flags', value: flags.length, color: '#ff4e4e' },
              { label: 'Open Disputes', value: disputes.filter((d) => d.status === 'open' || d.status === 'under_review').length, color: '#ffd166' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#213448] border border-white/10 rounded-xl p-4">
                <div className="text-xs text-[#8b8da6] uppercase tracking-wider">{stat.label}</div>
                <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-white">Backup & Export</div>
                <div className="text-xs text-[#8b8da6] mt-0.5">Export tournament data as a ZIP of JSON files</div>
              </div>
              <button onClick={exportTournament}
                className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Export ZIP
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(exportInclude).map(([key, enabled]) => (
                <label key={key} className="flex items-center gap-2 text-xs text-[#8b8da6]">
                  <input type="checkbox" checked={enabled}
                    onChange={(e) => setExportInclude((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="accent-[#00ffc3]" />
                  {key}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-[#213448] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <div className="text-sm font-semibold text-white">Recent Flags</div>
            </div>
            {flags.length === 0 ? (
              <div className="px-5 py-6 text-center text-[#8b8da6] text-sm">No flags found.</div>
            ) : (
              flags.slice(0, 8).map((f, i) => (
                <div key={f.id} className={`px-5 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                  <div className="text-xs text-[#ff4e4e] font-semibold">{f.code}</div>
                  <div className="text-sm text-white/90">{f.message}</div>
                  <div className="text-[10px] text-[#8b8da6] mt-1">{new Date(f.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>

          <div className="bg-[#213448] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <div className="text-sm font-semibold text-white">Open Disputes</div>
            </div>
            {disputes.filter((d) => d.status === 'open' || d.status === 'under_review').length === 0 ? (
              <div className="px-5 py-6 text-center text-[#8b8da6] text-sm">No open disputes.</div>
            ) : (
              disputes
                .filter((d) => d.status === 'open' || d.status === 'under_review')
                .slice(0, 8)
                .map((d, i) => (
                  <div key={d.id} className={`px-5 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                    <div className="text-xs text-amber-400 font-semibold">{d.status}</div>
                    <div className="text-sm text-white/90">{d.reason}</div>
                    <div className="text-[10px] text-[#8b8da6] mt-1">{new Date(d.created_at).toLocaleString()}</div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ─── Toast notification ─── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm text-sm animate-in slide-in-from-bottom-2 ${
          toast.type === 'error'
            ? 'bg-red-950/90 border-red-800/60 text-red-200'
            : 'bg-[var(--bg-card)]/90 border-[var(--border)] text-[var(--text-primary)]'
        }`}>
          <div className="flex items-start gap-3">
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-white/40 hover:text-white/80 shrink-0">&times;</button>
          </div>
        </div>
      )}

      {/* ─── Confirm dialog ─── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="surface max-w-md w-full mx-4 p-6 rounded-xl shadow-2xl border border-[var(--border)]">
            <p className="text-sm text-[var(--text-primary)] mb-6">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)}
                className="btn-ghost py-2 px-4 text-sm">
                Cancel
              </button>
              <button onClick={confirmDialog.onConfirm}
                className="btn-primary py-2 px-4 text-sm">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
