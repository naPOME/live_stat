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
    match_id: roster?.match_id ?? null,
    teams_preview: roster?.teams?.map((t) => ({
      slot_number: t.slot_number,
      name: t.name,
      short_name: t.short_name,
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
