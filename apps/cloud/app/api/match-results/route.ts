import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '').trim();

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  let body: {
    tournament_id: string;
    stage_id: string;
    match_id: string;
    game_id: string;
    results: Array<{
      team_id: string;
      placement: number;
      kill_count: number;
      total_pts: number;
    }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify the api_key belongs to this tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, api_key')
    .eq('id', body.tournament_id)
    .single();

  if (!tournament || String(tournament.api_key) !== apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Upsert match results
  const rows = body.results.map((r) => ({
    match_id: body.match_id,
    team_id: r.team_id,
    placement: r.placement,
    kill_count: r.kill_count,
    total_pts: r.total_pts,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('match_results')
      .upsert(rows, { onConflict: 'match_id,team_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Mark match as finished
  await supabase
    .from('matches')
    .update({ status: 'finished' })
    .eq('id', body.match_id);

  console.log(`[match-results] Synced ${rows.length} results for match ${body.match_id}`);
  return NextResponse.json({ ok: true, synced: rows.length });
}
