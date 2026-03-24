import { NextRequest, NextResponse } from 'next/server';
import { getVisibility, toggle, setVisible, showOnly, hideAll, subscribeWidgets } from '@/lib/widgetStore';

export const runtime = 'nodejs';

// GET /api/widgets — returns current visibility state
// GET /api/widgets?stream=1 — SSE stream of visibility changes
export async function GET(request: NextRequest) {
  const isStream = request.nextUrl.searchParams.get('stream') === '1';

  if (!isStream) {
    return NextResponse.json(getVisibility());
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

      // Send current state
      send(getVisibility());

      unsub = subscribeWidgets(() => send(getVisibility()));

      pingTimer = setInterval(() => {
        try { controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`)); }
        catch { clearInterval(pingTimer); }
      }, 10000);
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
      'Connection': 'keep-alive',
    },
  });
}

// POST /api/widgets — toggle/set/showOnly/hideAll
// Body: { action: 'toggle', key: 'leaderboard' }
//   or  { action: 'set', key: 'leaderboard', visible: true }
//   or  { action: 'showOnly', key: 'results' }
//   or  { action: 'hideAll' }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, key, visible } = body;

  switch (action) {
    case 'toggle':
      if (key) toggle(key);
      break;
    case 'set':
      if (key != null && visible != null) setVisible(key, visible);
      break;
    case 'showOnly':
      if (key) showOnly(key);
      break;
    case 'hideAll':
      hideAll();
      break;
  }

  return NextResponse.json(getVisibility());
}
