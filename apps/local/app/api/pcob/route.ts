import { NextResponse } from "next/server";

import { ingestMockTick, upsertFromPayload, upsertFromPcobRaw, type PcobIngestPayload } from "@/lib/pcobStore";
import { isDemoModeEnabled } from "@/lib/demoMode";

export const runtime = "nodejs";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validatePayload(payload: unknown): { ok: true; value: PcobIngestPayload } | { ok: false; error: string } {
  if (!isObject(payload)) return { ok: false, error: "Body must be a JSON object" };

  if ("matchId" in payload && payload.matchId !== undefined && typeof payload.matchId !== "string") {
    return { ok: false, error: "matchId must be a string" };
  }

  if ("timestamp" in payload && payload.timestamp !== undefined && typeof payload.timestamp !== "number") {
    return { ok: false, error: "timestamp must be a number (ms since epoch)" };
  }

  if ("teams" in payload && payload.teams !== undefined && !Array.isArray(payload.teams)) {
    return { ok: false, error: "teams must be an array" };
  }

  if ("team" in payload && payload.team !== undefined && !isObject(payload.team)) {
    return { ok: false, error: "team must be an object" };
  }

  const typed = payload as PcobIngestPayload;
  const teams = typed.teams ?? (typed.team ? [typed.team] : []);
  if (teams.length === 0) {
    return { ok: false, error: "payload must contain team or teams" };
  }

  for (const t of teams) {
    if (!t || typeof t.name !== "string" || !t.name.trim()) {
      return { ok: false, error: "each team must have a non-empty name" };
    }
    if (t.kills !== undefined && typeof t.kills !== "number") {
      return { ok: false, error: `kills must be a number for team ${t.name}` };
    }
    if (t.placement !== undefined && typeof t.placement !== "number") {
      return { ok: false, error: `placement must be a number for team ${t.name}` };
    }
    if (t.alive !== undefined && typeof t.alive !== "boolean") {
      return { ok: false, error: `alive must be a boolean for team ${t.name}` };
    }
    if (t.players !== undefined && !Array.isArray(t.players)) {
      return { ok: false, error: `players must be an array for team ${t.name}` };
    }
  }

  return { ok: true, value: typed };
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mock = searchParams.get("mock") === "1";

    const body = (await req.json()) as unknown;

    if (mock) {
      if (!isDemoModeEnabled()) {
        return NextResponse.json(
          {
            ok: false,
            error: "mock ingest is disabled. Enable demo mode via /api/demo-mode first.",
          },
          { status: 403 },
        );
      }
      const matchIdFromBody =
        isObject(body) && typeof body.matchId === "string" && body.matchId.trim() ? body.matchId.trim() : undefined;
      const matchId = matchIdFromBody ?? "default";
      ingestMockTick(matchId);
      return NextResponse.json({ ok: true, matchId, mock: true }, { status: 200 });
    }

    const pcob = upsertFromPcobRaw(body);
    if (pcob.recognized) {
      return NextResponse.json({ ok: true, matchId: pcob.matchId, changed: pcob.changed, source: "pcob" }, { status: 200 });
    }

    const validated = validatePayload(body);

    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const { matchId, changed } = upsertFromPayload(validated.value);
    return NextResponse.json({ ok: true, matchId, changed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      usage: {
        method: "POST",
        path: "/api/pcob",
        mock: {
          path: "/api/pcob?mock=1",
          requiresDemoMode: true,
          bodyExample: { matchId: "match-1" },
        },
        bodyExample: {
          matchId: "match-1",
          timestamp: Date.now(),
          teams: [
            { name: "Team A", kills: 3, placement: 5, alive: true },
            { name: "Team B", kills: 1, placement: 12, alive: false },
          ],
        },
      },
    },
    { status: 200 },
  );
}
