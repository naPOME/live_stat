import { subscribe, getAllMatchIds } from "@/lib/pcobStore";

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const matchIds = getAllMatchIds();
      // Find the matchId that looks like a GameID (numeric string), fallback to first
      const gameId = matchIds.find(id => /^\d{15,}$/.test(id)) ?? matchIds[0] ?? "default";
      let pingTimer: NodeJS.Timeout;

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const unsub = subscribe(gameId, send);

      // Initial hello
      controller.enqueue(encoder.encode(`event: hello\ndata: ${JSON.stringify({ ok: true, matchId: gameId })}\n\n`));

      // Keepalive pings every 10 seconds
      pingTimer = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`));
      }, 10000);

      // Cleanup on disconnect
      controller.close = () => {
        clearInterval(pingTimer);
        unsub();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
