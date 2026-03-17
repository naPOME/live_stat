import { NextRequest } from 'next/server';
import { subscribe, snapshot, type Channel } from '@/lib/gameStore';

export const runtime = 'nodejs';

/**
 * GET /api/stream — Multiplexed SSE stream.
 *
 * Query params:
 *   ?filter=state,kill,playercard   (comma-separated channels, default: all)
 *
 * Events emitted:
 *   event: hello       — initial snapshot on connect
 *   event: state       — full game state change (team/player/phase/circle)
 *   event: kill        — single kill event
 *   event: playercard  — observing player changed
 *   event: ping        — keepalive every 10s
 *
 * Dashboards subscribe with no filter (get everything).
 * Overlays subscribe with ?filter=kill for just killfeed, etc.
 */
export async function GET(req: NextRequest) {
  const filterParam = req.nextUrl.searchParams.get('filter');
  const allowedChannels = new Set<Channel>(
    filterParam
      ? (filterParam.split(',').map(s => s.trim()).filter(Boolean) as Channel[])
      : ['state', 'killfeed', 'playercard']
  );

  // Map SSE event names to internal channel names
  const channelToEvent: Record<Channel, string> = {
    state: 'state',
    killfeed: 'kill',
    playercard: 'playercard',
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const unsubs: Array<() => void> = [];
      let pingTimer: NodeJS.Timeout;

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch { /* client disconnected */ }
      };

      // Send full snapshot on connect
      send('hello', { ok: true, ...snapshot() });

      // Subscribe to requested channels
      for (const ch of allowedChannels) {
        const eventName = channelToEvent[ch] ?? ch;
        const unsub = subscribe(ch, (data) => send(eventName, data));
        unsubs.push(unsub);
      }

      // Keepalive
      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`));
        } catch {
          clearInterval(pingTimer);
        }
      }, 10000);

      // Cleanup on close (overwrite internal close)
      const origCancel = controller.close.bind(controller);
      controller.close = () => {
        clearInterval(pingTimer);
        unsubs.forEach(fn => fn());
        origCancel();
      };
    },
    cancel() {
      // ReadableStream cancel — browser disconnected
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
