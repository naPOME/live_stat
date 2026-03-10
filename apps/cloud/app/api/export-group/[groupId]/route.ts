import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import JSZip from 'jszip';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const { data: group } = await supabase
    .from('stage_groups')
    .select('*, stage:stages(*, tournament:tournaments(*, point_systems(*)))')
    .eq('id', groupId)
    .single();

  if (!group) return NextResponse.json({ error: 'Division not found' }, { status: 404 });

  const stage = group.stage as any;
  const tournament = stage?.tournament as any;
  if (!tournament || tournament.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: org } = await supabase
    .from('organizations').select('*').eq('id', profile.org_id).single();
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 400 });

  const { data: groupTeams } = await supabase
    .from('group_teams')
    .select('created_at, team:teams(*, players(*))')
    .eq('group_id', groupId)
    .order('created_at');

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at');

  const matchId = matches?.[0]?.id ?? null;

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

  const teams: Array<{
    team_id: string;
    slot_number: number;
    name: string;
    short_name: string;
    brand_color: string;
    logo_path: string;
    logo_path_64: string;
    players: Array<{ player_open_id: string; display_name: string }>;
  }> = [];

  const playerIndex: Record<string, { team_id: string; display_name: string; slot_number: number }> = {};

  for (const [idx, row] of (groupTeams ?? []).entries()) {
    const team = (row as any).team;
    if (!team) continue;
    const slotNum = idx + 1;
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
      brand_color: team.brand_color,
      logo_path: `c:/logo/${padded}.png`,
      logo_path_64: `c:/logo/${padded}_64.png`,
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
    group_id: group.id,
    stage_name: stage.name,
    group_name: group.name,
    match_id: matchId,
    match_ids: (matches ?? []).map((m: any) => m.id),
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

  const zip = new JSZip();
  zip.file('roster_mapping.json', JSON.stringify(rosterMapping, null, 2));

  const logosFolder = zip.folder('logos')!;

  for (const t of teams) {
    const team = (groupTeams ?? []).find((row: any) => row.team?.id === t.team_id)?.team;
    if (!team?.logo_url) continue;
    try {
      const res = await fetch(team.logo_url);
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      const padded = String(t.slot_number).padStart(3, '0');
      logosFolder.file(`${padded}.png`, buffer);
      logosFolder.file(`${padded}_64.png`, buffer);
    } catch {
      // Skip failed logo downloads
    }
  }

  if (org.logo_url) {
    try {
      const res = await fetch(org.logo_url);
      if (res.ok) {
        logosFolder.file('org_logo.png', await res.arrayBuffer());
      }
    } catch { /* skip */ }
  }

  const iniLines = ['[TeamLogoAndColor]', ''];
  for (const t of teams) {
    const padded = String(t.slot_number).padStart(3, '0');
    const hex = t.brand_color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    iniLines.push(`; Slot ${t.slot_number}`);
    iniLines.push(`TeamName${t.slot_number}=${t.name}`);
    iniLines.push(`TeamShortName${t.slot_number}=${t.short_name}`);
    iniLines.push(`TeamLogo${t.slot_number}=c:/logo/${padded}.png`);
    iniLines.push(`TeamColor${t.slot_number}=${r},${g},${b}`);
    iniLines.push('');
  }
  zip.file('TeamLogoAndColor.ini', iniLines.join('\n'));

  zip.file(
    'README.txt',
    [
      'LiveStat Cloud Export',
      `Tournament: ${tournament.name}`,
      `Stage: ${stage.name}`,
      `Division: ${group.name}`,
      `Exported: ${new Date().toISOString()}`,
      '',
      'SETUP INSTRUCTIONS:',
      '1. Extract the logos/ folder to C:/logo/',
      '2. Place roster_mapping.json in your local LiveStat installation',
      '   and set ROSTER_MAPPING_PATH env var to its path.',
      '3. Copy TeamLogoAndColor.ini to your game client scripts folder.',
      '',
      `Teams assigned: ${teams.length}`,
      `Matches in division: ${(matches ?? []).length}`,
      `Players indexed: ${Object.keys(playerIndex).length}`,
    ].join('\n'),
  );

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const safeName = group.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}_export.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
