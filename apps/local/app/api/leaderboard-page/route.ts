import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboardPage, setLeaderboardPage, toggleLeaderboardPage, subscribeLeaderboardPage } from '@/lib/leaderboardPageStore';

export const runtime = 'nodejs';

// GET — current page or SSE stream
export async function GET(request: NextRequest) {
  const isStream = request.nextUrl.searchParams.get('stream') === '1';

  if (!isStream) {
    return NextResponse.json({ page: getLeaderboardPage() });
  }

  const encoder = new TextEncoder();
  let pingTimer: NodeJS.Timeout;
  let unsub: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ page: getLeaderboardPage() })}\n\n`)); }
        catch { /* */ }
      };
      send();
      unsub = subscribeLeaderboardPage(send);
      pingTimer = setInterval(() => {
        try { controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`)); }
        catch { clearInterval(pingTimer); }
      }, 10000);
    },
    cancel() { clearInterval(pingTimer); unsub?.(); },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

// POST — { action: 'toggle' } or { page: 1 }
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.action === 'toggle') {
    toggleLeaderboardPage();
  } else if (typeof body.page === 'number') {
    setLeaderboardPage(body.page);
  }
  return NextResponse.json({ page: getLeaderboardPage() });
}
