import { NextResponse } from 'next/server';
import {
  startSync,
  stopSync,
  getSyncStatus,
  getRole,
  subscribeStatus,
  type SyncConfig,
  type SyncRole,
} from '@/lib/realtimeSync';

export const runtime = 'nodejs';

/**
 * GET /api/sync — Get current sync status
 *
 * Optional: ?stream=1 for SSE
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stream = searchParams.get('stream') === '1';

  if (!stream) {
    return NextResponse.json(getSyncStatus());
  }

  // SSE stream for real-time status updates
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      // Send initial status
      const initial = JSON.stringify(getSyncStatus());
      controller.enqueue(encoder.encode(`data: ${initial}\n\n`));

      // Subscribe to status changes
      const unsub = subscribeStatus((status) => {
        try {
          const data = JSON.stringify(status);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // Ping every 10s
      const pingId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingId);
        }
      }, 10000);

      // Cleanup on close
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
 * Body:
 *   { action: "start", role: "leader"|"follower", matchId: "...", supabaseUrl: "...", supabaseAnonKey: "..." }
 *   { action: "stop" }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action as string;

  if (action === 'stop') {
    stopSync();
    return NextResponse.json({ ok: true, status: getSyncStatus() });
  }

  if (action === 'start') {
    const role = body.role as SyncRole;
    if (!role || !['leader', 'follower'].includes(role)) {
      return NextResponse.json({ ok: false, error: 'role must be "leader" or "follower"' }, { status: 400 });
    }

    const matchId = body.matchId as string;
    if (!matchId?.trim()) {
      return NextResponse.json({ ok: false, error: 'matchId is required' }, { status: 400 });
    }

    const supabaseUrl = body.supabaseUrl as string;
    const supabaseAnonKey = body.supabaseAnonKey as string;

    if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
      return NextResponse.json({
        ok: false,
        error: 'supabaseUrl and supabaseAnonKey are required',
      }, { status: 400 });
    }

    const config: SyncConfig = {
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      matchId: matchId.trim(),
      role,
    };

    startSync(config);

    // Give the connection a moment to establish
    await new Promise(r => setTimeout(r, 1500));

    return NextResponse.json({ ok: true, status: getSyncStatus() });
  }

  return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
}
