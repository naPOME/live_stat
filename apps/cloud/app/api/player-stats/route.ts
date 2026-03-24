import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/player-stats?tournamentId=...
 *
 * Returns aggregated player stats across all finished matches.
 * Optional tournamentId filter scopes to a specific tournament.
 */
export async function GET(req: NextRequest) {
  const tournamentId = req.nextUrl.searchParams.get('tournamentId');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 });

  // Get all teams in org
  const { data: teams } = await supabase.from('teams').select('id, name, short_name, logo_url').eq('org_id', profile.org_id);
  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const teamIds = (teams ?? []).map((t) => t.id);
  if (teamIds.length === 0) return NextResponse.json({ players: [] });

  // Get all players for these teams
  const { data: players } = await supabase.from('players').select('id, team_id, display_name, player_open_id').in('team_id', teamIds);
  const playerMap = new Map((players ?? []).map((p) => [p.player_open_id, p]));

  // Get finished match IDs — filter by tournament in SQL when possible
  let matchIds: string[] = [];
  if (tournamentId) {
    const { data: rawMatches } = await supabase
      .from('matches')
      .select('id, stage:stages!inner(tournament_id)')
      .eq('status', 'finished')
      .eq('stage.tournament_id', tournamentId);
    matchIds = (rawMatches ?? []).map((m) => m.id);
  } else {
    const { data: rawMatches } = await supabase
      .from('matches')
      .select('id, stage:stages!inner(tournament_id)')
      .eq('status', 'finished');
    // filter to matches belonging to this org's tournaments via teamIds
    const { data: orgTournaments } = await supabase
      .from('tournaments')
      .select('id')
      .eq('org_id', profile.org_id);
    const orgTournamentIds = new Set((orgTournaments ?? []).map((t) => t.id));
    matchIds = (rawMatches ?? [])
      .filter((m) => {
        const stage = Array.isArray(m.stage) ? m.stage[0] : m.stage;
        return orgTournamentIds.has((stage as any)?.tournament_id);
      })
      .map((m) => m.id);
  }

  if (matchIds.length === 0) return NextResponse.json({ players: [] });

  // Get player match results — include match_id so we can compute top-fragger without a second query
  const { data: results } = await supabase
    .from('player_match_results')
    .select('match_id, player_open_id, team_id, in_game_name, kills, damage, damage_taken, heal, headshots, assists, knockouts, rescues, survival_time, survived')
    .in('match_id', matchIds);

  // Aggregate per player
  type PlayerAgg = {
    player_open_id: string;
    team_id: string | null;
    in_game_name: string | null;
    total_kills: number;
    total_damage: number;
    total_damage_taken: number;
    total_heal: number;
    total_headshots: number;
    total_assists: number;
    total_knockouts: number;
    total_rescues: number;
    total_survival_time: number;
    matches_played: number;
    deaths: number;
    top_fragger_count: number;
  };

  const agg = new Map<string, PlayerAgg>();
  for (const r of results ?? []) {
    if (!agg.has(r.player_open_id)) {
      agg.set(r.player_open_id, {
        player_open_id: r.player_open_id,
        team_id: r.team_id,
        in_game_name: r.in_game_name ?? null,
        total_kills: 0,
        total_damage: 0,
        total_damage_taken: 0,
        total_heal: 0,
        total_headshots: 0,
        total_assists: 0,
        total_knockouts: 0,
        total_rescues: 0,
        total_survival_time: 0,
        matches_played: 0,
        deaths: 0,
        top_fragger_count: 0,
      });
    }
    const a = agg.get(r.player_open_id)!;
    a.total_kills += r.kills;
    a.total_damage += r.damage;
    a.total_damage_taken += r.damage_taken ?? 0;
    a.total_heal += r.heal ?? 0;
    a.total_headshots += r.headshots ?? 0;
    a.total_assists += r.assists ?? 0;
    a.total_knockouts += r.knockouts ?? 0;
    a.total_rescues += r.rescues ?? 0;
    a.total_survival_time += r.survival_time ?? 0;
    a.matches_played += 1;
    if (!r.survived) a.deaths += 1;
  }

  // Count top fraggers per match using the already-fetched results
  const matchKillMap = new Map<string, { openId: string; kills: number }[]>();
  for (const r of results ?? []) {
    if (!matchKillMap.has(r.match_id)) matchKillMap.set(r.match_id, []);
    matchKillMap.get(r.match_id)!.push({ openId: r.player_open_id, kills: r.kills });
  }
  for (const [, players] of matchKillMap) {
    if (players.length === 0) continue;
    players.sort((a, b) => b.kills - a.kills);
    const topKills = players[0].kills;
    if (topKills > 0) {
      for (const p of players) {
        if (p.kills < topKills) break;
        const a = agg.get(p.openId);
        if (a) a.top_fragger_count += 1;
      }
    }
  }

  // ── Compute weighted MVP points ──
  // Formula: (kills/totalKills)*0.4 + (damage/totalDamage)*0.3
  //        + (avgSurvival/globalAvgSurvival)*0.2 + (knockouts/totalKnockouts)*0.1
  const allPlayers = [...agg.values()];
  const globalKills = allPlayers.reduce((s, p) => s + p.total_kills, 0);
  const globalDamage = allPlayers.reduce((s, p) => s + p.total_damage, 0);
  const globalKnockouts = allPlayers.reduce((s, p) => s + p.total_knockouts, 0);
  const globalAvgSurvival = allPlayers.length > 0
    ? allPlayers.reduce((s, p) => s + (p.matches_played > 0 ? p.total_survival_time / p.matches_played : 0), 0) / allPlayers.length
    : 0;

  // Build response
  const playerStats = allPlayers
    .map((a) => {
      const player = playerMap.get(a.player_open_id);
      const team = a.team_id ? teamMap.get(a.team_id) : null;
      const kd = a.deaths > 0 ? Math.round((a.total_kills / a.deaths) * 100) / 100 : a.total_kills;
      const avgDamage = a.matches_played > 0 ? Math.round(a.total_damage / a.matches_played) : 0;
      const survivalRate = a.matches_played > 0 ? Math.round(((a.matches_played - a.deaths) / a.matches_played) * 100) : 0;
      const headshotRate = a.total_kills > 0 ? Math.round((a.total_headshots / a.total_kills) * 100) : 0;
      const avgSurvival = a.matches_played > 0 ? a.total_survival_time / a.matches_played : 0;

      // Weighted MVP score
      const killShare = globalKills > 0 ? (a.total_kills / globalKills) * 0.4 : 0;
      const damageShare = globalDamage > 0 ? (a.total_damage / globalDamage) * 0.3 : 0;
      const survivalShare = globalAvgSurvival > 0 ? (avgSurvival / globalAvgSurvival) * 0.2 : 0;
      const knockoutShare = globalKnockouts > 0 ? (a.total_knockouts / globalKnockouts) * 0.1 : 0;
      const mvpPoints = Math.round((killShare + damageShare + survivalShare + knockoutShare) * 10000) / 10000;

      return {
        player_open_id: a.player_open_id,
        display_name: player?.display_name ?? a.in_game_name ?? a.player_open_id,
        player_id: player?.id ?? null,
        team,
        total_kills: a.total_kills,
        total_damage: a.total_damage,
        total_damage_taken: a.total_damage_taken,
        total_heal: a.total_heal,
        total_headshots: a.total_headshots,
        total_assists: a.total_assists,
        total_knockouts: a.total_knockouts,
        total_rescues: a.total_rescues,
        total_survival_time: a.total_survival_time,
        matches_played: a.matches_played,
        deaths: a.deaths,
        kd,
        avg_damage: avgDamage,
        survival_rate: survivalRate,
        headshot_rate: headshotRate,
        top_fragger_count: a.top_fragger_count,
        mvp_points: mvpPoints,
      };
    })
    .sort((a, b) => b.mvp_points - a.mvp_points);

  // Assign rank (by MVP points)
  for (let i = 0; i < playerStats.length; i++) {
    (playerStats[i] as any).rank = i + 1;
  }

  return NextResponse.json({ players: playerStats, matchCount: matchIds.length });
}
