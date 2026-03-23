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
      team_id?: string;
      slot_number?: number;
      in_game_team_name?: string;
      placement: number;
      kill_count: number;
      total_pts: number;
    }>;
    player_results?: Array<{
      player_open_id: string;
      team_id?: string;
      in_game_name?: string;
      kills: number;
      damage: number;
      damage_taken?: number;
      heal?: number;
      headshots?: number;
      assists?: number;
      knockouts?: number;
      rescues?: number;
      survival_time?: number;
      survived: boolean;
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
    .select('id, api_key, format')
    .eq('id', body.tournament_id)
    .single();

  if (!tournament || String(tournament.api_key) !== apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  const isQuickStream = tournament.format === 'quick_stream';

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

  // For tournament format, validate team assignments
  let assignedTeams = new Set<string>();
  if (!isQuickStream) {
    const { data: matchSlots } = await supabase
      .from('match_slots')
      .select('team_id')
      .eq('match_id', body.match_id);
    assignedTeams = new Set((matchSlots ?? []).map((s) => s.team_id));
  }

  const flags: Array<{ teamId: string | null; code: string; message: string }> = [];
  const seenTeams = new Set<string>();
  const seenPlacements = new Set<number>();
  const seenSlots = new Set<number>();

  for (const r of body.results) {
    if (isQuickStream) {
      // Quick Stream: validate slot_number
      if (typeof r.slot_number !== 'number') {
        flags.push({ teamId: null, code: 'missing_slot_number', message: 'Missing slot_number in quick_stream results' });
        continue;
      }
      if (seenSlots.has(r.slot_number)) {
        flags.push({ teamId: null, code: 'duplicate_slot', message: `Duplicate slot_number: ${r.slot_number}` });
        continue;
      }
      seenSlots.add(r.slot_number);
    } else {
      // Tournament: validate team_id
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
    }

    if (typeof r.placement !== 'number' || r.placement < 1 || r.placement > 25) {
      flags.push({ teamId: r.team_id ?? null, code: 'invalid_placement', message: `Invalid placement: ${r.placement}` });
    } else if (seenPlacements.has(r.placement)) {
      flags.push({ teamId: r.team_id ?? null, code: 'duplicate_placement', message: `Duplicate placement: ${r.placement}` });
    } else {
      seenPlacements.add(r.placement);
    }

    if (typeof r.kill_count !== 'number' || r.kill_count < 0) {
      flags.push({ teamId: r.team_id ?? null, code: 'invalid_kill_count', message: `Invalid kill_count: ${r.kill_count}` });
    }

    const placementPoints = pointSystem.placement_points[String(r.placement)] ?? 0;
    const expectedTotal = Math.round((placementPoints + r.kill_count * pointSystem.kill_points) * 1000) / 1000;
    if (typeof r.total_pts !== 'number' || Math.abs(r.total_pts - expectedTotal) > 0.0001) {
      flags.push({
        teamId: r.team_id ?? null,
        code: 'total_points_mismatch',
        message: `Total points mismatch: expected ${expectedTotal}, got ${r.total_pts}`,
      });
    }
  }

  // Upsert match results
  if (isQuickStream) {
    // Quick Stream: upsert by slot_number
    const rows = body.results
      .filter(r => typeof r.slot_number === 'number')
      .map((r) => ({
        match_id: body.match_id,
        team_id: null,
        slot_number: r.slot_number,
        in_game_team_name: r.in_game_team_name ?? null,
        placement: r.placement,
        kill_count: r.kill_count,
        total_pts: r.total_pts,
      }));

    if (rows.length > 0) {
      // Delete existing results for this match first (slot-based upsert)
      await supabase.from('match_results').delete().eq('match_id', body.match_id);
      const { error } = await supabase.from('match_results').insert(rows);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  } else {
    // Tournament: upsert by team_id
    const rows = body.results
      .filter(r => !!r.team_id)
      .map((r) => ({
        match_id: body.match_id,
        team_id: r.team_id!,
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
  }

  // Upsert player match results (if provided)
  if (body.player_results && body.player_results.length > 0) {
    if (!isQuickStream) {
      for (const p of body.player_results) {
        if (p.team_id && !assignedTeams.has(p.team_id)) {
          flags.push({ teamId: p.team_id, code: 'player_team_not_assigned', message: `Player ${p.player_open_id} references team ${p.team_id} not assigned to this match` });
        }
      }
    }

    // Resolve player_open_id → player_id
    const openIds = body.player_results.map((p) => p.player_open_id);
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('id, player_open_id')
      .in('player_open_id', openIds);
    const playerIdMap = new Map((existingPlayers ?? []).map((p) => [p.player_open_id, p.id]));

    const playerRows = body.player_results.map((p) => ({
      match_id: body.match_id,
      player_id: playerIdMap.get(p.player_open_id) ?? null,
      player_open_id: p.player_open_id,
      team_id: p.team_id ?? null,
      in_game_name: p.in_game_name ?? null,
      kills: p.kills,
      damage: p.damage,
      damage_taken: p.damage_taken ?? 0,
      heal: p.heal ?? 0,
      headshots: p.headshots ?? 0,
      assists: p.assists ?? 0,
      knockouts: p.knockouts ?? 0,
      rescues: p.rescues ?? 0,
      survival_time: p.survival_time ?? 0,
      survived: p.survived,
    }));

    await supabase
      .from('player_match_results')
      .upsert(playerRows, { onConflict: 'match_id,player_open_id' });
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

  const resultCount = body.results.length;
  console.log(`[match-results] Synced ${resultCount} results for match ${body.match_id}${isQuickStream ? ' (quick_stream)' : ''}`);
  return NextResponse.json({ ok: true, synced: resultCount, flags: flags.length });
}
