import { subscribe, getState } from '@/lib/gameStore';

export const runtime = 'nodejs';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let pingTimer: NodeJS.Timeout;

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* client disconnected */ }
      };

      // Send recent kills on connect
      for (const kill of getState().kills.slice(-8)) {
        send(kill);
      }

      const unsub = subscribe('killfeed', send);

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
