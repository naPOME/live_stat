import { NextResponse } from "next/server";
import { computeLeaderboard, getAllMatchIds } from "@/lib/pcobStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const matchIds = getAllMatchIds();
    console.log("[leaderboard] available matchIds:", matchIds);
    
    // Find the matchId that looks like a GameID (numeric string), fallback to first or default
    const gameId = matchIds.find(id => /^\d{15,}$/.test(id)) ?? matchIds[0] ?? "default";
    console.log("[leaderboard] using gameId:", gameId);
    
    const leaderboard = computeLeaderboard(gameId);
    return NextResponse.json(leaderboard);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[leaderboard] error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
