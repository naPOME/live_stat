import { NextRequest, NextResponse } from 'next/server';
import { getThemeIdx, setThemeIdx, subscribeTheme } from '@/lib/themeStore';

export const runtime = 'nodejs';

// GET /api/theme — returns current active theme index
// GET /api/theme?stream=1 — SSE stream of theme changes
export async function GET(request: NextRequest) {
  const isStream = request.nextUrl.searchParams.get('stream') === '1';

  if (!isStream) {
    return NextResponse.json({ activeThemeIdx: getThemeIdx() });
  }

  // SSE stream
  const encoder = new TextEncoder();
  let pingTimer: NodeJS.Timeout;
  let unsub: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (idx: number) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ activeThemeIdx: idx })}\n\n`));
        } catch { /* disconnected */ }
      };

      // Send current state
      send(getThemeIdx());

      unsub = subscribeTheme(() => send(getThemeIdx()));

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

// POST /api/theme
// Body: { idx: number }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { idx } = body;

  if (typeof idx === 'number' && idx >= 0) {
    setThemeIdx(idx);
  }

  return NextResponse.json({ activeThemeIdx: getThemeIdx() });
}
