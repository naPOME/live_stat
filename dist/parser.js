"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogParser = void 0;
exports.startParser = startParser;
exports.stopParser = stopParser;
const fs_1 = require("fs");
class LogParser {
    constructor(opts) {
        this.running = false;
        this.lastSize = 0;
        this.buffer = "";
        this.filePath = opts.filePath;
        this.onEvent = opts.onEvent ?? (() => { });
        this.onError = opts.onError ?? (() => { });
        this.pollIntervalMs = opts.pollIntervalMs ?? 500;
    }
    parseLogEntry(text) {
        try {
            if (!text.includes("POST /totalmessage"))
                return null;
            const result = {};
            const gameIdMatch = text.match(/GameID:\s*['"]?(\d+)['"]?/);
            if (gameIdMatch)
                result.GameID = gameIdMatch[1];
            const currentTimeMatch = text.match(/CurrentTime:\s*['"]?(\d+)['"]?/);
            if (currentTimeMatch)
                result.CurrentTime = currentTimeMatch[1];
            const teamListMatch = text.match(/TeamInfoList:\s*\[([\s\S]*?)\]/);
            if (teamListMatch) {
                result.TeamInfoList = this.parseTeamObjects(teamListMatch[1]);
            }
            if (result.GameID && (result.TeamInfoList?.length > 0)) {
                console.log(`[Parser] Parsed GameID: ${result.GameID}, Teams: ${result.TeamInfoList?.length || 0}`);
                return result;
            }
            return null;
        }
        catch (error) {
            console.error("[Parser] Error parsing log entry:", error);
            return null;
        }
    }
    parseTeamObjects(text) {
        const teams = [];
        const teamMatches = text.match(/\{[^{}]*\}/g);
        if (!teamMatches)
            return teams;
        for (const teamText of teamMatches) {
            const team = {};
            const teamIdMatch = teamText.match(/teamId:\s*(\d+)/);
            if (teamIdMatch)
                team.teamId = parseInt(teamIdMatch[1]);
            const teamNameMatch = teamText.match(/teamName:\s*['"]([^'"]+)['"]/);
            if (teamNameMatch)
                team.teamName = teamNameMatch[1];
            const killNumMatch = teamText.match(/killNum:\s*(\d+)/);
            if (killNumMatch)
                team.killNum = parseInt(killNumMatch[1]);
            const liveMemberNumMatch = teamText.match(/liveMemberNum:\s*(\d+)/);
            if (liveMemberNumMatch)
                team.liveMemberNum = parseInt(liveMemberNumMatch[1]);
            if (team.teamName && (team.killNum !== undefined || team.liveMemberNum !== undefined)) {
                teams.push(team);
            }
        }
        return teams;
    }
    readTail() {
        try {
            const stats = (0, fs_1.statSync)(this.filePath);
            if (stats.size < this.lastSize) {
                this.lastSize = 0;
                this.buffer = "";
            }
            if (stats.size === this.lastSize)
                return;
            const fd = require('fs').openSync(this.filePath, 'r');
            const buf = Buffer.allocUnsafe(stats.size - this.lastSize);
            require('fs').readSync(fd, buf, 0, buf.length, this.lastSize);
            require('fs').closeSync(fd);
            const newContent = buf.toString('utf8');
            this.buffer += newContent;
            this.lastSize = stats.size;
            const lines = this.buffer.split("\n");
            this.buffer = lines.pop() || "";
            let currentEvent = "";
            let inEvent = false;
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                if (trimmed.includes("POST /totalmessage")) {
                    inEvent = true;
                    currentEvent = "";
                }
                if (inEvent) {
                    currentEvent += (currentEvent ? "\n" : "") + trimmed;
                    if (currentEvent.includes("}") &&
                        currentEvent.includes("GameID:") &&
                        currentEvent.includes("TeamInfoList:")) {
                        const parsed = this.parseLogEntry(currentEvent);
                        if (parsed && this.onEvent) {
                            this.onEvent(parsed);
                        }
                        inEvent = false;
                        currentEvent = "";
                    }
                }
            }
        }
        catch (error) {
            this.onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
    async readFullFile() {
        try {
            const content = (0, fs_1.readFileSync)(this.filePath, "utf8");
            const lines = content.split("\n");
            let currentEvent = "";
            let inEvent = false;
            let processed = 0;
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                if (trimmed.includes("POST /totalmessage")) {
                    inEvent = true;
                    currentEvent = "";
                }
                if (inEvent) {
                    currentEvent += (currentEvent ? "\n" : "") + trimmed;
                    if (currentEvent.includes("}") &&
                        currentEvent.includes("GameID:") &&
                        currentEvent.includes("TeamInfoList:")) {
                        const parsed = this.parseLogEntry(currentEvent);
                        if (parsed && this.onEvent) {
                            this.onEvent(parsed);
                            processed++;
                        }
                        inEvent = false;
                        currentEvent = "";
                    }
                }
            }
            console.log(`[Parser] Processed ${processed} events from full file read`);
        }
        catch (error) {
            this.onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        try {
            this.lastSize = (0, fs_1.statSync)(this.filePath).size;
        }
        catch {
            this.lastSize = 0;
        }
        this.readFullFile().then(() => {
            this.timer = setInterval(() => {
                this.readTail();
            }, this.pollIntervalMs);
        });
    }
    stop() {
        if (!this.running)
            return;
        this.running = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
}
exports.LogParser = LogParser;
let globalParser;
function startParser(opts) {
    if (globalParser) {
        globalParser.stop();
    }
    globalParser = new LogParser({
        ...opts,
        onEvent: (data) => {
            try {
                if (opts.onEvent) {
                    opts.onEvent(data);
                }
            }
            catch (error) {
                console.error("[Parser] Error processing event:", error);
                if (opts.onError) {
                    opts.onError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        },
        onError: opts.onError,
    });
    globalParser.start();
}
function stopParser() {
    if (globalParser) {
        globalParser.stop();
        globalParser = undefined;
    }
}
