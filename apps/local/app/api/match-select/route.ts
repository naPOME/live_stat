import { NextResponse } from 'next/server';
import { getAuthedSupabase, getAuthState } from '@/lib/authStore';
import { setMatchConfig, getMatchConfig } from '@/lib/matchConfigStore';

export const runtime = 'nodejs';

/**
 * POST /api/match-select
 * Body: { cloud_url: string, tournament_id: string, stage_id?: string, match_id?: string }
 *
 * Fetches match config from cloud's /api/match-config endpoint using
 * the tournament's API key. Stores the config for the local engine.
 */
export async function POST(request: Request) {
  let body: any = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const supabase = getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Not logged in' }, { status: 401 });
  }

  const cloudUrl = (body?.cloud_url || '').trim().replace(/\/$/, '');
  const tournamentId = (body?.tournament_id || '').trim();
  const stageId = (body?.stage_id || '').trim();
  const matchId = (body?.match_id || '').trim();

  if (!cloudUrl) {
    return NextResponse.json({ ok: false, error: 'cloud_url is required' }, { status: 400 });
  }
  if (!tournamentId && !matchId && !stageId) {
    return NextResponse.json({ ok: false, error: 'Provide tournament_id, stage_id, or match_id' }, { status: 400 });
  }

  // Get tournament api_key
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, api_key, format')
    .eq('id', tournamentId)
    .single();

  if (!tournament?.api_key) {
    return NextResponse.json({ ok: false, error: 'Tournament not found or no API key' }, { status: 404 });
  }

  // Build query params
  const params = new URLSearchParams();
  if (matchId) params.set('match_id', matchId);
  else if (stageId) params.set('stage_id', stageId);

  // Fetch config from cloud
  const configUrl = `${cloudUrl}/api/match-config?${params.toString()}`;
  const res = await fetch(configUrl, {
    headers: { Authorization: `Bearer ${tournament.api_key}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: false, error: err?.error || `Cloud returned ${res.status}` }, { status: res.status });
  }

  const config = await res.json();

  // Store config for the engine
  setMatchConfig({
    cloud_url: cloudUrl,
    cloud_endpoint: `${cloudUrl}/api/match-results`,
    cloud_api_key: tournament.api_key,
    ...config,
  });

  const auth = getAuthState();
  return NextResponse.json({
    ok: true,
    tournament_name: config.tournament_name,
    stage_name: config.stage_name,
    match_name: config.match_name,
    match_map: config.match_map,
    team_count: config.teams?.length ?? 0,
    player_count: Object.keys(config.player_index ?? {}).length,
  });
}

export async function GET() {
  const config = getMatchConfig();
  if (!config) {
    return NextResponse.json({ ok: false, selected: false });
  }
  return NextResponse.json({
    ok: true,
    selected: true,
    tournament_name: config.tournament_name,
    tournament_format: config.tournament_format,
    stage_name: config.stage_name,
    match_name: config.match_name,
    match_map: config.match_map,
    team_count: config.teams?.length ?? 0,
    player_count: Object.keys(config.player_index ?? {}).length,
    match_id: config.match_id,
    match_ids: config.match_ids,
  });
}
