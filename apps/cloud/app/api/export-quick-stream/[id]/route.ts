import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import JSZip from 'jszip';

/**
 * GET /api/export-quick-stream/[id]
 *
 * Generates a minimal ZIP for a Quick Stream session.
 * Contains roster_mapping.json with empty teams (auto-discovered from game logs).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*, point_systems(*)')
    .eq('id', id)
    .eq('format', 'quick_stream')
    .single();

  if (!tournament || tournament.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: org } = await supabase
    .from('organizations').select('*').eq('id', profile.org_id).single();
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 400 });

  // Get the stage and its matches
  const { data: stage } = await supabase
    .from('stages')
    .select('id, name')
    .eq('tournament_id', id)
    .order('stage_order')
    .limit(1)
    .single();

  if (!stage) return NextResponse.json({ error: 'No stage found' }, { status: 400 });

  const { data: matches } = await supabase
    .from('matches')
    .select('id')
    .eq('stage_id', stage.id)
    .order('created_at');

  const matchIds = (matches ?? []).map(m => m.id);
  const primaryMatchId = matchIds[0] ?? null;

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

  const cloudEndpoint = `${request.nextUrl.origin}/api/match-results`;

  const rosterMapping = {
    version: 1,
    tournament_id: tournament.id,
    stage_id: stage.id,
    stage_name: stage.name,
    match_id: primaryMatchId,
    match_ids: matchIds,
    cloud_endpoint: cloudEndpoint,
    cloud_api_key: tournament.api_key,
    point_system: pointSystem,
    org: {
      id: org.id,
      name: org.name,
      brand_color: org.brand_color,
      sponsors: [org.sponsor1_url, org.sponsor2_url, org.sponsor3_url].filter(Boolean),
      theme: {
        bg_color: org.bg_color,
        accent_color: org.accent_color,
        font: org.font,
      },
    },
    teams: [],
    player_index: {},
  };

  const zip = new JSZip();
  zip.file('roster_mapping.json', JSON.stringify(rosterMapping, null, 2));

  zip.file(
    'README.txt',
    [
      'LiveStat Quick Stream Export',
      `Session: ${tournament.name}`,
      `Exported: ${new Date().toISOString()}`,
      '',
      'SETUP INSTRUCTIONS:',
      '1. Place roster_mapping.json in your local LiveStat installation',
      '   and set ROSTER_MAPPING_PATH env var to its path.',
      '2. Start the local engine and begin your game.',
      '3. Teams and players will be auto-discovered from game logs.',
      '',
      `Matches configured: ${matchIds.length}`,
      'No team registration required.',
    ].join('\n'),
  );

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const safeName = tournament.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}_export.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
