import { NextRequest } from 'next/server';
import { subscribe, type Channel } from '@/lib/gameStore';
import { buildLiveState } from '@/lib/liveState';

export const runtime = 'nodejs';

/**
 * GET /api/stream - Multiplexed SSE stream.
 * Query params:
 *   ?filter=state,killfeed,playercard
 */
export async function GET(req: NextRequest) {
  const filterParam = req.nextUrl.searchParams.get('filter');
  const allowedChannels = new Set<Channel>(
    filterParam
      ? (filterParam.split(',').map((s) => s.trim()).filter(Boolean) as Channel[])
      : ['state', 'killfeed', 'playercard']
  );

  const channelToEvent: Record<Channel, string> = {
    state: 'state',
    killfeed: 'kill',
    playercard: 'playercard',
  };

  const encoder = new TextEncoder();
  let pingTimer: NodeJS.Timeout;
  const unsubs: Array<() => void> = [];

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected.
        }
      };

      send('hello', { ok: true, data: buildLiveState() });

      for (const ch of allowedChannels) {
        const eventName = channelToEvent[ch] ?? ch;
        const unsub = subscribe(ch, (data) => {
          if (ch === 'state') {
            send(eventName, { ok: true, data: buildLiveState() });
            return;
          }
          send(eventName, data);
        });
        unsubs.push(unsub);
      }

      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`));
        } catch {
          clearInterval(pingTimer);
        }
      }, 10000);
    },
    cancel() {
      clearInterval(pingTimer);
      unsubs.forEach((fn) => fn());
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
