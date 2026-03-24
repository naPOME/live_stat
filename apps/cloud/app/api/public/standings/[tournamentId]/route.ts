import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/public/standings/[tournamentId]?stageId=...
 *
 * Public endpoint — no auth required.
 * Returns tournament info + cumulative team standings + player stats.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  const { tournamentId } = await params;
  const stageId = req.nextUrl.searchParams.get('stageId');

  const supabase = createServiceClient();

  // Fetch tournament + org
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status, org_id')
    .eq('id', tournamentId)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, brand_color')
    .eq('id', tournament.org_id)
    .single();

  // Get stages
  let stageQuery = supabase
    .from('stages')
    .select('id, name, stage_order, stage_type')
    .eq('tournament_id', tournamentId)
    .order('stage_order');
  if (stageId) stageQuery = stageQuery.eq('id', stageId);
  const { data: stages } = await stageQuery;

  if (!stages || stages.length === 0) {
    return NextResponse.json({
      tournament: { id: tournament.id, name: tournament.name, status: tournament.status },
      organization: org ? { name: org.name, logo_url: org.logo_url, brand_color: org.brand_color } : null,
      stages: [],
      playerStats: [],
    });
  }

  const stageIds = stages.map((s) => s.id);

  // Get finished matches
  const { data: matches } = await supabase
    .from('matches')
    .select('id, stage_id, name, status, scheduled_at')
    .in('stage_id', stageIds);

  const finishedMatches = (matches ?? []).filter((m) => m.status === 'finished');
  const matchIds = finishedMatches.map((m) => m.id);

  // Get results
  const { data: results } = matchIds.length > 0
    ? await supabase
        .from('match_results')
        .select('match_id, team_id, placement, kill_count, total_pts')
        .in('match_id', matchIds)
    : { data: [] };

  // Get teams
  const teamIds = [...new Set((results ?? []).map((r) => r.team_id).filter(Boolean))];
  const { data: teams } = teamIds.length > 0
    ? await supabase.from('teams').select('id, name, short_name, logo_url').in('id', teamIds)
    : { data: [] };
  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));

  // Match → stage map
  const matchStageMap = new Map(finishedMatches.map((m) => [m.id, m.stage_id]));

  // Aggregate standings per stage
  type TeamAgg = {
    team_id: string;
    total_pts: number;
    total_kills: number;
    matches_played: number;
    wins: number;
    placements: number[];
  };

  const stageAggs = new Map<string, Map<string, TeamAgg>>();
  for (const s of stages) stageAggs.set(s.id, new Map());

  for (const r of results ?? []) {
    const sid = matchStageMap.get(r.match_id);
    if (!sid) continue;
    const agg = stageAggs.get(sid)!;
    if (!agg.has(r.team_id)) {
      agg.set(r.team_id, { team_id: r.team_id, total_pts: 0, total_kills: 0, matches_played: 0, wins: 0, placements: [] });
    }
    const t = agg.get(r.team_id)!;
    t.total_pts += r.total_pts;
    t.total_kills += r.kill_count;
    t.matches_played += 1;
    t.placements.push(r.placement);
    if (r.placement === 1) t.wins += 1;
  }

  const stageStandings = stages.map((s) => {
    const agg = stageAggs.get(s.id)!;
    const stageMatchCount = finishedMatches.filter((m) => m.stage_id === s.id).length;
    const totalMatches = (matches ?? []).filter((m) => m.stage_id === s.id).length;
    const standings = [...agg.values()]
      .map((t) => ({
        team_id: t.team_id,
        total_pts: t.total_pts,
        total_kills: t.total_kills,
        matches_played: t.matches_played,
        wins: t.wins,
        avg_placement: t.matches_played > 0
          ? Math.round((t.placements.reduce((a, b) => a + b, 0) / t.matches_played) * 10) / 10
          : 0,
        team: teamMap.get(t.team_id) ?? null,
      }))
      .sort((a, b) => b.total_pts - a.total_pts || b.total_kills - a.total_kills || b.wins - a.wins);

    let rank = 1;
    for (let i = 0; i < standings.length; i++) {
      if (i > 0 && (standings[i].total_pts !== standings[i - 1].total_pts || standings[i].total_kills !== standings[i - 1].total_kills)) {
        rank = i + 1;
      }
      (standings[i] as any).rank = rank;
    }

    return { ...s, matchCount: stageMatchCount, totalMatches, standings };
  });

  // Player stats
  let playerStats: any[] = [];
  if (matchIds.length > 0) {
    const { data: playerResults } = await supabase
      .from('player_match_results')
      .select('match_id, player_id, player_open_id, team_id, kills, damage, survived')
      .in('match_id', matchIds);

    // Get players for display names
    const playerOpenIds = [...new Set((playerResults ?? []).map((r) => r.player_open_id))];
    const { data: players } = playerOpenIds.length > 0
      ? await supabase.from('players').select('id, display_name, player_open_id, photo_url').in('player_open_id', playerOpenIds)
      : { data: [] };
    const playerMap = new Map((players ?? []).map((p) => [p.player_open_id, p]));

    type PAgg = { player_open_id: string; team_id: string | null; total_kills: number; total_damage: number; matches_played: number; deaths: number; top_fragger_count: number };
    const agg = new Map<string, PAgg>();

    for (const r of playerResults ?? []) {
      if (!agg.has(r.player_open_id)) {
        agg.set(r.player_open_id, { player_open_id: r.player_open_id, team_id: r.team_id, total_kills: 0, total_damage: 0, matches_played: 0, deaths: 0, top_fragger_count: 0 });
      }
      const a = agg.get(r.player_open_id)!;
      a.total_kills += r.kills;
      a.total_damage += r.damage;
      a.matches_played += 1;
      if (!r.survived) a.deaths += 1;
    }

    // Top fragger per match
    const matchKillMap = new Map<string, { openId: string; kills: number }[]>();
    for (const r of playerResults ?? []) {
      if (!matchKillMap.has(r.match_id)) matchKillMap.set(r.match_id, []);
      matchKillMap.get(r.match_id)!.push({ openId: r.player_open_id, kills: r.kills });
    }
    for (const [, pls] of matchKillMap) {
      pls.sort((a, b) => b.kills - a.kills);
      const topKills = pls[0]?.kills ?? 0;
      if (topKills > 0) {
        for (const p of pls) {
          if (p.kills < topKills) break;
          const a = agg.get(p.openId);
          if (a) a.top_fragger_count += 1;
        }
      }
    }

    playerStats = [...agg.values()]
      .map((a) => {
        const player = playerMap.get(a.player_open_id);
        const team = a.team_id ? teamMap.get(a.team_id) : null;
        const kd = a.deaths > 0 ? Math.round((a.total_kills / a.deaths) * 100) / 100 : a.total_kills;
        const avgDamage = a.matches_played > 0 ? Math.round(a.total_damage / a.matches_played) : 0;
        const survivalRate = a.matches_played > 0 ? Math.round(((a.matches_played - a.deaths) / a.matches_played) * 100) : 0;
        return {
          player_open_id: a.player_open_id,
          display_name: player?.display_name ?? a.player_open_id,
          photo_url: player?.photo_url ?? null,
          team,
          total_kills: a.total_kills,
          total_damage: a.total_damage,
          matches_played: a.matches_played,
          kd,
          avg_damage: avgDamage,
          survival_rate: survivalRate,
          top_fragger_count: a.top_fragger_count,
        };
      })
      .sort((a, b) => b.total_kills - a.total_kills)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }

  return NextResponse.json({
    tournament: { id: tournament.id, name: tournament.name, status: tournament.status },
    organization: org ? { name: org.name, logo_url: org.logo_url, brand_color: org.brand_color } : null,
    stages: stageStandings,
    playerStats,
  });
}
