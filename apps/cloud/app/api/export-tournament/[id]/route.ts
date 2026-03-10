import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import JSZip from 'jszip';

const DEFAULT_INCLUDE = ['tournament', 'stages', 'matches', 'results', 'teams', 'players'];

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

  const includeParam = request.nextUrl.searchParams.get('include');
  const include = includeParam
    ? includeParam.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_INCLUDE;
  const includeSet = new Set(include);

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (!tournament || tournament.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  const zip = new JSZip();
  zip.file('export_meta.json', JSON.stringify({
    exported_at: new Date().toISOString(),
    include,
    tournament_id: id,
  }, null, 2));

  if (includeSet.has('tournament')) {
    zip.file('tournament.json', JSON.stringify(tournament, null, 2));
  }

  const { data: stages } = await supabase
    .from('stages')
    .select('*')
    .eq('tournament_id', id)
    .order('stage_order');

  if (includeSet.has('stages')) {
    zip.file('stages.json', JSON.stringify(stages ?? [], null, 2));
  }

  const stageIds = (stages ?? []).map((s) => s.id);
  const { data: matches } = stageIds.length > 0
    ? await supabase.from('matches').select('*').in('stage_id', stageIds).order('created_at')
    : { data: [] };

  if (includeSet.has('matches')) {
    zip.file('matches.json', JSON.stringify(matches ?? [], null, 2));
  }

  const matchIds = (matches ?? []).map((m) => m.id);
  const { data: results } = matchIds.length > 0
    ? await supabase.from('match_results').select('*').in('match_id', matchIds).order('created_at')
    : { data: [] };

  if (includeSet.has('results')) {
    zip.file('match_results.json', JSON.stringify(results ?? [], null, 2));
  }

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('created_at');

  if (includeSet.has('teams')) {
    zip.file('teams.json', JSON.stringify(teams ?? [], null, 2));
  }

  const teamIds = (teams ?? []).map((t) => t.id);
  const { data: players } = teamIds.length > 0
    ? await supabase.from('players').select('*').in('team_id', teamIds).order('created_at')
    : { data: [] };

  if (includeSet.has('players')) {
    zip.file('players.json', JSON.stringify(players ?? [], null, 2));
  }

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
