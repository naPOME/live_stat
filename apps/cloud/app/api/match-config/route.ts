import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSlotColor } from '@/lib/config/tournament';

/**
 * GET /api/match-config?match_id=xxx
 * Authorization: Bearer <tournament_api_key>
 *
 * Returns everything the local engine needs for a match:
 * teams, players, point system, logo URLs, org branding.
 * Called by local engine on sync (before match starts).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '').trim();

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const matchId = req.nextUrl.searchParams.get('match_id');
  const stageId = req.nextUrl.searchParams.get('stage_id');

  if (!matchId && !stageId) {
    return NextResponse.json({ error: 'Provide match_id or stage_id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // If stage_id provided, resolve all matches in stage
  let resolvedMatchId = matchId;
  let matchIds: string[] = [];
  let stageName: string | null = null;

  if (stageId) {
    const { data: stage } = await supabase
      .from('stages')
      .select('id, name, tournament_id')
      .eq('id', stageId)
      .single();

    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }
    stageName = stage.name;

    const { data: stageMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('stage_id', stageId)
      .order('created_at');

    matchIds = (stageMatches ?? []).map(m => m.id);
    resolvedMatchId = matchIds[0] ?? null;
  }

  if (!resolvedMatchId) {
    return NextResponse.json({ error: 'No matches found' }, { status: 404 });
  }

  // Fetch match → stage → tournament
  const { data: match } = await supabase
    .from('matches')
    .select('id, name, map, stage_id, point_system_id, stage:stages(id, name, tournament_id, tournament:tournaments(id, api_key, format, name, org_id, point_systems(kill_points, placement_points)))')
    .eq('id', resolvedMatchId)
    .single();

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const stage = Array.isArray(match.stage) ? match.stage[0] : match.stage;
  const tournament = (stage as any)?.tournament;

  if (!tournament || String(tournament.api_key) !== apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Fetch org
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, brand_color, logo_url, sponsor1_url, sponsor2_url, sponsor3_url')
    .eq('id', tournament.org_id)
    .single();

  // Resolve point system
  const ps = tournament.point_systems?.[0];
  const pointSystem = ps
    ? { kill_points: Number(ps.kill_points), placement_points: ps.placement_points as Record<string, number> }
    : { kill_points: 1, placement_points: { '1': 10, '2': 6, '3': 5, '4': 4, '5': 3, '6': 2, '7': 1, '8': 1 } };

  // Fetch match slots with teams + players
  const { data: slots } = await supabase
    .from('match_slots')
    .select('slot_number, team:teams(id, name, short_name, logo_url, players(player_open_id, display_name))')
    .eq('match_id', resolvedMatchId)
    .order('slot_number');

  // Build teams array and player_index
  const teams: Array<{
    team_id: string;
    slot_number: number;
    name: string;
    short_name: string;
    brand_color: string;
    logo_url: string | null;
    players: Array<{ player_open_id: string; display_name: string }>;
  }> = [];

  const playerIndex: Record<string, { team_id: string; display_name: string; slot_number: number }> = {};

  for (const slot of slots ?? []) {
    const team = slot.team as any;
    if (!team) continue;
    const slotNum: number = slot.slot_number;

    const teamPlayers = (team.players ?? []).map((p: any) => ({
      player_open_id: p.player_open_id as string,
      display_name: p.display_name as string,
    }));

    teams.push({
      team_id: team.id,
      slot_number: slotNum,
      name: team.name,
      short_name: team.short_name ?? team.name.substring(0, 4).toUpperCase(),
      brand_color: getSlotColor(slotNum),
      logo_url: team.logo_url ?? null,
      players: teamPlayers,
    });

    for (const p of teamPlayers) {
      playerIndex[p.player_open_id] = {
        team_id: team.id,
        display_name: p.display_name,
        slot_number: slotNum,
      };
    }
  }

  // If no slots assigned, fall back to tournament_teams
  if (teams.length === 0) {
    const { data: tournamentTeams } = await supabase
      .from('tournament_teams')
      .select('seed, created_at, team:teams(id, name, short_name, logo_url, players(player_open_id, display_name))')
      .eq('tournament_id', tournament.id)
      .order('seed', { ascending: true, nullsFirst: false })
      .order('created_at');

    for (const [idx, row] of (tournamentTeams ?? []).entries()) {
      const team = (row as any).team;
      if (!team) continue;
      const slotNum = idx + 1;

      const teamPlayers = (team.players ?? []).map((p: any) => ({
        player_open_id: p.player_open_id as string,
        display_name: p.display_name as string,
      }));

      teams.push({
        team_id: team.id,
        slot_number: slotNum,
        name: team.name,
        short_name: team.short_name ?? team.name.substring(0, 4).toUpperCase(),
        brand_color: getSlotColor(slotNum),
        logo_url: team.logo_url ?? null,
        players: teamPlayers,
      });

      for (const p of teamPlayers) {
        playerIndex[p.player_open_id] = {
          team_id: team.id,
          display_name: p.display_name,
          slot_number: slotNum,
        };
      }
    }
  }

  // If stage_id not provided, resolve match_ids from the stage
  if (matchIds.length === 0 && stage) {
    const { data: stageMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('stage_id', (stage as any).id)
      .order('created_at');
    matchIds = (stageMatches ?? []).map(m => m.id);
    stageName = (stage as any).name;
  }

  const sponsors = [org?.sponsor1_url, org?.sponsor2_url, org?.sponsor3_url].filter(Boolean) as string[];

  return NextResponse.json({
    tournament_id: tournament.id,
    tournament_name: tournament.name,
    tournament_format: tournament.format,
    stage_id: (stage as any)?.id,
    stage_name: stageName ?? (stage as any)?.name,
    match_id: resolvedMatchId,
    match_ids: matchIds,
    match_name: match.name,
    match_map: match.map,
    point_system: pointSystem,
    org: {
      name: org?.name ?? '',
      brand_color: org?.brand_color ?? '#2F6B3F',
      logo_url: org?.logo_url ?? null,
      sponsors,
    },
    teams,
    player_index: playerIndex,
  });
}
