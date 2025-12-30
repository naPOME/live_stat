import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import type { LeaderboardResponse } from "@/lib/types";

// Auto-start the log parser when the API is first accessed
let parserStarted = false;

function ensureParserRunning() {
  if (!parserStarted) {
    try {
      const { startParser } = require("../../dist/parser");
      const logFilePath = 'C:\\Users\\natnaelb\\Downloads\\Telegram Desktop\\log-20251220 (3).txt';
      
      startParser({
        filePath: logFilePath,
        pollIntervalMs: 500,
        onEvent: (data: any) => {
          console.log("[Auto-Parser] Processed event:", data.GameID);
        },
        onError: (error: any) => {
          console.error("[Auto-Parser] Error:", error.message);
        }
      });
      
      parserStarted = true;
      console.log("[Auto-Parser] Log parser started automatically");
    } catch (error) {
      console.error("[Auto-Parser] Failed to start:", error);
    }
  }
}

export const runtime = "nodejs";

function parseLogEntry(text: string): any | null {
  try {
    // Look for the specific pattern: POST /totalmessage
    if (!text.includes("POST /totalmessage")) {
      return null;
    }

    const result: any = {};

    // Extract GameID
    const gameIdMatch = text.match(/GameID:\s*['"]?(\d+)['"]?/);
    if (gameIdMatch) result.GameID = gameIdMatch[1];

    // Extract CurrentTime
    const currentTimeMatch = text.match(/CurrentTime:\s*['"]?(\d+)['"]?/);
    if (currentTimeMatch) result.CurrentTime = currentTimeMatch[1];

    // Extract TeamInfoList
    const teamListMatch = text.match(/TeamInfoList:\s*\[([\s\S]*?)\]/);
    if (teamListMatch) {
      result.TeamInfoList = parseTeamObjects(teamListMatch[1]);
    }

    // Only return if we have meaningful data
    if (result.GameID && (result.TeamInfoList?.length > 0)) {
      return result;
    }

    return null;
  } catch (error) {
    console.error("[Live API] Error parsing log entry:", error);
    return null;
  }
}

function parseTeamObjects(text: string): any[] {
  const teams: any[] = [];
  
  // Extract individual team objects using regex
  const teamMatches = text.match(/\{[^{}]*\}/g);
  if (!teamMatches) return teams;

  for (const teamText of teamMatches) {
    const team: any = {};

    const teamIdMatch = teamText.match(/teamId:\s*(\d+)/);
    if (teamIdMatch) team.teamId = parseInt(teamIdMatch[1]);

    const teamNameMatch = teamText.match(/teamName:\s*['"]([^'"]+)['"]/);
    if (teamNameMatch) team.teamName = teamNameMatch[1];

    const killNumMatch = teamText.match(/killNum:\s*(\d+)/);
    if (killNumMatch) team.killNum = parseInt(killNumMatch[1]);

    const liveMemberNumMatch = teamText.match(/liveMemberNum:\s*(\d+)/);
    if (liveMemberNumMatch) team.liveMemberNum = parseInt(liveMemberNumMatch[1]);

    if (team.teamName && (team.killNum !== undefined || team.liveMemberNum !== undefined)) {
      teams.push(team);
    }
  }

  return teams;
}

function placementToPoints(placement?: number): number {
  if (!placement || placement < 1) return 0;
  const points: Record<number, number> = {
    1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1,
    9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0,
    17: 0, 18: 0, 19: 0, 20: 0,
  };
  return points[placement] ?? 0;
}

export async function GET() {
  try {
    // Auto-start the log parser if not already running
    ensureParserRunning();
    
    const logFilePath = 'C:\\Users\\natnaelb\\Downloads\\Telegram Desktop\\log-20251220 (3).txt';
    
    // Read the log file
    const content = readFileSync(logFilePath, "utf8");
    const lines = content.split("\n");
    
    let currentEvent = "";
    let inEvent = false;
    let latestEvent: any = null;
    
    // Process the log file to find the latest event
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.includes("POST /totalmessage")) {
        inEvent = true;
        currentEvent = "";
      }

      if (inEvent) {
        currentEvent += (currentEvent ? "\n" : "") + trimmed;

        if (currentEvent.includes("}") && 
            currentEvent.includes("GameID:") && 
            currentEvent.includes("TeamInfoList:")) {
          
          const parsed = parseLogEntry(currentEvent);
          if (parsed) {
            latestEvent = parsed; // Keep the latest event
          }
          
          inEvent = false;
          currentEvent = "";
        }
      }
    }

    if (!latestEvent || !latestEvent.TeamInfoList) {
      return NextResponse.json({
        matchId: "default",
        serverTime: Date.now(),
        teams: []
      });
    }

    // Convert to leaderboard format
    const teams = latestEvent.TeamInfoList.map((team: any) => {
      const liveMemberNum = team.liveMemberNum || 0;
      const placementPoints = 0;
      const totalPoints = (team.killNum || 0) + placementPoints;
      const alive = liveMemberNum > 0;
      
      return {
        teamName: team.teamName,
        kills: team.killNum || 0,
        placement: undefined,
        alive: alive,
        liveMemberNum,
        placementPoints,
        totalPoints,
        updatedAt: Date.now(),
      };
    });

    // Sort by total points
    teams.sort((a: any, b: any) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.kills !== a.kills) return b.kills - a.kills;
      return (a.placement ?? Number.POSITIVE_INFINITY) - (b.placement ?? Number.POSITIVE_INFINITY);
    });

    return NextResponse.json({
      matchId: latestEvent.GameID || "default",
      serverTime: Date.now(),
      teams,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Live API] error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
