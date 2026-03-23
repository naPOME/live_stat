import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/advance-teams
 *
 * Moves selected teams from a completed stage into the next stage's groups.
 * - If the target stage has groups, distributes teams round-robin across groups.
 * - If no groups exist yet, creates a single default group and assigns all teams.
 *
 * Body: { fromStageId: string, toStageId: string, teamIds: string[] }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { fromStageId, toStageId, teamIds } = body as {
    fromStageId: string;
    toStageId: string;
    teamIds: string[];
  };

  if (!fromStageId || !toStageId || !Array.isArray(teamIds) || teamIds.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify both stages exist and belong to the same tournament within user's org
  const [{ data: fromStage }, { data: toStage }] = await Promise.all([
    supabase.from('stages').select('id, tournament_id, status').eq('id', fromStageId).single(),
    supabase.from('stages').select('id, tournament_id, status, stage_type').eq('id', toStageId).single(),
  ]);

  if (!fromStage || !toStage || fromStage.tournament_id !== toStage.tournament_id) {
    return NextResponse.json({ error: 'Invalid stages' }, { status: 400 });
  }

  // Verify user owns this tournament
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  const { data: tournament } = await supabase.from('tournaments').select('org_id').eq('id', fromStage.tournament_id).single();
  if (!profile || !tournament || profile.org_id !== tournament.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get existing groups in the target stage
  const { data: existingGroups } = await supabase
    .from('stage_groups')
    .select('id, name, group_order')
    .eq('stage_id', toStageId)
    .order('group_order');

  let targetGroups = existingGroups ?? [];

  // For finals stages, we don't need groups — teams go directly into tournament_teams
  // For group/elimination stages, ensure at least one group exists
  if (toStage.stage_type !== 'finals' && targetGroups.length === 0) {
    // Create a default group
    const { data: newGroup } = await supabase
      .from('stage_groups')
      .insert({ stage_id: toStageId, name: 'Group A', group_order: 1, team_count: teamIds.length })
      .select('id, name, group_order')
      .single();

    if (newGroup) targetGroups = [newGroup];
  }

  if (toStage.stage_type !== 'finals' && targetGroups.length > 0) {
    // Distribute teams round-robin across groups
    const groupTeamRows = teamIds.map((teamId, i) => ({
      group_id: targetGroups[i % targetGroups.length].id,
      team_id: teamId,
    }));

    // Clear existing group_teams for the target stage's groups (if re-advancing)
    const groupIds = targetGroups.map(g => g.id);
    await supabase.from('group_teams').delete().in('group_id', groupIds);

    // Insert new assignments
    const { error: insertError } = await supabase.from('group_teams').insert(groupTeamRows);
    if (insertError) {
      return NextResponse.json({ error: 'Failed to assign teams to groups', detail: insertError.message }, { status: 500 });
    }
  }

  // Also ensure all advancing teams are in tournament_teams (they should be already, but be safe)
  const tournamentId = fromStage.tournament_id;
  const { data: existingTT } = await supabase
    .from('tournament_teams')
    .select('team_id')
    .eq('tournament_id', tournamentId)
    .in('team_id', teamIds);
  const existingTeamIds = new Set((existingTT ?? []).map(t => t.team_id));
  const missingTeams = teamIds.filter(id => !existingTeamIds.has(id));

  if (missingTeams.length > 0) {
    await supabase.from('tournament_teams').insert(
      missingTeams.map(team_id => ({ tournament_id: tournamentId, team_id }))
    );
  }

  return NextResponse.json({
    ok: true,
    advanced: teamIds.length,
    targetStage: toStageId,
    groupsUsed: targetGroups.length,
  });
}
