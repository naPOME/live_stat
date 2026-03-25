import { NextRequest } from 'next/server';
import { subscribe, type Channel } from '@/lib/gameStore';
import { buildLiveState } from '@/lib/liveState';
import { getVisibility, subscribeWidgets } from '@/lib/widgetStore';
import { getThemeIdx, subscribeTheme } from '@/lib/themeStore';
import { getWallpaper, subscribeWallpaper } from '@/lib/wallpaperStore';
import { getLeaderboardPage, subscribeLeaderboardPage } from '@/lib/leaderboardPageStore';

export const runtime = 'nodejs';

/**
 * GET /api/stream — Unified multiplexed SSE stream.
 *
 * Carries ALL real-time channels in a single connection to stay under
 * the browser's 6-connection-per-domain HTTP/1.1 limit.
 *
 * Events emitted:
 *   event: state        — full live game state
 *   event: kill         — individual kill events
 *   event: playercard   — observed player
 *   event: widgets      — widget visibility map
 *   event: theme        — { activeThemeIdx }
 *   event: wallpaper    — { active }
 *   event: lbpage       — { page }
 *   event: ping         — keepalive
 *
 * Query params:
 *   ?filter=state,killfeed,widgets,theme,wallpaper,lbpage
 *   (omit filter to get all channels)
 */
type ExtChannel = Channel | 'widgets' | 'theme' | 'wallpaper' | 'lbpage';
const ALL_CHANNELS: ExtChannel[] = ['state', 'killfeed', 'playercard', 'widgets', 'theme', 'wallpaper', 'lbpage'];

export async function GET(req: NextRequest) {
  const filterParam = req.nextUrl.searchParams.get('filter');
  const allowed = new Set<ExtChannel>(
    filterParam
      ? (filterParam.split(',').map(s => s.trim()).filter(Boolean) as ExtChannel[])
      : ALL_CHANNELS,
  );

  const encoder = new TextEncoder();
  let pingTimer: NodeJS.Timeout;
  const unsubs: Array<() => void> = [];

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { /* disconnected */ }
      };

      // ── Initial state burst ──
      if (allowed.has('state')) send('state', { ok: true, data: buildLiveState() });
      if (allowed.has('widgets')) send('widgets', getVisibility());
      if (allowed.has('theme')) send('theme', { activeThemeIdx: getThemeIdx() });
      if (allowed.has('wallpaper')) send('wallpaper', { active: getWallpaper() });
      if (allowed.has('lbpage')) send('lbpage', { page: getLeaderboardPage() });

      // ── Game channels ──
      const gameChannelMap: Record<string, string> = { state: 'state', killfeed: 'kill', playercard: 'playercard' };
      for (const ch of ['state', 'killfeed', 'playercard'] as Channel[]) {
        if (!allowed.has(ch)) continue;
        const eventName = gameChannelMap[ch] ?? ch;
        unsubs.push(subscribe(ch, (data) => {
          send(eventName, ch === 'state' ? { ok: true, data: buildLiveState() } : data);
        }));
      }

      // ── UI channels ──
      if (allowed.has('widgets')) {
        unsubs.push(subscribeWidgets(() => send('widgets', getVisibility())));
      }
      if (allowed.has('theme')) {
        unsubs.push(subscribeTheme(() => send('theme', { activeThemeIdx: getThemeIdx() })));
      }
      if (allowed.has('wallpaper')) {
        unsubs.push(subscribeWallpaper(() => send('wallpaper', { active: getWallpaper() })));
      }
      if (allowed.has('lbpage')) {
        unsubs.push(subscribeLeaderboardPage(() => send('lbpage', { page: getLeaderboardPage() })));
      }

      // ── Keepalive ──
      pingTimer = setInterval(() => {
        try { controller.enqueue(encoder.encode(`event: ping\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`)); }
        catch { clearInterval(pingTimer); }
      }, 10000);
    },
    cancel() {
      clearInterval(pingTimer);
      unsubs.forEach(fn => fn());
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
