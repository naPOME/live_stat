import { NextRequest, NextResponse } from 'next/server';
import { getWallpaper, setWallpaper, subscribeWallpaper } from '@/lib/wallpaperStore';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// GET /api/wallpaper — current wallpaper + available list
// GET /api/wallpaper?stream=1 — SSE stream
export async function GET(request: NextRequest) {
  const isStream = request.nextUrl.searchParams.get('stream') === '1';

  if (!isStream) {
    const available = listWallpapers();
    return NextResponse.json({ active: getWallpaper(), available });
  }

  const encoder = new TextEncoder();
  let pingTimer: NodeJS.Timeout;
  let unsub: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ active: getWallpaper() })}\n\n`));
        } catch { /* disconnected */ }
      };
      send();
      unsub = subscribeWallpaper(send);
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
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

// POST /api/wallpaper — { url: '/wallpapers/erangel.jpg' } or { url: null }
export async function POST(request: NextRequest) {
  const body = await request.json();
  setWallpaper(body.url ?? null);
  return NextResponse.json({ active: getWallpaper() });
}

function listWallpapers(): string[] {
  try {
    const dir = path.join(process.cwd(), 'public', 'wallpapers');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map(f => `/wallpapers/${f}`);
  } catch {
    return [];
  }
}
