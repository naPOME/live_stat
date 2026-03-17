import { NextResponse } from 'next/server';
import fs from 'fs';
import { getRoster, getRosterPathValue, reloadRoster, setRosterPathOverride, getRosterError, getRosterSource } from '@/lib/rosterStore';
import { ok, err } from '@shared/api';

function rosterPayload() {
  const roster = getRoster();
  return {
    roster_loaded: Boolean(roster),
    roster_path: getRosterPathValue(),
    roster_source: getRosterSource(),
    team_count: roster?.teams?.length ?? 0,
    player_count: roster ? Object.keys(roster.player_index ?? {}).length : 0,
    tournament_id: roster?.tournament_id ?? null,
    stage_id: roster?.stage_id ?? null,
    stage_name: roster?.stage_name ?? null,
    group_name: roster?.group_name ?? null,
    match_id: roster?.match_id ?? null,
    org: roster?.org ? {
      id: roster.org.id,
      name: roster.org.name,
      brand_color: roster.org.brand_color,
      logo_path: roster.org.logo_path ?? null,
    } : null,
    point_system: roster?.point_system ?? null,
    teams: roster?.teams?.map((t) => ({
      slot_number: t.slot_number,
      team_id: t.team_id,
      name: t.name,
      short_name: t.short_name,
      brand_color: t.brand_color,
      logo_path: t.logo_path ?? null,
      player_count: t.players?.length ?? 0,
    })) ?? [],
    has_cloud_config: Boolean(roster?.cloud_endpoint && roster?.cloud_api_key),
    error: getRosterError(),
  };
}

export async function GET() {
  return NextResponse.json(ok(rosterPayload()));
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // ignore
  }
  if (body?.roster_path !== undefined) {
    const nextPath = body.roster_path;
    if (typeof nextPath === 'string' && nextPath.trim()) {
      if (!fs.existsSync(nextPath)) {
        return NextResponse.json(err('Roster file not found at provided path.'));
      }
      setRosterPathOverride(nextPath);
    } else {
      setRosterPathOverride(null);
    }
  }
  reloadRoster();
  return NextResponse.json(ok(rosterPayload()));
}
