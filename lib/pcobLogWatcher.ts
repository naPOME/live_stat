import { watchFile, readFile, statSync } from "fs";
import { resolve } from "path";
import { upsertFromPcobRaw } from "./pcobStore";

export interface PcobLogWatcherOptions {
  filePath: string;
  onEvent?: (raw: unknown) => void;
  onError?: (error: Error) => void;
  pollIntervalMs?: number;
}

export class PcobLogWatcher {
  private filePath: string;
  private pollIntervalMs: number;
  private onEvent: (event: unknown) => void;
  private onError: (error: Error) => void;
  private running: boolean = false;
  private timer: NodeJS.Timeout | undefined;
  private lastSize: number = 0;
  private buffer: string = "";
  private debugCount: number = 0;

  constructor(opts: PcobLogWatcherOptions) {
    this.filePath = resolve(opts.filePath);
    this.onEvent = opts.onEvent ?? (() => {});
    this.onError = opts.onError ?? (() => {});
    this.pollIntervalMs = opts.pollIntervalMs ?? 500;
  }

  private readTail(): void {
    try {
      const stats = statSync(this.filePath);
      if (stats.size < this.lastSize) {
        this.lastSize = 0;
        this.buffer = "";
      }
      if (stats.size === this.lastSize) return;

      const fd = require("fs").openSync(this.filePath, "r");
      const buf = Buffer.allocUnsafe(stats.size - this.lastSize);
      require("fs").readSync(fd, buf, 0, buf.length, this.lastSize);
      require("fs").closeSync(fd);

      this.buffer += buf.toString("utf8");
      this.lastSize = stats.size;

      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // For tailing, we'll just accumulate and look for complete events
        // This is a simplified approach for real-time updates
        if (trimmed.includes("POST /totalmessage")) {
          // Start of a new event - in a real implementation, we'd need to buffer this
          // For now, we'll skip real-time tailing to focus on the initial file read
          continue;
        }
      }
    } catch (e) {
      this.onError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private parsePcobTotalMessage(text: string): any | null {
  try {
    const result: any = {};
    
    // Extract GameID
    const gameIdMatch = text.match(/GameID:\s*['"]?(\d+)['"]?/);
    if (gameIdMatch) result.GameID = gameIdMatch[1];
    
    // Extract CurrentTime
    const currentTimeMatch = text.match(/CurrentTime:\s*['"]?(\d+)['"]?/);
    if (currentTimeMatch) result.CurrentTime = currentTimeMatch[1];
    
    // Extract TotalPlayerList - use a different approach without the 's' flag
    const playerListStart = text.indexOf("TotalPlayerList:");
    if (playerListStart !== -1) {
      const playerListText = this.extractArrayContent(text, playerListStart);
      result.TotalPlayerList = this.parsePlayerArray(playerListText);
    }
    
    // Extract TeamInfoList - use a different approach without the 's' flag
    const teamListStart = text.indexOf("TeamInfoList:");
    if (teamListStart !== -1) {
      const teamListText = this.extractArrayContent(text, teamListStart);
      result.TeamInfoList = this.parseTeamArray(teamListText);
    }
    
    // Extract other simple fields
    const gameStartTimeMatch = text.match(/GameStartTime:\s*['"]?(\d+)['"]?/);
    if (gameStartTimeMatch) result.GameStartTime = gameStartTimeMatch[1];
    
    const fightingStartTimeMatch = text.match(/FightingStartTime:\s*['"]?(\d+)['"]?/);
    if (fightingStartTimeMatch) result.FightingStartTime = fightingStartTimeMatch[1];
    
    const finishedStartTimeMatch = text.match(/FinishedStartTime:\s*['"]?(\d+)['"]?/);
    if (finishedStartTimeMatch) result.FinishedStartTime = finishedStartTimeMatch[1];
    
    return result;
  } catch (e) {
    console.error("[PCOB watcher] parsePcobTotalMessage error:", e);
    return null;
  }
}

private extractArrayContent(text: string, startIndex: number): string {
  // Find the opening [ after the field name
  const bracketStart = text.indexOf('[', startIndex);
  if (bracketStart === -1) return "";
  
  let bracketCount = 1;
  let endIndex = bracketStart + 1;
  
  // Count brackets to find the matching closing bracket
  for (; endIndex < text.length; endIndex++) {
    if (text[endIndex] === '[') bracketCount++;
    else if (text[endIndex] === ']') bracketCount--;
    
    if (bracketCount === 0) break;
  }
  
  return text.substring(bracketStart + 1, endIndex);
}

private parsePlayerArray(text: string): any[] {
  const players: any[] = [];
  const playerMatches = text.match(/\{[^{}]*\}/g) || [];
  
  for (const playerText of playerMatches) {
    const player: any = {};
    
    // Extract uId
    const uIdMatch = playerText.match(/uId:\s*(\d+)/);
    if (uIdMatch) player.uId = parseInt(uIdMatch[1]);
    
    // Extract playerName
    const nameMatch = playerText.match(/playerName:\s*['"]([^'"]+)['"]/);
    if (nameMatch) player.playerName = nameMatch[1];
    
    // Extract teamId
    const teamIdMatch = playerText.match(/teamId:\s*(\d+)/);
    if (teamIdMatch) player.teamId = parseInt(teamIdMatch[1]);
    
    // Extract teamName
    const teamNameMatch = playerText.match(/teamName:\s*['"]([^'"]+)['"]/);
    if (teamNameMatch) player.teamName = teamNameMatch[1];
    
    // Extract killNum
    const killNumMatch = playerText.match(/killNum:\s*(\d+)/);
    if (killNumMatch) player.killNum = parseInt(killNumMatch[1]);
    
    // Extract rank
    const rankMatch = playerText.match(/rank:\s*(\d+)/);
    if (rankMatch) player.rank = parseInt(rankMatch[1]);
    
    // Extract health
    const healthMatch = playerText.match(/health:\s*(\d+)/);
    if (healthMatch) player.health = parseInt(healthMatch[1]);
    
    // Extract liveState
    const liveStateMatch = playerText.match(/liveState:\s*(\d+)/);
    if (liveStateMatch) player.liveState = parseInt(liveStateMatch[1]);
    
    // Extract bHasDied
    const bHasDiedMatch = playerText.match(/bHasDied:\s*(true|false)/);
    if (bHasDiedMatch) player.bHasDied = bHasDiedMatch[1] === 'true';
    
    players.push(player);
  }
  
  return players;
}

private parseTeamArray(text: string): any[] {
  const teams: any[] = [];
  const teamMatches = text.match(/\{[^{}]*\}/g) || [];
  
  for (const teamText of teamMatches) {
    const team: any = {};
    
    // Extract teamId
    const teamIdMatch = teamText.match(/teamId:\s*(\d+)/);
    if (teamIdMatch) team.teamId = parseInt(teamIdMatch[1]);
    
    // Extract teamName
    const teamNameMatch = teamText.match(/teamName:\s*['"]([^'"]+)['"]/);
    if (teamNameMatch) team.teamName = teamNameMatch[1];
    
    // Extract killNum
    const killNumMatch = teamText.match(/killNum:\s*(\d+)/);
    if (killNumMatch) team.killNum = parseInt(killNumMatch[1]);
    
    // Extract liveMemberNum
    const liveMemberNumMatch = teamText.match(/liveMemberNum:\s*(\d+)/);
    if (liveMemberNumMatch) team.liveMemberNum = parseInt(liveMemberNumMatch[1]);
    
    teams.push(team);
  }
  
  return teams;
}

private async readFullFileAndIngest(): Promise<void> {
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const fs = require("fs");
        fs.readFile(this.filePath, "utf8", (err: any, data: string) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      // Process multi-line PCOB events by reconstructing complete text blocks
      const lines = content.split("\n");
      let processed = 0;
      const previews: string[] = [];
      let currentEvent = "";
      let inEvent = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Look for timestamp + POST /totalmessage pattern to start an event
        if (trimmed.includes("POST /totalmessage")) {
          inEvent = true;
          currentEvent = "";
          continue;
        }
        
        if (inEvent) {
          currentEvent += (currentEvent ? "\n" : "") + trimmed;
          
          // Check if we have the key fields that indicate a complete event
          if (currentEvent.includes("GameID:") && 
              currentEvent.includes("TotalPlayerList:") && 
              currentEvent.includes("TeamInfoList:") &&
              currentEvent.includes("}")) {
            
            // Parse the PCOB format directly
            const parsed = this.parsePcobTotalMessage(currentEvent);
            if (parsed) {
              this.onEvent(parsed);
              processed++;
              if (previews.length < 3) {
                previews.push(`GameID:${parsed.GameID} Players:${parsed.TotalPlayerList?.length || 0} Teams:${parsed.TeamInfoList?.length || 0}`);
              }
            }
            
            inEvent = false;
            currentEvent = "";
          }
        }
      }
      
      console.log(`[PCOB watcher] readFullFileAndIngest: processed ${processed} events from ${lines.length} total lines`);
      if (previews.length > 0) {
        console.log("[PCOB watcher] sample events:", previews.join(" | "));
      }
    } catch (e) {
      this.onError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    try {
      this.lastSize = statSync(this.filePath).size;
    } catch {
      this.lastSize = 0;
    }
    void this.readFullFileAndIngest().then(() => {
      this.timer = setInterval(() => {
        this.readTail();
      }, this.pollIntervalMs);
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}

let globalWatcher: PcobLogWatcher | undefined;

export function startPcobLogWatcher(opts: PcobLogWatcherOptions): void {
  if (globalWatcher) {
    globalWatcher.stop();
  }
  globalWatcher = new PcobLogWatcher({
    ...opts,
    onEvent: (raw) => {
      try {
        // Force matchId to "default" for single-match mode
        const payload = raw as any;
        if (payload.GameID) {
          payload.matchId = "default";
        }
        console.log("[PCOB watcher] about to upsert:", payload);
        const result = upsertFromPcobRaw(payload);
        console.log("[PCOB watcher] upsert result:", result);
        if (opts.onEvent) opts.onEvent(raw);
      } catch (e) {
        console.error("[PCOB watcher] onEvent error:", e);
        if (opts.onError) opts.onError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    onError: opts.onError,
  });
  globalWatcher.start();
}

export function stopPcobLogWatcher(): void {
  if (globalWatcher) {
    globalWatcher.stop();
    globalWatcher = undefined;
  }
}
