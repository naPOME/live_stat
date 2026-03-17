import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import JSZip from 'jszip';
import { generatePcobIni, addTeamLogos } from '@/lib/export/pcob-ini';
import { getSlotColor } from '@/lib/config/tournament';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 });

  // Fetch match → stage → tournament
  const { data: match } = await supabase
    .from('matches')
    .select('*, stage:stages(*, tournament:tournaments(*, point_systems(*)))')
    .eq('id', matchId)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const stage = match.stage as any;
  const tournament = stage?.tournament as any;

  if (!tournament || tournament.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch org
  const { data: org } = await supabase
    .from('organizations').select('*').eq('id', profile.org_id).single();
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 400 });

  // Fetch roster slots with teams + players
  const { data: slots } = await supabase
    .from('match_slots')
    .select('slot_number, team:teams(*, players(*))')
    .eq('match_id', matchId)
    .order('slot_number');

  // Point system: use first point_system for tournament
  const ps = tournament.point_systems?.[0];
  const pointSystem = ps
    ? { kill_points: Number(ps.kill_points), placement_points: ps.placement_points as Record<string, number> }
    : {
        kill_points: 1,
        placement_points: {
          '1': 10, '2': 6, '3': 5, '4': 4, '5': 3, '6': 2,
          '7': 1, '8': 1, '9': 0, '10': 0,
        },
      };

  // Build teams array and player_index
  const teams: Array<{
    team_id: string;
    slot_number: number;
    name: string;
    short_name: string;
    brand_color: string;
    logo_path: string;
    logo_path_64: string;
    logo_path_128: string;
    logo_path_256: string;
    players: Array<{ player_open_id: string; display_name: string }>;
  }> = [];

  const playerIndex: Record<string, { team_id: string; display_name: string; slot_number: number }> = {};

  for (const slot of slots ?? []) {
    const team = slot.team as any;
    if (!team) continue;
    const slotNum: number = slot.slot_number;
    const padded = String(slotNum).padStart(3, '0');

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
      logo_path: `c:/logo/${padded}.png`,
      logo_path_64: `c:/logo/${padded}_64.png`,
      logo_path_128: `c:/logo/${padded}_128.png`,
      logo_path_256: `c:/logo/${padded}_256.png`,
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

  const cloudEndpoint = `${request.nextUrl.origin}/api/match-results`;

  const rosterMapping = {
    version: 1,
    tournament_id: tournament.id,
    stage_id: stage.id,
    match_id: matchId,
    cloud_endpoint: cloudEndpoint,
    cloud_api_key: tournament.api_key,
    point_system: pointSystem,
    org: {
      id: org.id,
      name: org.name,
      brand_color: org.brand_color,
      logo_path: 'c:/logo/org_logo.png',
      theme: {
        bg_color: org.bg_color,
        accent_color: org.accent_color,
        font: org.font,
      },
    },
    teams,
    player_index: playerIndex,
  };

  // Build ZIP
  const zip = new JSZip();
  zip.file('roster_mapping.json', JSON.stringify(rosterMapping, null, 2));

  const logosFolder = zip.folder('logos')!;

  // Fetch & include team logos (4 resolution variants per team)
  const logoUrlMap = new Map<string, string>();
  for (const slot of slots ?? []) {
    const team = slot.team as any;
    if (team?.logo_url) logoUrlMap.set(team.id, team.logo_url);
  }
  await addTeamLogos(logosFolder, teams, (id) => logoUrlMap.get(id) ?? null);

  // Org logo
  if (org.logo_url) {
    try {
      const res = await fetch(org.logo_url);
      if (res.ok) {
        logosFolder.file('org_logo.png', await res.arrayBuffer());
      }
    } catch { /* skip */ }
  }

  // Generate PCOB-compatible TeamLogoAndColor.ini
  zip.file('TeamLogoAndColor.ini', generatePcobIni(teams));

  // README
  zip.file(
    'README.txt',
    [
      'LiveStat Cloud Export',
      `Tournament: ${tournament.name}`,
      `Stage: ${stage.name}`,
      `Match: ${match.name}`,
      `Exported: ${new Date().toISOString()}`,
      '',
      'SETUP INSTRUCTIONS:',
      '1. Extract the logos/ folder to C:/logo/',
      '2. Place roster_mapping.json in your local LiveStat installation',
      '   and set ROSTER_MAPPING_PATH env var to its path.',
      '3. Copy TeamLogoAndColor.ini to your game client scripts folder.',
      '',
      `Teams assigned: ${teams.length}`,
      `Players indexed: ${Object.keys(playerIndex).length}`,
    ].join('\n'),
  );

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const safeName = match.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}_export.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
