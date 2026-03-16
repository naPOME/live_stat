import { NextResponse } from 'next/server';
import fs from 'fs';
import { getRoster, getRosterPathValue, reloadRoster, setRosterPathOverride, getRosterError } from '@/lib/rosterStore';

export async function GET() {
  const roster = getRoster();
  return NextResponse.json({
    roster_loaded: Boolean(roster),
    roster_path: getRosterPathValue(),
    team_count: roster?.teams?.length ?? 0,
    player_count: roster ? Object.keys(roster.player_index ?? {}).length : 0,
    tournament_id: roster?.tournament_id ?? null,
    match_id: roster?.match_id ?? null,
    teams_preview: roster?.teams?.map((t) => ({
      slot_number: t.slot_number,
      name: t.name,
      short_name: t.short_name,
    })) ?? [],
    has_cloud_config: Boolean(roster?.cloud_endpoint && roster?.cloud_api_key),
    error: getRosterError(),
  });
}

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // ignore
  }
  if (body?.roster_path !== undefined) {
    const nextPath = body.roster_path;
    if (typeof nextPath === 'string' && nextPath.trim()) {
      if (!fs.existsSync(nextPath)) {
        return NextResponse.json({
          roster_loaded: false,
          roster_path: nextPath,
          team_count: 0,
          player_count: 0,
          error: 'Roster file not found at provided path.',
        });
      }
      setRosterPathOverride(nextPath);
    } else {
      setRosterPathOverride(null);
    }
  }
  const roster = reloadRoster();
  return NextResponse.json({
    roster_loaded: Boolean(roster),
    roster_path: getRosterPathValue(),
    team_count: roster?.teams?.length ?? 0,
    player_count: roster ? Object.keys(roster.player_index ?? {}).length : 0,
    tournament_id: roster?.tournament_id ?? null,
    match_id: roster?.match_id ?? null,
    teams_preview: roster?.teams?.map((t) => ({
      slot_number: t.slot_number,
      name: t.name,
      short_name: t.short_name,
    })) ?? [],
    has_cloud_config: Boolean(roster?.cloud_endpoint && roster?.cloud_api_key),
    error: getRosterError(),
  });
}
