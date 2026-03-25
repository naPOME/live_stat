import { closeSync, openSync, readFileSync, readSync, statSync } from 'fs';

export type ParsedLogEvent =
  | { type: 'totalmessage'; payload: ParsedTotalMessage }
  | { type: 'killinfo'; payload: ParsedKillInfo }
  | { type: 'circleinfo'; payload: ParsedCircleInfo }
  | { type: 'observing'; payload: { uid: string } }
  | { type: 'phase'; payload: { phase: 'InGame' | 'Finished' } };

interface ParsedTotalMessage {
  GameID: string;
  GameStartTime: string;
  FightingStartTime: string;
  FinishedStartTime: string;
  TeamInfoList: Array<{
    teamId: number;
    teamName: string;
    killNum: number;
    liveMemberNum: number;
  }>;
  TotalPlayerList: Array<{
    uId: number;
    playerName: string;
    playerOpenId: string;
    teamId: number;
    teamName: string;
    health: number;
    healthMax: number;
    liveState: number;
    killNum: number;
    killNumBeforeDie: number;
    damage: number;
    inDamage: number;
    heal: number;
    headShotNum: number;
    assists: number;
    knockouts: number;
    rescueTimes: number;
    survivalTime: number;
    marchDistance: number;
    driveDistance: number;
    rank: number;
    bHasDied: boolean;
  }>;
}

interface ParsedKillInfo {
  CauserName: string;
  VictimName: string;
  CauserUID: string;
  VictimUID: string;
  ItemID?: string;
  CurGameTime: string;
  Distance: number;
}

interface ParsedCircleInfo {
  GameTime: string;
  CircleStatus: string;
  CircleIndex: string;
  Counter: string;
  MaxTime: string;
}

export interface ParserOptions {
  filePath: string;
  onEvent?: (event: ParsedLogEvent) => void;
  onError?: (error: Error) => void;
  pollIntervalMs?: number;
}

export class LogParser {
  private filePath: string;
  private pollIntervalMs: number;
  private onEvent: (event: ParsedLogEvent) => void;
  private onError: (error: Error) => void;
  private running = false;
  private timer: NodeJS.Timeout | undefined;
  private lastSize = 0;
  private buffer = '';

  constructor(opts: ParserOptions) {
    this.filePath = opts.filePath;
    this.onEvent = opts.onEvent ?? (() => {});
    this.onError = opts.onError ?? (() => {});
    this.pollIntervalMs = opts.pollIntervalMs ?? 500;
  }

  private parseNumber(text: string, key: string): number {
    const m = text.match(new RegExp(`${key}:\\s*([-]?\\d+)`));
    return m ? Number(m[1]) || 0 : 0;
  }

  private parseString(text: string, key: string): string {
    const m = text.match(new RegExp(`${key}:\\s*['"]?([^,'"}\\]]+)`));
    return m ? m[1].trim() : '';
  }

  private parseBool(text: string, key: string): boolean {
    const m = text.match(new RegExp(`${key}:\\s*(true|false)`));
    return m ? m[1] === 'true' : false;
  }

  private parseTeamObjects(text: string): ParsedTotalMessage['TeamInfoList'] {
    const teams: ParsedTotalMessage['TeamInfoList'] = [];
    const matches = text.match(/\{[^{}]*\}/g);
    if (!matches) return teams;

    for (const entry of matches) {
      const teamName = this.parseString(entry, 'teamName');
      const teamId = this.parseNumber(entry, 'teamId');
      if (!teamName || !teamId) continue;
      teams.push({
        teamId,
        teamName,
        killNum: this.parseNumber(entry, 'killNum'),
        liveMemberNum: this.parseNumber(entry, 'liveMemberNum'),
      });
    }
    return teams;
  }

  private parsePlayerObjects(text: string): ParsedTotalMessage['TotalPlayerList'] {
    const players: ParsedTotalMessage['TotalPlayerList'] = [];
    const matches = text.match(/\{[^{}]*\}/g);
    if (!matches) return players;

    for (const entry of matches) {
      const teamId = this.parseNumber(entry, 'teamId');
      const playerName = this.parseString(entry, 'playerName');
      if (!teamId || !playerName) continue;

      players.push({
        uId: this.parseNumber(entry, 'uId'),
        playerName,
        playerOpenId: this.parseString(entry, 'playerOpenId'),
        teamId,
        teamName: this.parseString(entry, 'teamName'),
        health: this.parseNumber(entry, 'health'),
        healthMax: this.parseNumber(entry, 'healthMax'),
        liveState: this.parseNumber(entry, 'liveState'),
        killNum: this.parseNumber(entry, 'killNum'),
        killNumBeforeDie: this.parseNumber(entry, 'killNumBeforeDie'),
        damage: this.parseNumber(entry, 'damage'),
        inDamage: this.parseNumber(entry, 'inDamage'),
        heal: this.parseNumber(entry, 'heal'),
        headShotNum: this.parseNumber(entry, 'headShotNum'),
        assists: this.parseNumber(entry, 'assists'),
        knockouts: this.parseNumber(entry, 'knockouts'),
        rescueTimes: this.parseNumber(entry, 'rescueTimes'),
        survivalTime: this.parseNumber(entry, 'survivalTime'),
        marchDistance: this.parseNumber(entry, 'marchDistance'),
        driveDistance: this.parseNumber(entry, 'driveDistance'),
        rank: this.parseNumber(entry, 'rank'),
        bHasDied: this.parseBool(entry, 'bHasDied'),
      });
    }

    return players;
  }

