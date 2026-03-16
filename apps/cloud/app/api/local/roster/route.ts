import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/local/roster
 *
 * Auth: Bearer {org.api_key}
 * Body: { tournament_id: string, match_id?: string }
 *
 * Returns: { roster, tournament, match }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header (Bearer api_key)' }, { status: 401 });
  }

  let body: { tournament_id?: string; match_id?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  if (!body.tournament_id) {
    return NextResponse.json({ error: 'tournament_id is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  let org: any = null;

  const { data: orgByKey } = await supabase
    .from('organizations')
    .select('id, name, brand_color, accent_color, bg_color, font, logo_url')
    .eq('api_key', token)
    .single();
  if (orgByKey) org = orgByKey;

  if (!org) {
    const { data: device } = await supabase
      .from('org_devices')
      .select('org_id, org:organizations(id, name, brand_color, accent_color, bg_color, font, logo_url)')
      .eq('device_token', token)
      .eq('revoked', false)
      .single();
    if (device?.org) {
      org = device.org;
      await supabase.from('org_devices').update({ last_seen: new Date().toISOString() }).eq('device_token', token);
    }
  }

  if (!org) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('id, name, org_id, api_key')
    .eq('id', body.tournament_id)
    .single();

  if (tErr || !tournament || tournament.org_id !== org.id) {
    return NextResponse.json({ error: 'Tournament not found for org' }, { status: 404 });
  }

  let matchId = body.match_id ?? '';

  if (!matchId) {
    const { data: match } = await supabase
      .from('matches')
      .select('id, name, status, stages!inner(tournament_id)')
      .eq('stages.tournament_id', tournament.id)
      .in('status', ['pending', 'live'])
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (match) {
      matchId = match.id;
    }
  }

  if (!matchId) {
    const { data: anyMatch } = await supabase
      .from('matches')
      .select('id, name, status, stages!inner(tournament_id)')
      .eq('stages.tournament_id', tournament.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (anyMatch) {
      matchId = anyMatch.id;
    }
  }

  if (!matchId) {
    return NextResponse.json({ error: 'No match found for tournament' }, { status: 404 });
  }

  const { data: match } = await supabase
    .from('matches')
    .select('*, stage:stages(*, tournament:tournaments(*, point_systems(*)))')
    .eq('id', matchId)
    .single();

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const stage = match.stage as any;
  const tournamentFull = stage?.tournament as any;
  if (!tournamentFull || tournamentFull.org_id !== org.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: slots } = await supabase
    .from('match_slots')
    .select('slot_number, team:teams(*, players(*))')
    .eq('match_id', matchId)
    .order('slot_number');

  const ps = tournamentFull.point_systems?.[0];
  const pointSystem = ps
    ? { kill_points: Number(ps.kill_points), placement_points: ps.placement_points as Record<string, number> }
    : {
        kill_points: 1,
        placement_points: {
          '1': 10, '2': 6, '3': 5, '4': 4, '5': 3, '6': 2,
          '7': 1, '8': 1, '9': 0, '10': 0,
        },
      };

  const teams: Array<{
    team_id: string;
    slot_number: number;
    name: string;
    short_name: string;
    brand_color: string;
    logo_path: string | null;
    logo_path_64: string | null;
    logo_path_128?: string | null;
    logo_path_256?: string | null;
    players: Array<{ player_open_id: string; display_name: string }>;
  }> = [];

  const playerIndex: Record<string, { team_id: string; display_name: string; slot_number: number }> = {};

  for (const slot of slots ?? []) {
    const team = slot.team as any;
    if (!team) continue;
    const slotNum: number = slot.slot_number;
    const padded = String(slotNum).padStart(3, '0');
    const logoUrl = team.logo_url ?? null;

    const teamPlayers = (team.players ?? []).map((p: any) => ({
      player_open_id: p.player_open_id as string,
      display_name: p.display_name as string,
    }));

    teams.push({
      team_id: team.id,
      slot_number: slotNum,
      name: team.name,
      short_name: team.short_name ?? team.name.substring(0, 4).toUpperCase(),
      brand_color: team.brand_color,
      logo_path: logoUrl ?? `c:/logo/${padded}.png`,
      logo_path_64: logoUrl ?? `c:/logo/${padded}_64.png`,
      logo_path_128: logoUrl ?? `c:/logo/${padded}_128.png`,
      logo_path_256: logoUrl ?? `c:/logo/${padded}_256.png`,
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

  const cloudEndpoint = `${req.nextUrl.origin}/api/match-results`;

  const rosterMapping = {
    version: 1,
    tournament_id: tournamentFull.id,
    stage_id: stage.id,
    match_id: matchId,
    cloud_endpoint: cloudEndpoint,
    cloud_api_key: tournamentFull.api_key,
    point_system: pointSystem,
    org: {
      id: org.id,
      name: org.name,
      brand_color: org.brand_color,
      logo_path: org.logo_url ?? 'c:/logo/org_logo.png',
      theme: {
        bg_color: org.bg_color,
        accent_color: org.accent_color,
        font: org.font,
      },
    },
    teams,
    player_index: playerIndex,
  };

  return NextResponse.json({
    ok: true,
    roster: rosterMapping,
    tournament: { id: tournamentFull.id, name: tournamentFull.name },
    match: { id: match.id, name: match.name },
  });
}
