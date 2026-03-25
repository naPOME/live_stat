import { NextResponse } from 'next/server';
import {
  startSync,
  stopSync,
  getSyncStatus,
  subscribeStatus,
  type SyncConfig,
} from '@/lib/realtimeSync';
import { getRoster } from '@/lib/rosterStore';

export const runtime = 'nodejs';

// Store the sync code so the dashboard can show it
let currentSyncCode: string | null = null;

export function getSyncCode(): string | null {
  return currentSyncCode;
}

/**
 * GET /api/sync — Current sync status (or SSE with ?stream=1)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stream = searchParams.get('stream') === '1';

  const status = { ...getSyncStatus(), syncCode: currentSyncCode };

  if (!stream) {
    return NextResponse.json(status);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      const initial = JSON.stringify({ ...getSyncStatus(), syncCode: currentSyncCode });
      controller.enqueue(encoder.encode(`data: ${initial}\n\n`));

      const unsub = subscribeStatus((s) => {
        try {
          const data = JSON.stringify({ ...s, syncCode: currentSyncCode });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch { /* */ }
      });

      const pingId = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { clearInterval(pingId); }
      }, 10000);

      request.signal.addEventListener('abort', () => {
        unsub();
        clearInterval(pingId);
        try { controller.close(); } catch { /* */ }
      });
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * POST /api/sync — Control sync mode
 *
 * Actions:
 *   { action: "start-leader" }
 *     — Uses roster's cloud_endpoint + api_key to register with cloud,
 *       gets sync_code + supabase credentials, connects as leader.
 *
 *   { action: "join", code: "ABCDEF", cloudUrl: "https://..." }
 *     — Calls cloud /api/local/join?code=ABCDEF to get credentials,
 *       connects as follower.
 *
 *   { action: "stop" }
 *     — Disconnects.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action as string;

  // ── STOP ──────────────────────────────────────────────────────────────────────
  if (action === 'stop') {
    stopSync();
    currentSyncCode = null;
    return NextResponse.json({ ok: true, status: { ...getSyncStatus(), syncCode: null } });
  }

  // ── START LEADER ──────────────────────────────────────────────────────────────
  if (action === 'start-leader') {
    const roster = getRoster();
    if (!roster?.cloud_endpoint || !roster?.cloud_api_key) {
      return NextResponse.json({
        ok: false,
        error: 'Roster not loaded or missing cloud_endpoint/cloud_api_key. Load a roster first.',
      }, { status: 400 });
    }

    // Call cloud to create sync session
    const cloudUrl = roster.cloud_endpoint.replace(/\/api\/match-results\/?$/, '');
    try {
      const res = await fetch(`${cloudUrl}/api/local/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${roster.cloud_api_key}`,
        },
        body: JSON.stringify({ match_id: roster.match_id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        return NextResponse.json({
          ok: false,
          error: `Cloud rejected: ${err.error || res.statusText}`,
        }, { status: 400 });
      }

      const data = await res.json();

      currentSyncCode = data.sync_code;

      // Connect to Supabase Realtime as leader
      const config: SyncConfig = {
        supabaseUrl: data.supabase_url,
        supabaseAnonKey: data.supabase_anon_key,
        matchId: data.match_id,
        role: 'leader',
      };

      startSync(config);

      // Give connection a moment
      await new Promise(r => setTimeout(r, 1500));

      return NextResponse.json({
        ok: true,
        syncCode: data.sync_code,
        tournament: data.tournament,
        status: { ...getSyncStatus(), syncCode: data.sync_code },
      });
    } catch (err) {
      return NextResponse.json({
        ok: false,
        error: `Failed to reach cloud: ${err instanceof Error ? err.message : 'Network error'}`,
      }, { status: 502 });
    }
  }

  // ── JOIN (FOLLOWER) ───────────────────────────────────────────────────────────
  if (action === 'join') {
    const code = (body.code as string)?.trim().toUpperCase();
    const cloudUrl = (body.cloudUrl as string)?.trim().replace(/\/$/, '') || '';

    if (!code || code.length !== 6) {
      return NextResponse.json({ ok: false, error: 'Sync code must be 6 characters' }, { status: 400 });
    }

    if (!cloudUrl) {
      return NextResponse.json({ ok: false, error: 'No cloud URL found. Link your organization first, or provide a cloud URL.' }, { status: 400 });
    }

    try {
      const res = await fetch(`${cloudUrl}/api/local/join?code=${code}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        return NextResponse.json({
          ok: false,
          error: err.error || `Cloud returned ${res.status}`,
        }, { status: 400 });
      }

      const data = await res.json();

      currentSyncCode = code;

      const config: SyncConfig = {
        supabaseUrl: data.supabase_url,
        supabaseAnonKey: data.supabase_anon_key,
        matchId: data.match_id,
        role: 'follower',
      };

      startSync(config);

      await new Promise(r => setTimeout(r, 1500));

      return NextResponse.json({
        ok: true,
        syncCode: code,
        tournament: data.tournament,
        status: { ...getSyncStatus(), syncCode: code },
      });
    } catch (err) {
      return NextResponse.json({
        ok: false,
        error: `Failed to reach cloud: ${err instanceof Error ? err.message : 'Network error'}`,
      }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
}