  private parseTotalMessage(text: string): ParsedLogEvent | null {
    if (!text.includes('POST /totalmessage')) return null;
    if (!text.includes('TeamInfoList:')) return null;
    if (!text.includes('GameID:')) return null;

    const teamsChunk = text.match(/TeamInfoList:\s*\[([\s\S]*?)\](?=,|\s*$)/);
    const playersChunk = text.match(/TotalPlayerList:\s*\[([\s\S]*?)\]\s*,\s*TeamInfoList:/);

    const payload: ParsedTotalMessage = {
      GameID: this.parseString(text, 'GameID'),
      GameStartTime: this.parseString(text, 'GameStartTime') || '0',
      FightingStartTime: this.parseString(text, 'FightingStartTime') || '0',
      FinishedStartTime: this.parseString(text, 'FinishedStartTime') || '0',
      TeamInfoList: teamsChunk ? this.parseTeamObjects(teamsChunk[1]) : [],
      TotalPlayerList: playersChunk ? this.parsePlayerObjects(playersChunk[1]) : [],
    };

    if (!payload.GameID || payload.TeamInfoList.length === 0) return null;
    return { type: 'totalmessage', payload };
  }

  private parseKillInfo(text: string): ParsedLogEvent | null {
    if (!text.includes('POST /setkillinfo')) return null;
    const payload: ParsedKillInfo = {
      CauserName: this.parseString(text, 'CauserName'),
      VictimName: this.parseString(text, 'VictimName'),
      CauserUID: this.parseString(text, 'CauserUID'),
      VictimUID: this.parseString(text, 'VictimUID'),
      ItemID: this.parseString(text, 'ItemID') || undefined,
      CurGameTime: this.parseString(text, 'CurGameTime') || '0',
      Distance: this.parseNumber(text, 'Distance'),
    };
    if (!payload.CauserUID || !payload.VictimUID) return null;
    return { type: 'killinfo', payload };
  }

  private parseCircleInfo(text: string): ParsedLogEvent | null {
    if (!text.includes('POST /setcircleinfo')) return null;
    const payload: ParsedCircleInfo = {
      GameTime: this.parseString(text, 'GameTime') || '0',
      CircleStatus: this.parseString(text, 'CircleStatus') || '0',
      CircleIndex: this.parseString(text, 'CircleIndex') || '0',
      Counter: this.parseString(text, 'Counter') || '0',
      MaxTime: this.parseString(text, 'MaxTime') || '0',
    };
    return { type: 'circleinfo', payload };
  }

  private parseObserving(text: string): ParsedLogEvent | null {
    if (!text.includes('POST /setobservingplayer')) return null;
    const uid = this.parseString(text, '0') || this.parseString(text, 'uid');
    if (!uid) return null;
    return { type: 'observing', payload: { uid } };
  }

  private parsePhase(text: string): ParsedLogEvent | null {
    if (!text.includes('POST /setisingame')) return null;
    if (text.includes('InGame')) return { type: 'phase', payload: { phase: 'InGame' } };
    if (text.includes('Finished')) return { type: 'phase', payload: { phase: 'Finished' } };
    return null;
  }

  private parseLine(text: string): ParsedLogEvent | null {
    return (
      this.parseTotalMessage(text) ??
      this.parseKillInfo(text) ??
      this.parseCircleInfo(text) ??
      this.parseObserving(text) ??
      this.parsePhase(text)
    );
  }

  private readTail(): void {
    try {
      const stats = statSync(this.filePath);
      if (stats.size < this.lastSize) {
        this.lastSize = 0;
        this.buffer = '';
      }
      if (stats.size === this.lastSize) return;

      const fd = openSync(this.filePath, 'r');
      const chunkSize = stats.size - this.lastSize;
      const buf = Buffer.allocUnsafe(chunkSize);
      readSync(fd, buf, 0, chunkSize, this.lastSize);
      closeSync(fd);

      this.buffer += buf.toString('utf8');
      this.lastSize = stats.size;

      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';

      for (const line of lines) {
        const event = this.parseLine(line.trim());
        if (event) this.onEvent(event);
      }
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private readFullFile(): void {
    try {
      const content = readFileSync(this.filePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const event = this.parseLine(line.trim());
        if (event) this.onEvent(event);
      }
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)));
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

    this.readFullFile();
    this.timer = setInterval(() => this.readTail(), this.pollIntervalMs);
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

let globalParser: LogParser | undefined;

export function startParser(opts: ParserOptions): void {
  if (globalParser) globalParser.stop();
  globalParser = new LogParser(opts);
  globalParser.start();
}

export function stopParser(): void {
  if (!globalParser) return;
  globalParser.stop();
  globalParser = undefined;
}
