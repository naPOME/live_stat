'use client';

import { useEffect, useState, use } from 'react';
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
  const supabase = createClient();

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
  const [matchesPerStageInput, setMatchesPerStageInput] = useState('');
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

    // Load matches and groups for each stage
    const stageIds = stagesData.map((s) => s.id);

    const [{ data: matchesData }, { data: groupsData }] = await Promise.all([
      supabase.from('matches').select('*').in('stage_id', stageIds),
      supabase.from('stage_groups').select('*').in('stage_id', stageIds).order('group_order'),
    ]);

    // Load group_teams with team details
    const groupIds = (groupsData ?? []).map((g) => g.id);
    const { data: groupTeamsData } = groupIds.length > 0
      ? await supabase.from('group_teams').select('group_id, team_id').in('group_id', groupIds)
      : { data: [] };

    // Load team details for group teams
    const groupTeamIds = [...new Set((groupTeamsData ?? []).map((gt) => gt.team_id))];
    const { data: teamsData } = groupTeamIds.length > 0
      ? await supabase.from('teams').select('*').in('id', groupTeamIds)
      : { data: [] };
    const teamsMap = new Map((teamsData ?? []).map((t) => [t.id, t]));

    const allMatches = matchesData ?? [];

    const enriched: StageWithDetails[] = stagesData.map((s) => {
      const stageMatches = allMatches.filter((m) => m.stage_id === s.id);
      return {
        ...s,
        // Stage-level matches = all matches for this stage (includes group ones)
        matches: stageMatches,
        groups: (groupsData ?? [])
          .filter((g) => g.stage_id === s.id)
          .map((g) => ({
            ...g,
            teams: (groupTeamsData ?? [])
              .filter((gt) => gt.group_id === g.id)
              .map((gt) => teamsMap.get(gt.team_id))
              .filter(Boolean) as Team[],
            // Matches assigned to this group
            matches: stageMatches.filter((m) => m.group_id === g.id),
          })),
      };
    });

    setStages(enriched);
    // Auto-expand all stages
    setExpandedStages(new Set(enriched.map((s) => s.id)));
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
    const { data: stageRows } = await supabase.from('stages').select('id').eq('tournament_id', id);
    const stageIds = (stageRows ?? []).map((s) => s.id);
    const { data: matchRows } = stageIds.length > 0
      ? await supabase.from('matches').select('id').in('stage_id', stageIds)
      : { data: [] };
    const matchIds = (matchRows ?? []).map((m) => m.id);
    const { data: flagRows } = matchIds.length > 0
      ? await supabase.from('match_result_flags').select('*').in('match_id', matchIds)
      : { data: [] };
    setFlags((flagRows as MatchResultFlag[]) ?? []);
    const { data: disputeRows } = matchIds.length > 0
      ? await supabase.from('match_disputes').select('*').in('match_id', matchIds)
      : { data: [] };
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

    if (stageConfigs.length === 0) { alert('Please provide at least one stage name.'); return; }

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
          alert('No finals stage to apply match count.');
          return;
        }
        for (const idx of finalsIdx) matchCounts[idx] = parsed[0];
      } else if (parsed.length === stageConfigs.length) {
        matchCounts = parsed;
      } else {
        alert('Matches input should be one number (finals only) or match the number of stages.');
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
      alert(stageError?.message ?? 'Failed to create stages');
      return;
    }

    // Auto-create matches only for finals (group + elimination use divisions)
    if (matchCounts.some((c) => c > 0)) {
      for (let i = 0; i < createdStages.length; i++) {
        const created = createdStages[i];
        const cfg = stageConfigs[i];
        if (cfg.type !== 'finals') continue; // divisions handle groups + elimination

        const perStage = matchCounts[i] ?? 0;
        if (perStage <= 0) continue;
        const matchRows = Array.from({ length: perStage }).map((_, idx) => ({
          stage_id: created.id,
          name: `Match ${idx + 1}`,
          map_name: null,
          point_system_id: pointSystem?.id ?? null,
        }));
        await supabase.from('matches').insert(matchRows);
      }
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
    if (!confirm('Delete this stage and all its matches?')) return;
    await supabase.from('stages').delete().eq('id', stageId);
    await refreshStages();
  }

  async function updateStageStatus(stageId: string, status: 'pending' | 'active' | 'completed') {
    await supabase.from('stages').update({ status }).eq('id', stageId);
    await refreshStages();
  }

  async function toggleStageAutoAdvance(stageId: string, nextValue: boolean) {
    await supabase.from('stages').update({ auto_advance: nextValue }).eq('id', stageId);
    await refreshStages();
  }

  async function updateStageAdvancing(stageId: string, advancingCount: number | null, invitationalCount: number) {
    await supabase.from('stages').update({ advancing_count: advancingCount, invitational_count: invitationalCount }).eq('id', stageId);
    await refreshStages();
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
    await supabase.from('matches').update({ map_name: mapName }).eq('id', matchId);
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

    // Auto-create matches for each group
    if (createdGroups && numMatches > 0) {
      for (const group of createdGroups) {
        const matchRows = Array.from({ length: numMatches }).map((_, idx) => ({
          stage_id: stageId,
          group_id: group.id,
          name: `${group.name} - Match ${idx + 1}`,
          map_name: null,
          point_system_id: pointSystem?.id ?? null,
        }));
        await supabase.from('matches').insert(matchRows);
      }
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

    if (!confirm(`Distribute ${freshTeams.length} team${freshTeams.length !== 1 ? 's' : ''} across ${stage.groups.length} group${stage.groups.length !== 1 ? 's' : ''}? This clears existing assignments.`)) return;

    try {
      const res = await fetch(`/api/tournaments/${id}/auto-distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Failed to distribute: ' + (err.error ?? res.statusText));
        return;
      }
    } catch (e) {
      alert('Failed to distribute: ' + String(e));
      return;
    }

    await refreshStages();
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
    if (toAccept.length === 0) { alert('Acceptance limit reached.'); setAccepting(null); return; }

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
        alert('Link failed: ' + (err.error ?? res.statusText));
        setLinkingTeams(false);
        return;
      }
      await refreshTournamentTeams();
    } catch (e) {
      alert('Link failed: ' + String(e));
    }
    setLinkingTeams(false);
  }

  // ─── Other ───

  async function archiveTournament() {
    if (!confirm('Archive this tournament?')) return;
    await supabase.from('tournaments').update({ status: 'archived' }).eq('id', id);
    setTournament((t) => t ? { ...t, status: 'archived' } : t);
  }

  async function exportTournament() {
    const include = Object.entries(exportInclude).filter(([, e]) => e).map(([k]) => k).join(',');
    const res = await fetch(`/api/export-tournament/${id}?include=${encodeURIComponent(include)}`);
    if (!res.ok) { alert('Export failed: ' + ((await res.json()).error ?? res.statusText)); return; }
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
      alert('Export failed: ' + (err.error ?? res.statusText));
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
      alert('Export failed: ' + (err.error ?? res.statusText));
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
    return <div className="p-8 flex items-center justify-center"><div className="text-[#8b8da6]">Loading...</div></div>;
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
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6 text-sm">
        <Link href="/tournaments" className="text-[#8b8da6] hover:text-white transition-colors">Tournaments</Link>
        <span className="text-[#8b8da6]/40">/</span>
        <span className="text-white">{tournament.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              tournament.status === 'active' ? 'bg-[#00ffc3]/10 text-[#00ffc3]' : 'bg-white/5 text-[#8b8da6]'
            }`}>
              {tournament.status}
            </span>
          </div>
          <p className="text-[#8b8da6] text-sm">
            {stages.length} stage{stages.length !== 1 ? 's' : ''} &middot; {tournamentTeams.length} team{tournamentTeams.length !== 1 ? 's' : ''} &middot; {totalMatches} match{totalMatches !== 1 ? 'es' : ''}
          </p>
        </div>
        {tournament.status === 'active' && (
          <button onClick={archiveTournament}
            className="text-xs text-[#8b8da6] hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
            Archive
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#213448] border border-white/10 rounded-xl p-1 w-fit">
        {(['overview', 'stages', 'applications', 'ops'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab ? 'bg-white/10 text-white' : 'text-[#8b8da6] hover:text-white'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'stages' ? 'Stages' : tab === 'applications' ? 'Applications' : 'Ops'}
            {tab === 'applications' && pendingApps > 0 && (
              <span className="bg-[#00ffc3] text-[#0e1621] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pendingApps}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════ OVERVIEW TAB ════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Teams', value: tournamentTeams.length, color: '#00ffc3' },
              { label: 'Stages', value: stages.length, color: '#8b8da6' },
              { label: 'Total Matches', value: totalMatches, color: '#8b8da6' },
              { label: 'Live / Finished', value: `${liveMatches} / ${finishedMatches}`, color: liveMatches > 0 ? '#ff4e4e' : '#00ffc3' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#213448] border border-white/10 rounded-xl p-4">
                <div className="text-xs text-[#8b8da6] uppercase tracking-wider">{stat.label}</div>
                <div className="text-2xl font-black mt-1" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
              <span className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider">Cloud API Key</span>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-xs text-[#00ffc3] font-mono truncate">
                  {tournament.api_key}
                </code>
                <button onClick={() => navigator.clipboard.writeText(tournament.api_key)}
                  className="flex-shrink-0 text-xs text-[#8b8da6] hover:text-white border border-white/10 px-3 py-2 rounded-lg hover:border-white/20 transition-colors">
                  Copy
                </button>
              </div>
            </div>
            <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider">Registration Link</span>
                <span className="text-xs text-[#8b8da6]">{tournament.registration_open ? 'Open' : 'Closed'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-xs text-[#00ffc3] font-mono truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/apply/${id}` : `/apply/${id}`}
                </code>
                <button onClick={copyRegistrationLink}
                  className="flex-shrink-0 text-xs text-[#8b8da6] hover:text-white border border-white/10 px-3 py-2 rounded-lg hover:border-white/20 transition-colors">
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Point System */}
          {pointSystem && (
            <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
              <div className="text-sm font-semibold text-white mb-1">Point System</div>
              <div className="text-xs text-[#8b8da6] mb-3">{pointSystem.name} &mdash; {pointSystem.kill_points} pt/kill</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { rank: '1st', pts: 10 }, { rank: '2nd', pts: 6 }, { rank: '3rd', pts: 5 },
                  { rank: '4th', pts: 4 }, { rank: '5th', pts: 3 }, { rank: '6th', pts: 2 },
                  { rank: '7th', pts: 1 }, { rank: '8th', pts: 1 }, { rank: '9th+', pts: 0 },
                ].map(({ rank, pts }) => (
                  <div key={rank} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-center min-w-[52px]">
                    <div className="text-[10px] text-[#8b8da6]">{rank}</div>
                    <div className={`text-sm font-mono ${pts > 0 ? 'text-[#00ffc3]' : 'text-[#8b8da6]'}`}>{pts}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage overview */}
          <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
            <div className="text-sm font-semibold text-white mb-3">Stage Pipeline</div>
            <div className="flex items-center gap-2">
              {stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-2">
                  {i > 0 && <div className="text-[#8b8da6] text-xs">-&gt;</div>}
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    stage.status === 'active' ? 'bg-[#00ffc3]/10 text-[#00ffc3] border-[#00ffc3]/30'
                    : stage.status === 'completed' ? 'bg-white/10 text-[#8b8da6] border-white/10'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {stage.name}
                    <span className="ml-1.5 opacity-60">({stage.matches.length})</span>
                  </div>
                </div>
              ))}
              {stages.length === 0 && <span className="text-[#8b8da6] text-sm">No stages yet. Go to the Stages tab to create them.</span>}
            </div>
          </div>

          {/* Registered teams */}
          {tournamentTeams.length > 0 && (
            <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
              <div className="text-sm font-semibold text-white mb-3">Registered Teams ({tournamentTeams.length})</div>
              <div className="flex flex-wrap gap-2">
                {tournamentTeams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.brand_color }} />
                    <span className="text-xs text-white font-medium">{team.name}</span>
                    {team.short_name && <span className="text-[10px] text-[#8b8da6]">[{team.short_name}]</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ STAGES TAB ════════════════════ */}
      {activeTab === 'stages' && (
        <>
          {/* Stage creation bar */}
          {stages.length === 0 && (
            <div className="bg-gradient-to-br from-[#00ffc3]/5 to-transparent border border-[#00ffc3]/20 rounded-2xl p-6 mb-4">
              <div className="text-sm font-semibold text-white mb-1">Create Your Stage Pipeline</div>
              <p className="text-xs text-[#8b8da6] mb-4">
                Choose a preset to create stages. Group stages support divisions (A, B, C...) for team grouping.
                Elimination and finals stages define how many teams advance.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={stagePreset}
                  onChange={(e) => setStagePreset(e.target.value as typeof stagePreset)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
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
                    className="w-80 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                  />
                )}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold whitespace-nowrap">Matches / stage</label>
                  <input
                    type="text"
                    value={matchesPerStageInput}
                    onChange={(e) => setMatchesPerStageInput(e.target.value)}
                    placeholder="e.g. 6,4,6"
                    className="w-32 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white placeholder-white/20 text-center focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                  />
                </div>
                <button onClick={createStagesFromPreset}
                  className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                  Create Stages
                </button>
              </div>
            </div>
          )}

          {/* Existing stages - add more */}
          {stages.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <select
                value={stagePreset}
                onChange={(e) => setStagePreset(e.target.value as typeof stagePreset)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
              >
                <option value="groups_semis_finals">Groups &rarr; Semis &rarr; Finals</option>
                <option value="groups_finals">Groups &rarr; Finals</option>
                <option value="swiss_playoffs">Swiss &rarr; Playoffs</option>
                <option value="custom">Custom</option>
              </select>
              {stagePreset === 'custom' && (
                <input type="text" value={customStageNames} onChange={(e) => setCustomStageNames(e.target.value)}
                  placeholder="Stage names (comma-separated)"
                  className="w-64 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
              )}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold whitespace-nowrap">Matches (finals only)</label>
                <input
                  type="text"
                  value={matchesPerStageInput}
                  onChange={(e) => setMatchesPerStageInput(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white placeholder-white/20 text-center focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                />
              </div>
              <button onClick={createStagesFromPreset}
                className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                + Add Stages
              </button>
              <button onClick={linkAllTeamsToTournament} disabled={linkingTeams}
                className="text-xs text-[#8b8da6] hover:text-white border border-white/10 px-3 py-2 rounded-lg hover:border-white/20 transition-colors">
                {linkingTeams ? 'Linking...' : 'Link registered teams'}
              </button>
            </div>
          )}

          {/* Stage Cards */}
          <div className="space-y-4">
            {stages.map((stage, stageIdx) => {
              const isExpanded = expandedStages.has(stage.id);
              const prevStage = stageIdx > 0 ? stages[stageIdx - 1] : null;
              const statusClass = stage.status === 'active'
                ? 'bg-[#00ffc3]/10 text-[#00ffc3] border-[#00ffc3]/30'
                : stage.status === 'completed'
                  ? 'bg-white/10 text-[#8b8da6] border-white/10'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              const typeLabel = stage.stage_type === 'group' ? 'GROUP' : stage.stage_type === 'elimination' ? 'ELIMINATION' : 'FINALS';
              const typeColor = stage.stage_type === 'group' ? '#00ffc3' : stage.stage_type === 'elimination' ? '#ffd166' : '#ff4e4e';
              const canStart = stage.status === 'pending' && !stages.some((s) => s.status === 'active');

              return (
                <div key={stage.id} className="bg-[#213448] border border-white/10 rounded-2xl overflow-hidden">
                  {/* Stage header */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => toggleExpanded(stage.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#8b8da6] text-xs select-none">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColor }} />
                      <span className="font-semibold text-white text-base">{stage.name}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ color: typeColor, backgroundColor: typeColor + '15', border: `1px solid ${typeColor}30` }}>
                        {typeLabel}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}>
                        {stage.status}
                      </span>
                      <span className="text-xs text-[#8b8da6]">{stage.matches.length} match{stage.matches.length !== 1 ? 'es' : ''}</span>
                      {stage.groups.length > 0 && (
                        <span className="text-xs text-[#8b8da6]">&middot; {stage.groups.length} group{stage.groups.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleStageAutoAdvance(stage.id, !stage.auto_advance)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                          stage.auto_advance ? 'border-[#00ffc3]/40 text-[#00ffc3] bg-[#00ffc3]/10' : 'border-white/10 text-[#8b8da6] bg-white/5'
                        }`}>
                        Auto-advance {stage.auto_advance ? 'On' : 'Off'}
                      </button>
                      {canStart && (
                        <button onClick={() => updateStageStatus(stage.id, 'active')}
                          className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors">
                          Start
                        </button>
                      )}
                      {stage.status === 'active' && (
                        <button onClick={() => updateStageStatus(stage.id, 'completed')}
                          className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
                          Complete
                        </button>
                      )}
                      <button onClick={() => deleteStage(stage.id)}
                        className="text-xs text-[#8b8da6] hover:text-[#ff4e4e] transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-white/5">
                      {/* ─── Division management (all stages except finals) ─── */}
                      {stage.stage_type !== 'finals' && (
                        <div className="px-5 py-4 border-b border-white/5 bg-black/10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider">Divisions</div>
                            <div className="flex items-center gap-2">
                              {stage.groups.length > 0 && (
                                <button onClick={() => autoDistributeTeams(stage.id)}
                                  className="text-[10px] text-[#00ffc3] hover:text-[#8b7ffe] font-semibold transition-colors">
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
                                className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors">
                                + Create Divisions
                              </button>
                            </div>
                          </div>

                          {/* Create divisions form */}
                          {creatingGroupFor === stage.id && (
                            <div className="bg-[#1a2a3a] border border-[#00ffc3]/20 rounded-xl p-4 mb-3">
                              <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1">Number of Groups</label>
                                  <input type="number" min={1} max={26} value={newGroupCount}
                                    onChange={(e) => setNewGroupCount(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                                  <div className="text-[10px] text-[#8b8da6] mt-1">
                                    {Array.from({ length: Math.min(newGroupCount, 26) }).map((_, i) => String.fromCharCode(65 + i)).join(', ')}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1">Teams per Group</label>
                                  <input type="number" min={1} value={newGroupTeamCount}
                                    onChange={(e) => setNewGroupTeamCount(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="e.g. 16"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1">Matches per Group</label>
                                  <input type="number" min={0} max={20} value={newGroupMatchCount}
                                    onChange={(e) => setNewGroupMatchCount(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button onClick={() => createDivisions(stage.id)}
                                  className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                                  Create {newGroupCount} Group{newGroupCount !== 1 ? 's' : ''} with {newGroupMatchCount} match{newGroupMatchCount !== 1 ? 'es' : ''} each
                                </button>
                                <button onClick={() => setCreatingGroupFor(null)}
                                  className="text-[#8b8da6] hover:text-white text-sm px-3 transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Group cards — each with teams + matches */}
                          {stage.groups.length > 0 ? (
                            <div className="space-y-3">
                              {stage.groups.map((group) => (
                                <div key={group.id} className="bg-[#1a2a3a] border border-white/10 rounded-xl overflow-hidden">
                                  {/* Group header */}
                                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-bold text-white">{group.name}</span>
                                      <span className="text-[10px] text-[#8b8da6]">
                                        {group.teams.length}{group.team_count ? `/${group.team_count}` : ''} teams
                                      </span>
                                      <span className="text-[10px] text-[#8b8da6]">
                                        {group.matches.length} match{group.matches.length !== 1 ? 'es' : ''}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => exportGroup(group.id, group.name)}
                                        className="text-[10px] text-[#00ffc3] hover:text-[#8b7ffe] font-semibold transition-colors"
                                      >
                                        Export Division
                                      </button>
                                      <button onClick={() => setAddingTeamToGroup(addingTeamToGroup === group.id ? null : group.id)}
                                        className="text-[10px] text-[#00ffc3] hover:text-[#8b7ffe] font-semibold transition-colors">
                                        + Team
                                      </button>
                                      <button onClick={() => { setAddingMatchTo(group.id); setMatchName(''); setMatchMap(''); }}
                                        className="text-[10px] text-[#00ffc3] hover:text-[#8b7ffe] font-semibold transition-colors">
                                        + Match
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-[200px_1fr] divide-x divide-white/5">
                                    {/* Left: Teams */}
                                    <div className="px-3 py-2">
                                      <div className="text-[9px] text-[#8b8da6] uppercase tracking-wider font-semibold mb-1">Teams</div>
                                      {addingTeamToGroup === group.id && (
                                        <div className="mb-2">
                                          <select
                                            onChange={(e) => { if (e.target.value) addTeamToGroup(group.id, e.target.value); }}
                                            defaultValue=""
                                            className="w-full bg-[#0e1621] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00ffc3]/60 transition-colors [&>option]:bg-[#0e1621] [&>option]:text-white"
                                          >
                                            <option value="">Select team...</option>
                                            {availableTeams(stage).map((t) => (
                                              <option key={t.id} value={t.id}>{t.name}{t.short_name ? ` [${t.short_name}]` : ''}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                      {group.teams.length === 0 ? (
                                        <div className="text-[10px] text-[#8b8da6] py-1">No teams</div>
                                      ) : (
                                        group.teams.map((team) => (
                                          <div key={team.id} className="flex items-center justify-between py-0.5 group/team">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: team.brand_color }} />
                                              <span className="text-[11px] text-white truncate">{team.short_name || team.name}</span>
                                            </div>
                                            <button onClick={() => removeTeamFromGroup(group.id, team.id)}
                                              className="text-[10px] text-[#8b8da6] hover:text-[#ff4e4e] opacity-0 group-hover/team:opacity-100 transition-all flex-shrink-0">
                                              x
                                            </button>
                                          </div>
                                        ))
                                      )}
                                    </div>

                                    {/* Right: Matches */}
                                    <div className="px-3 py-2">
                                      <div className="text-[9px] text-[#8b8da6] uppercase tracking-wider font-semibold mb-1">Matches</div>
                                      {group.matches.length === 0 && addingMatchTo !== group.id ? (
                                        <div className="text-[10px] text-[#8b8da6] py-1">
                                          No matches.{' '}
                                          <button onClick={() => { setAddingMatchTo(group.id); setMatchName(''); setMatchMap(''); }}
                                            className="text-[#00ffc3] hover:text-[#8b7ffe]">Add one</button>
                                        </div>
                                      ) : (
                                        group.matches.map((match) => (
                                          <div key={match.id} className="flex items-center justify-between py-1 group/match">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="text-[11px] text-white font-medium">{match.name}</span>
                                              <select
                                                value={match.map_name ?? ''}
                                                onChange={(e) => updateMatchMap(match.id, e.target.value || null)}
                                                className="bg-[#0e1621] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white cursor-pointer focus:outline-none focus:border-[#00ffc3]/60 [&>option]:bg-[#0e1621] [&>option]:text-white"
                                              >
                                                <option value="">No map</option>
                                                {MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
                                              </select>
                                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                                match.status === 'finished' ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
                                                : match.status === 'live' ? 'bg-[#ff4e4e]/10 text-[#ff4e4e]'
                                                : 'bg-white/5 text-[#8b8da6]'
                                              }`}>
                                                {match.status}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover/match:opacity-100 transition-all">
                                              <Link href={`/tournaments/${id}/stages/${stage.id}/matches/${match.id}`}
                                                className="text-[10px] text-[#8b8da6] hover:text-white">
                                                View
                                              </Link>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                      {/* Add match to group form */}
                                      {addingMatchTo === group.id && (
                                        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/5">
                                          <input type="text" autoFocus placeholder="Match name" value={matchName}
                                            onChange={(e) => setMatchName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') addMatch(stage.id, group.id); if (e.key === 'Escape') setAddingMatchTo(null); }}
                                            className="flex-1 bg-[#0e1621] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors" />
                                          <select value={matchMap} onChange={(e) => setMatchMap(e.target.value)}
                                            className="bg-[#0e1621] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00ffc3]/60 [&>option]:bg-[#0e1621] [&>option]:text-white">
                                            <option value="">Map</option>
                                            {MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
                                          </select>
                                          <button onClick={() => addMatch(stage.id, group.id)}
                                            className="text-[10px] text-[#00ffc3] hover:text-[#8b7ffe] font-semibold">Add</button>
                                          <button onClick={() => setAddingMatchTo(null)}
                                            className="text-[10px] text-[#8b8da6] hover:text-white">x</button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-[#8b8da6] text-xs">
                              No divisions created yet. Click &quot;Create Divisions&quot; to set up groups.
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
        </>
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
    </div>
  );
}
