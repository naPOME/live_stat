import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/local/connect
 *
 * Called by the Leader PC to create a sync session.
 * Auth: Bearer {tournament.api_key}
 *
 * Body: { match_id?: string }  (optional — picks first active match if omitted)
 *
 * Returns:
 *   { sync_code, supabase_url, supabase_anon_key, match_id, tournament }
 *
 * The sync_code is a short 6-char code that followers use to join.
 */

// In-memory sync sessions (cleared on server restart — acceptable for live sessions)
const syncSessions = new Map<string, {
  supabaseUrl: string;
  supabaseAnonKey: string;
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  createdAt: number;
}>();

// Clean up stale sessions older than 12 hours
function cleanupSessions() {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [code, session] of syncSessions) {
    if (session.createdAt < cutoff) syncSessions.delete(code);
  }
}

function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  cleanupSessions();

  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '').trim();

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Authorization header (Bearer api_key)' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Validate API key → tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('id, name, org_id')
    .eq('api_key', apiKey)
    .single();

  if (tErr || !tournament) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Get match_id from body or find the first active match
  let body: { match_id?: string } = {};
  try { body = await req.json(); } catch { /* */ }

  let matchId: string = body.match_id ?? '';

  if (!matchId) {
    // Find the first pending/live match in the tournament
    const { data: match } = await supabase
      .from('matches')
      .select('id, name, status, stages!inner(tournament_id)')
      .eq('stages.tournament_id', tournament.id)
      .in('status', ['pending', 'live'])
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (match) {
      matchId = match.id;
    } else {
      // Fallback: use tournament ID as match identifier
      matchId = tournament.id;
    }
  }

  // Generate unique sync code
  let syncCode: string;
  do {
    syncCode = generateSyncCode();
  } while (syncSessions.has(syncCode));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Store session
  syncSessions.set(syncCode, {
    supabaseUrl,
    supabaseAnonKey,
    matchId,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    createdAt: Date.now(),
  });

  return NextResponse.json({
    ok: true,
    sync_code: syncCode,
    supabase_url: supabaseUrl,
    supabase_anon_key: supabaseAnonKey,
    match_id: matchId,
    tournament: {
      id: tournament.id,
      name: tournament.name,
    },
  });
}

// Export sessions map so the join endpoint can access it
export { syncSessions };
