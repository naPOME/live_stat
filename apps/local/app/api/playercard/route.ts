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

      // Send current observer state on connect
      const gs = getState();
      if (gs.observingUid) {
        const openId = gs.uidToOpenId.get(gs.observingUid) ?? gs.observingUid;
        const player = gs.players.get(openId);
        const team = player ? gs.teams.get(player.teamSlot) : undefined;
        send({ uid: gs.observingUid, openId, player, team });
      }

      const unsub = subscribe('playercard', send);

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
