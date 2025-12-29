import { NextResponse } from "next/server";
import { startParser, stopParser, type ParserOptions } from "@/lib/parser";

export const runtime = "nodejs";

const activeWatchers = new Map<string, ParserOptions>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filePath, action, pollIntervalMs } = body as {
      filePath?: string;
      action?: "start" | "stop";
      pollIntervalMs?: number;
    };

    if (action === "stop") {
      stopParser();
      activeWatchers.clear();
      return NextResponse.json({ ok: true, status: "stopped" });
    }

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json({ ok: false, error: "filePath is required" }, { status: 400 });
    }

    const key = filePath.trim();
    if (activeWatchers.has(key)) {
      return NextResponse.json({ ok: true, status: "already-watching", filePath: key });
    }

    startParser({
      filePath,
      pollIntervalMs: typeof pollIntervalMs === "number" && pollIntervalMs > 0 ? pollIntervalMs : 500,
      onEvent: (raw: any) => {
        console.log("[Parser] processed event", typeof raw);
      },
      onError: (err: any) => {
        console.error("[Parser] error", err);
      },
    });

    activeWatchers.set(key, { filePath, pollIntervalMs });
    return NextResponse.json({ ok: true, status: "started", filePath: key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage: {
      method: "POST",
      path: "/api/watcher",
      bodyExamples: [
        { action: "start", filePath: "/path/to/pcob.log", pollIntervalMs: 500 },
        { action: "stop" },
      ],
    },
    active: Array.from(activeWatchers.keys()),
  });
}
