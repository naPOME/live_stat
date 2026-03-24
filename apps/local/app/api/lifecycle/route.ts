import { NextRequest, NextResponse } from 'next/server';
import {
  getLifecycleState, subscribeLifecycle, resetForNextMatch,
  dismissNotification, syncPending, syncDone,
} from '@/lib/lifecycleStore';
import { resetForNextMatch as resetGameState } from '@/lib/gameStore';

export const runtime = 'nodejs';

// Init lifecycle on first request
import '@/lib/lifecycleStore';

export async function GET(req: NextRequest) {
  const isStream = req.nextUrl.searchParams.get('stream') === '1';

  if (!isStream) {
    return NextResponse.json(getLifecycleState());
  }

  // SSE stream
  const encoder = new TextEncoder();
  let pingTimer: NodeJS.Timeout;
  let unsub: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* disconnected */ }
      };

      // Send current state immediately
      send(getLifecycleState());

      unsub = subscribeLifecycle((state) => send(state));

      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch { clearInterval(pingTimer); }
      }, 15000);
    },
    cancel() {
      clearInterval(pingTimer);
      unsub?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;

    switch (action) {
      case 'reset':
        resetGameState();
        resetForNextMatch();
        return NextResponse.json({ ok: true });

      case 'dismiss-notification':
        if (body.id) dismissNotification(body.id);
        return NextResponse.json({ ok: true });

      case 'retry-sync': {
        syncPending();
        // Re-trigger cloud sync
        try {
          const { pushMatchResult } = await import('@/lib/cloudSync');
          const result = await pushMatchResult();
          syncDone(result.ok, result.error);
        } catch (e) {
          syncDone(false, e instanceof Error ? e.message : 'Unknown error');
        }
        return NextResponse.json({ ok: true, state: getLifecycleState() });
      }

      default:
        return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}
