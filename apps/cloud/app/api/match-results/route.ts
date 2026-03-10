import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '').trim();

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  let body: {
    tournament_id: string;
    stage_id: string;
    match_id: string;
    game_id: string;
    results: Array<{
      team_id: string;
      placement: number;
      kill_count: number;
      total_pts: number;
    }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify the api_key belongs to this tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, api_key')
    .eq('id', body.tournament_id)
    .single();

  if (!tournament || String(tournament.api_key) !== apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Validate match + stage linkage
  const { data: match } = await supabase
    .from('matches')
    .select('id, stage_id, point_system_id, stage:stages(tournament_id)')
    .eq('id', body.match_id)
    .single();

  const matchStage = Array.isArray(match?.stage) ? match.stage[0] : match?.stage;
  if (!match || match.stage_id !== body.stage_id || matchStage?.tournament_id !== body.tournament_id) {
    return NextResponse.json({ error: 'Match does not belong to provided stage/tournament' }, { status: 400 });
  }

  // Load point system
  let pointSystem: { kill_points: number; placement_points: Record<string, number> } | null = null;
  if (match.point_system_id) {
    const { data: ps } = await supabase
      .from('point_systems')
      .select('kill_points, placement_points')
      .eq('id', match.point_system_id)
      .single();
    if (ps) {
      pointSystem = {
        kill_points: Number(ps.kill_points),
        placement_points: ps.placement_points as Record<string, number>,
      };
    }
  }

  if (!pointSystem) {
    const { data: ps } = await supabase
      .from('point_systems')
      .select('kill_points, placement_points')
      .eq('tournament_id', body.tournament_id)
      .limit(1)
      .single();
    if (ps) {
      pointSystem = {
        kill_points: Number(ps.kill_points),
        placement_points: ps.placement_points as Record<string, number>,
      };
    }
  }

  if (!pointSystem) {
    return NextResponse.json({ error: 'Point system not found' }, { status: 400 });
  }

  const { data: matchSlots } = await supabase
    .from('match_slots')
    .select('team_id')
    .eq('match_id', body.match_id);

  const assignedTeams = new Set((matchSlots ?? []).map((s) => s.team_id));
  const flags: Array<{ teamId: string | null; code: string; message: string }> = [];
  const seenTeams = new Set<string>();
  const seenPlacements = new Set<number>();

  for (const r of body.results) {
    if (!r.team_id) {
      flags.push({ teamId: null, code: 'missing_team_id', message: 'Missing team_id in results' });
      continue;
    }
    if (seenTeams.has(r.team_id)) {
      flags.push({ teamId: r.team_id, code: 'duplicate_team_id', message: `Duplicate team_id in results: ${r.team_id}` });
      continue;
    }
    seenTeams.add(r.team_id);

    if (!assignedTeams.has(r.team_id)) {
      flags.push({ teamId: r.team_id, code: 'team_not_assigned', message: `Team not assigned to match: ${r.team_id}` });
    }

    if (typeof r.placement !== 'number' || r.placement < 1 || r.placement > 22) {
      flags.push({ teamId: r.team_id, code: 'invalid_placement', message: `Invalid placement for team ${r.team_id}: ${r.placement}` });
    } else if (seenPlacements.has(r.placement)) {
      flags.push({ teamId: r.team_id, code: 'duplicate_placement', message: `Duplicate placement: ${r.placement}` });
    } else {
      seenPlacements.add(r.placement);
    }

    if (typeof r.kill_count !== 'number' || r.kill_count < 0) {
      flags.push({ teamId: r.team_id, code: 'invalid_kill_count', message: `Invalid kill_count for team ${r.team_id}: ${r.kill_count}` });
    }

    const placementPoints = pointSystem.placement_points[String(r.placement)] ?? 0;
    const expectedTotal = Math.round((placementPoints + r.kill_count * pointSystem.kill_points) * 1000) / 1000;
    if (typeof r.total_pts !== 'number' || Math.abs(r.total_pts - expectedTotal) > 0.0001) {
      flags.push({
        teamId: r.team_id,
        code: 'total_points_mismatch',
        message: `Total points mismatch for team ${r.team_id}: expected ${expectedTotal}, got ${r.total_pts}`,
      });
    }
  }

  // Upsert match results
  const rows = body.results.map((r) => ({
    match_id: body.match_id,
    team_id: r.team_id,
    placement: r.placement,
    kill_count: r.kill_count,
    total_pts: r.total_pts,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('match_results')
      .upsert(rows, { onConflict: 'match_id,team_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Mark match as finished
  await supabase
    .from('matches')
    .update({ status: 'finished' })
    .eq('id', body.match_id);

  // Auto-complete stage and advance if configured
  const { data: stage } = await supabase
    .from('stages')
    .select('id, tournament_id, stage_order, auto_advance, status')
    .eq('id', body.stage_id)
    .single();

  if (stage) {
    const { data: stageMatches } = await supabase
      .from('matches')
      .select('status')
      .eq('stage_id', stage.id);

    const allFinished = (stageMatches ?? []).length > 0
      && (stageMatches ?? []).every((m) => m.status === 'finished');

    if (allFinished && stage.status !== 'completed') {
      await supabase.from('stages').update({ status: 'completed' }).eq('id', stage.id);

      if (stage.auto_advance) {
        const { data: activeStage } = await supabase
          .from('stages')
          .select('id')
          .eq('tournament_id', stage.tournament_id)
          .eq('status', 'active')
          .neq('id', stage.id)
          .limit(1)
          .single();

        if (!activeStage) {
          const { data: nextStage } = await supabase
            .from('stages')
            .select('id, status')
            .eq('tournament_id', stage.tournament_id)
            .gt('stage_order', stage.stage_order)
            .order('stage_order')
            .limit(1)
            .single();

          if (nextStage && nextStage.status === 'pending') {
            await supabase.from('stages').update({ status: 'active' }).eq('id', nextStage.id);
          }
        }
      }
    }
  }

  if (flags.length > 0) {
    const flagRows = flags.map((f) => ({
      match_id: body.match_id,
      team_id: f.teamId,
      code: f.code,
      message: f.message,
    }));
    await supabase.from('match_result_flags').insert(flagRows);
  }

  console.log(`[match-results] Synced ${rows.length} results for match ${body.match_id}`);
  return NextResponse.json({ ok: true, synced: rows.length, flags: flags.length });
}
