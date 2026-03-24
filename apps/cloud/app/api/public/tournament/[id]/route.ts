import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/public/tournament/[id]
 *
 * Public endpoint — no auth required.
 * Returns full tournament hub data: info, org, stages, schedule, teams, standings, player stats.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tournamentId } = await params;
  const supabase = createServiceClient();

  // ── Tournament + org ──────────────────────────────────────────
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status, org_id, registration_open, registration_mode, created_at')
    .eq('id', tournamentId)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  // ── Fetch org, stages, and tournament_teams in parallel ───────
  const [
    { data: org },
    { data: stages },
    { data: tournamentTeams },
  ] = await Promise.all([
    supabase.from('organizations').select('name, logo_url, brand_color').eq('id', tournament.org_id).single(),
    supabase.from('stages').select('id, name, stage_order, stage_type, status, map_rotation').eq('tournament_id', tournamentId).order('stage_order'),
    supabase.from('tournament_teams').select('team_id, seed').eq('tournament_id', tournamentId).order('seed'),
  ]);

  const stageIds = (stages ?? []).map((s) => s.id);
  const teamIds = (tournamentTeams ?? []).map((tt) => tt.team_id);

  // ── Fetch matches and teams in parallel ───────────────────────
  const [matchesRes, teamsRes] = await Promise.all([
    stageIds.length > 0
      ? supabase.from('matches').select('id, stage_id, name, map_name, status, scheduled_at').in('stage_id', stageIds).order('scheduled_at', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] as any[] }),
    teamIds.length > 0
      ? supabase.from('teams').select('id, name, short_name, logo_url').in('id', teamIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const matches = matchesRes.data ?? [];
  const teams = teamsRes.data ?? [];

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));

  // ── Standings (same logic as /api/public/standings) ───────────
  const finishedMatches = (matches ?? []).filter((m) => m.status === 'finished');
  const matchIds = finishedMatches.map((m) => m.id);

  const { data: results } = matchIds.length > 0
    ? await supabase
        .from('match_results')
        .select('match_id, team_id, placement, kill_count, total_pts')
        .in('match_id', matchIds)
    : { data: [] };

  // Batch-fetch any teams from results not already in the map (avoids N+1)
  const missingTeamIds = [...new Set((results ?? []).map((r) => r.team_id).filter((id) => !teamMap.has(id)))];
  if (missingTeamIds.length > 0) {
    const { data: missingTeams } = await supabase
      .from('teams')
      .select('id, name, short_name, logo_url')
      .in('id', missingTeamIds);
    for (const t of missingTeams ?? []) teamMap.set(t.id, t);
  }

  const matchStageMap = new Map(finishedMatches.map((m) => [m.id, m.stage_id]));

  type TeamAgg = {
    team_id: string; total_pts: number; total_kills: number;
    matches_played: number; wins: number; placements: number[];
  };

  const stageAggs = new Map<string, Map<string, TeamAgg>>();
  for (const s of stages ?? []) stageAggs.set(s.id, new Map());

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

  const stageData = (stages ?? []).map((s) => {
    const agg = stageAggs.get(s.id)!;
    const stageMatches = (matches ?? []).filter((m) => m.stage_id === s.id);
    const finishedCount = stageMatches.filter((m) => m.status === 'finished').length;

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

    return {
      ...s,
      matches: stageMatches.map((m) => ({
        id: m.id, name: m.name, map_name: m.map_name,
        status: m.status, scheduled_at: m.scheduled_at,
      })),
      matchCount: finishedCount,
      totalMatches: stageMatches.length,
      standings,
    };
  });

  // ── Player stats ──────────────────────────────────────────────
  let playerStats: any[] = [];
  if (matchIds.length > 0) {
    const { data: playerResults } = await supabase
      .from('player_match_results')
      .select('match_id, player_id, player_open_id, team_id, kills, damage, survived')
      .in('match_id', matchIds);

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
          team: team ?? null,
          total_kills: a.total_kills,
          total_damage: a.total_damage,
          matches_played: a.matches_played,
          kd, avg_damage: avgDamage,
          survival_rate: survivalRate,
          top_fragger_count: a.top_fragger_count,
        };
      })
      .sort((a, b) => b.total_kills - a.total_kills)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }

  // ── Team list with seed order ─────────────────────────────────
  const seedMap = new Map((tournamentTeams ?? []).map((tt) => [tt.team_id, tt.seed]));
  const teamList = teamIds
    .map((id) => {
      const t = teamMap.get(id);
      if (!t) return null;
      return { ...t, seed: seedMap.get(id) ?? null };
    })
    .filter(Boolean);

  return NextResponse.json(
    {
      tournament: {
        id: tournament.id, name: tournament.name, status: tournament.status,
        registration_open: tournament.registration_open,
        registration_mode: tournament.registration_mode,
        created_at: tournament.created_at,
      },
      organization: org ? { name: org.name, logo_url: org.logo_url, brand_color: org.brand_color } : null,
      stages: stageData,
      teams: teamList,
      playerStats,
    },
    {
      headers: {
        // Cache at CDN/browser for 20s, serve stale for up to 60s while revalidating
        'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60',
      },
    },
  );
}
