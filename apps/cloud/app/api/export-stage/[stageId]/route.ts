import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import JSZip from 'jszip';
import { generatePcobIni, addTeamLogos } from '@/lib/export/pcob-ini';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string }> },
) {
  const { stageId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const { data: stage } = await supabase
    .from('stages')
    .select('*, tournament:tournaments(*, point_systems(*))')
    .eq('id', stageId)
    .single();

  if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 });

  const tournament = stage.tournament as any;
  if (!tournament || tournament.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: org } = await supabase
    .from('organizations').select('*').eq('id', profile.org_id).single();
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 400 });

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('stage_id', stageId)
    .order('created_at');

  const primaryMatchId = matches?.[0]?.id ?? null;
  let slots: Array<{ slot_number: number; team: any }> = [];

  if (primaryMatchId) {
    const { data: slotRows } = await supabase
      .from('match_slots')
      .select('slot_number, team:teams(*, players(*))')
      .eq('match_id', primaryMatchId)
      .order('slot_number');
    slots = (slotRows as any[]) ?? [];
  }

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
    logo_path_128: string;
    logo_path_256: string;
    players: Array<{ player_open_id: string; display_name: string }>;
  }> = [];

  const playerIndex: Record<string, { team_id: string; display_name: string; slot_number: number }> = {};

  let teamLogoMap = new Map<string, string>();
  if (slots.length > 0) {
    for (const slot of slots) {
      const team = slot.team as any;
      if (!team) continue;
      const slotNum = slot.slot_number;
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
        logo_path_128: `c:/logo/${padded}_128.png`,
        logo_path_256: `c:/logo/${padded}_256.png`,
        players: teamPlayers,
      });

      if (team.logo_url) {
        teamLogoMap.set(team.id, team.logo_url);
      }

      for (const p of teamPlayers) {
        playerIndex[p.player_open_id] = {
          team_id: team.id,
          display_name: p.display_name,
          slot_number: slotNum,
        };
      }
    }
  }
  if (slots.length === 0) {
    const { data: tournamentTeams } = await supabase
      .from('tournament_teams')
      .select('seed, created_at, team:teams(*, players(*))')
      .eq('tournament_id', stage.tournament_id)
      .order('seed', { ascending: true, nullsFirst: false })
      .order('created_at');

    for (const [idx, row] of (tournamentTeams ?? []).entries()) {
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
        logo_path_128: `c:/logo/${padded}_128.png`,
        logo_path_256: `c:/logo/${padded}_256.png`,
        players: teamPlayers,
      });

      if (team.logo_url) {
        teamLogoMap.set(team.id, team.logo_url);
      }

      for (const p of teamPlayers) {
        playerIndex[p.player_open_id] = {
          team_id: team.id,
          display_name: p.display_name,
          slot_number: slotNum,
        };
      }
    }
  }

  const cloudEndpoint = `${request.nextUrl.origin}/api/match-results`;

  const rosterMapping = {
    version: 1,
    tournament_id: tournament.id,
    stage_id: stage.id,
    stage_name: stage.name,
    match_id: primaryMatchId,
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

  await addTeamLogos(logosFolder, teams, (id) => teamLogoMap.get(id) ?? null);

  if (org.logo_url) {
    try {
      const res = await fetch(org.logo_url);
      if (res.ok) {
        logosFolder.file('org_logo.png', await res.arrayBuffer());
      }
    } catch { /* skip */ }
  }

  zip.file('TeamLogoAndColor.ini', generatePcobIni(teams));

  zip.file(
    'README.txt',
    [
      'LiveStat Cloud Export',
      `Tournament: ${tournament.name}`,
      `Stage: ${stage.name}`,
      `Exported: ${new Date().toISOString()}`,
      '',
      'SETUP INSTRUCTIONS:',
      '1. Extract the logos/ folder to C:/logo/',
      '2. Place roster_mapping.json in your local LiveStat installation',
      '   and set ROSTER_MAPPING_PATH env var to its path.',
      '3. Copy TeamLogoAndColor.ini to your game client scripts folder.',
      '',
      `Teams assigned: ${teams.length}`,
      `Matches in stage: ${(matches ?? []).length}`,
      `Players indexed: ${Object.keys(playerIndex).length}`,
    ].join('\n'),
  );

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const safeName = stage.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}_export.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
