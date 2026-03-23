import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/quick-stream
 *
 * Creates a Quick Stream session: a lightweight tournament with auto-scaffolded
 * stage and matches. No team registration required.
 *
 * Body: { name?: string, match_count: number }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const body = await req.json();
  const matchCount = Math.min(Math.max(body.match_count ?? 2, 1), 20);
  const name = body.name?.trim() || `Quick Stream — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // 1. Create tournament with quick_stream format
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      org_id: profile.org_id,
      name,
      format: 'quick_stream',
      registration_open: false,
    })
    .select('id, api_key')
    .single();

  if (tErr || !tournament) {
    return NextResponse.json({ error: tErr?.message ?? 'Failed to create session' }, { status: 500 });
  }

  // 2. Create default point system
  await supabase.from('point_systems').insert({
    tournament_id: tournament.id,
    name: 'Default',
  });

  // 3. Create one stage (active immediately)
  const { data: stage } = await supabase
    .from('stages')
    .insert({
      tournament_id: tournament.id,
      name: 'Session',
      stage_order: 1,
      status: 'active',
      stage_type: 'group',
      auto_advance: false,
      match_count: matchCount,
    })
    .select('id')
    .single();

  if (!stage) {
    return NextResponse.json({ error: 'Failed to create stage' }, { status: 500 });
  }

  // 4. Create N matches
  const matchInserts = Array.from({ length: matchCount }, (_, i) => ({
    stage_id: stage.id,
    name: `Game ${i + 1}`,
    status: 'pending' as const,
  }));

  const { data: matches } = await supabase
    .from('matches')
    .insert(matchInserts)
    .select('id')
    .order('created_at');

  const matchIds = (matches ?? []).map(m => m.id);

  return NextResponse.json({
    id: tournament.id,
    name,
    api_key: tournament.api_key,
    stage_id: stage.id,
    match_ids: matchIds,
    match_count: matchCount,
  });
}
