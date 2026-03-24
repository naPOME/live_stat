import { NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '@/lib/authStore';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments
 * Returns tournaments, stages, and matches for the logged-in user's org.
 *
 * GET /api/tournaments?id=xxx — single tournament with stages + matches
 */
export async function GET(req: NextRequest) {
  const supabase = getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Not logged in' }, { status: 401 });
  }

  const tournamentId = req.nextUrl.searchParams.get('id');

  if (tournamentId) {
    // Single tournament detail with stages + matches
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('id, name, status, format, api_key, created_at, stages(id, name, stage_order, status, matches(id, name, map, status, created_at))')
      .eq('id', tournamentId)
      .single();

    if (error || !tournament) {
      return NextResponse.json({ ok: false, error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, tournament });
  }

  // List all tournaments for user's org
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id, name, status, format, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tournaments: tournaments ?? [] });
}
