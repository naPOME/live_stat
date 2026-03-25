import { NextResponse } from 'next/server';
import { getRoster } from '@/lib/rosterStore';
import { ok } from '@shared/api';

export const runtime = 'nodejs';

export async function GET() {
  const roster = getRoster();
  return NextResponse.json(ok({
    roster_loaded: Boolean(roster),
    team_count: roster?.teams?.length ?? 0,
    player_count: roster ? Object.keys(roster.player_index ?? {}).length : 0,
    tournament_id: roster?.tournament_id ?? null,
    stage_id: roster?.stage_id ?? null,
    stage_name: roster?.stage_name ?? null,
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
  }));
}
