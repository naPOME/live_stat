import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const body = await request.json();
  const stageId = body?.stageId as string | undefined;
  if (!stageId) return NextResponse.json({ error: 'Missing stageId' }, { status: 400 });

  const { data: stage } = await service
    .from('stages')
    .select('id, tournament_id')
    .eq('id', stageId)
    .single();

  if (!stage || stage.tournament_id !== tournamentId) {
    return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
  }

  const { data: tournament } = await service
    .from('tournaments')
    .select('id, org_id')
    .eq('id', tournamentId)
    .single();

  if (!tournament || tournament.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: groups } = await service
    .from('stage_groups')
    .select('id')
    .eq('stage_id', stageId)
    .order('group_order');

  if (!groups || groups.length === 0) {
    return NextResponse.json({ error: 'No divisions for stage' }, { status: 400 });
  }

  const { data: tournamentTeams } = await service
    .from('tournament_teams')
    .select('team_id')
    .eq('tournament_id', tournamentId);

  const teamIds = (tournamentTeams ?? []).map((t) => t.team_id);
  if (teamIds.length === 0) {
    return NextResponse.json({ error: 'No teams linked to this tournament' }, { status: 400 });
  }

  const groupIds = groups.map((g) => g.id);
  await service.from('group_teams').delete().in('group_id', groupIds);

  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const rows = shuffled.map((teamId, i) => ({
    group_id: groupIds[i % groupIds.length],
    team_id: teamId,
  }));

  if (rows.length > 0) {
    const { error } = await service.from('group_teams').insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, assigned: rows.length });
}
