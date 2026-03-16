import { NextRequest, NextResponse } from 'next/server';
import { syncSessions } from '../connect/route';

/**
 * GET /api/local/join?code=ABCDEF
 *
 * Public endpoint — no auth required.
 * Called by Follower PCs to join an existing sync session using the 6-char code.
 *
 * Returns: { supabase_url, supabase_anon_key, match_id, tournament }
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();

  if (!code || code.length !== 6) {
    return NextResponse.json(
      { error: 'Invalid sync code. Must be 6 characters.' },
      { status: 400 },
    );
  }

  const session = syncSessions.get(code);

  if (!session) {
    return NextResponse.json(
      { error: 'Sync code not found. Make sure the Leader has started the session.' },
      { status: 404 },
    );
  }

  // Check if session is stale (>12h)
  if (Date.now() - session.createdAt > 12 * 60 * 60 * 1000) {
    syncSessions.delete(code);
    return NextResponse.json(
      { error: 'Sync session has expired. Leader needs to start a new one.' },
      { status: 410 },
    );
  }

  return NextResponse.json({
    ok: true,
    supabase_url: session.supabaseUrl,
    supabase_anon_key: session.supabaseAnonKey,
    match_id: session.matchId,
    tournament: {
      id: session.tournamentId,
      name: session.tournamentName,
    },
  });
}
