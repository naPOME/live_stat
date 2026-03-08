import { subscribe, getState } from '@/lib/gameStore';

export const runtime = 'nodejs';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let pingTimer: NodeJS.Timeout;

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch { /* client disconnected */ }
      };

      // Send current state immediately
      send('hello', { ok: true, matchId: getState().gameId });

      const unsub = subscribe('state', (data) => send('state', data));

      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`));
        } catch { clearInterval(pingTimer); }
      }, 10000);

      controller.close = () => {
        clearInterval(pingTimer);
        unsub();
      };
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
