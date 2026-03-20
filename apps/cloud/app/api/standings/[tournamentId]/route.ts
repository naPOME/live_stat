import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/standings/[tournamentId]?stageId=...
 *
 * Returns cumulative team standings for a tournament stage.
 * Aggregates match_results across all finished matches in the stage.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  const { tournamentId } = await params;
  const stageId = req.nextUrl.searchParams.get('stageId');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify tournament belongs to user's org — fetch profile and tournament in parallel
  const [{ data: profile }, { data: tournament }] = await Promise.all([
    supabase.from('profiles').select('org_id').eq('id', user.id).single(),
    supabase.from('tournaments').select('id, org_id').eq('id', tournamentId).single(),
  ]);
  if (!tournament || tournament.org_id !== profile?.org_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Get stages
  let stageFilter = supabase.from('stages').select('id, name, stage_order').eq('tournament_id', tournamentId).order('stage_order');
  if (stageId) stageFilter = stageFilter.eq('id', stageId);
  const { data: stages } = await stageFilter;
  if (!stages || stages.length === 0) {
    return NextResponse.json({ stages: [] });
  }

  const stageIds = stages.map((s) => s.id);

  // Get all finished matches for these stages
  const { data: matches } = await supabase
    .from('matches')
    .select('id, stage_id, name')
    .in('stage_id', stageIds)
    .eq('status', 'finished');

  if (!matches || matches.length === 0) {
    return NextResponse.json({ stages: stages.map((s) => ({ ...s, standings: [], matchCount: 0 })) });
  }

  const matchIds = matches.map((m) => m.id);

  // Get all results
  const { data: results } = await supabase
    .from('match_results')
    .select('match_id, team_id, placement, kill_count, total_pts')
    .in('match_id', matchIds);

  // Get team details
  const teamIds = [...new Set((results ?? []).map((r) => r.team_id))];
  const { data: teams } = teamIds.length > 0
    ? await supabase.from('teams').select('id, name, short_name, logo_url, brand_color').in('id', teamIds)
    : { data: [] };
  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));

  // Build match → stage mapping
  const matchStageMap = new Map(matches.map((m) => [m.id, m.stage_id]));

  // Aggregate by stage → team
  type TeamAgg = {
    team_id: string;
    total_pts: number;
    total_kills: number;
    matches_played: number;
    placements: number[];
    wins: number;
    avg_placement: number;
  };

  const stageAggs = new Map<string, Map<string, TeamAgg>>();
  for (const s of stages) stageAggs.set(s.id, new Map());

  for (const r of results ?? []) {
    const sid = matchStageMap.get(r.match_id);
    if (!sid) continue;
    const agg = stageAggs.get(sid)!;
    if (!agg.has(r.team_id)) {
      agg.set(r.team_id, {
        team_id: r.team_id,
        total_pts: 0,
        total_kills: 0,
        matches_played: 0,
        placements: [],
        wins: 0,
        avg_placement: 0,
      });
    }
    const t = agg.get(r.team_id)!;
    t.total_pts += r.total_pts;
    t.total_kills += r.kill_count;
    t.matches_played += 1;
    t.placements.push(r.placement);
    if (r.placement === 1) t.wins += 1;
  }

  // Build response
  const stageStandings = stages.map((s) => {
    const agg = stageAggs.get(s.id)!;
    const stageMatchCount = matches.filter((m) => m.stage_id === s.id).length;
    const standings = [...agg.values()]
      .map((t) => ({
        ...t,
        avg_placement: t.matches_played > 0 ? Math.round((t.placements.reduce((a, b) => a + b, 0) / t.matches_played) * 10) / 10 : 0,
        team: teamMap.get(t.team_id) ?? null,
      }))
      // Sort: total_pts DESC → total_kills DESC → wins DESC
      .sort((a, b) => b.total_pts - a.total_pts || b.total_kills - a.total_kills || b.wins - a.wins);

    // Assign rank with tiebreaker
    let rank = 1;
    for (let i = 0; i < standings.length; i++) {
      if (i > 0 && (
        standings[i].total_pts !== standings[i - 1].total_pts ||
        standings[i].total_kills !== standings[i - 1].total_kills ||
        standings[i].wins !== standings[i - 1].wins
      )) {
        rank = i + 1;
      }
      (standings[i] as any).rank = rank;
    }

    return { ...s, matchCount: stageMatchCount, standings };
  });

  return NextResponse.json({ stages: stageStandings });
}
