import { NextResponse } from 'next/server';
import { getState, getPhase } from '@/lib/gameStore';
import { getRoster } from '@/lib/rosterStore';
import { calcTeamPoints } from '@/lib/scorer';
import { ok, err } from '@shared/api';
import type { LeaderboardResponse, LeaderboardTeam } from '@shared/types';

export const runtime = 'nodejs';

// Initialise rosterStore (file watch) on first request
import '@/lib/rosterStore';

/**
 * GET /api/live — Leaderboard endpoint (legacy, kept for overlay compat).
 * For dashboards, prefer /api/state which includes everything in one call.
 */
export async function GET() {
  try {
    const gs = getState();
    const phase = getPhase();
    const teams = Array.from(gs.teams.values());

    let leaderboard: LeaderboardTeam[] = teams.map(t => {
      const kills = t.killNum;
      const alive = t.liveMemberNum > 0;
      const placement = !alive && t.rank > 0 ? t.rank : undefined;
      const placementPoints = calcTeamPoints(placement, 0);
      const totalPoints = calcTeamPoints(placement, kills);

      return {
        teamName: t.inGameName,
        displayName: t.displayName,
        shortName: t.shortName,
        brandColor: t.brandColor,
        logoPath: t.logoPath,
        logoUrl: t.logoUrl,
        kills,
        placement,
        alive,
        liveMemberNum: t.liveMemberNum,
        placementPoints,
        totalPoints,
        updatedAt: Date.now(),
      };
    });

    // Fallback to roster teams when no live data yet
    if (leaderboard.length === 0) {
      const roster = getRoster();
      if (roster?.teams?.length) {
        leaderboard = roster.teams
          .slice()
          .sort((a, b) => a.slot_number - b.slot_number)
          .map((t) => ({
            teamName: t.name,
            displayName: t.name,
            shortName: t.short_name,
            brandColor: t.brand_color,
            logoPath: t.logo_path,
            logoUrl: t.logo_url,
            kills: 0,
            placement: undefined,
            alive: true,
            liveMemberNum: t.players?.length ?? 4,
            placementPoints: 0,
            totalPoints: 0,
            updatedAt: Date.now(),
          }));
      }
    }

    // ── MOCK DATA FALLBACK ──────────────────────────────────────────────
    // When neither game nor roster data is available, serve realistic mock data
    // so the master overlay and all widgets can render for demo/testing.
    if (leaderboard.length === 0) {
      const mockNames = [
        { name: 'Alpha 7',      short: 'A7',   color: '#ef4444' },
        { name: 'Stalwart ES',  short: 'STW',  color: '#f59e0b' },
        { name: 'Nova Esports', short: 'NOV',  color: '#10b981' },
        { name: 'Vampire',      short: 'VMP',  color: '#8b5cf6' },
        { name: "D'Xavier",     short: 'DXV',  color: '#3b82f6' },
        { name: 'Geekay',       short: 'GKY',  color: '#ec4899' },
        { name: 'IHC Esports',  short: 'IHC',  color: '#06b6d4' },
        { name: 'INFLUENCE',    short: 'INF',  color: '#f97316' },
        { name: 'Fire Flux',    short: 'FFX',  color: '#eab308' },
        { name: 'DRS Gaming',   short: 'DRS',  color: '#14b8a6' },
        { name: 'Bigetron RA',  short: 'BTR',  color: '#a855f7' },
        { name: 'Ruh ES',       short: 'RUH',  color: '#6366f1' },
        { name: '4Merical',     short: '4MR',  color: '#d946ef' },
        { name: 'Nigma Galaxy', short: 'NGX',  color: '#84cc16' },
        { name: 'Titan Gaming', short: 'TTN',  color: '#0ea5e9' },
        { name: 'Persija EVOS', short: 'EVO',  color: '#e11d48' },
      ];
      leaderboard = mockNames.map((m, i) => {
        const alive = i < 8;
        const kills = Math.max(0, 12 - i + (i % 3));
        const liveMemberNum = alive ? (4 - (i % 3)) : 0;
        const placement = alive ? undefined : 16 - i;
        const placementPoints = placement ? Math.max(0, 16 - placement) : 0;
        const totalPoints = placementPoints + kills;
        return {
          teamName: m.name,
          displayName: m.name,
          shortName: m.short,
          brandColor: m.color,
          logoPath: undefined,
          kills,
          placement,
          alive,
          liveMemberNum,
          placementPoints,
          totalPoints,
          updatedAt: Date.now(),
        } as LeaderboardTeam;
      });
    }

    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.kills !== a.kills) return b.kills - a.kills;
      return (a.placement ?? 99) - (b.placement ?? 99);
    });

    const players = Array.from(gs.players.values());

    // ── MOCK PLAYER FALLBACK ────────────────────────────────────────────
    // When no real players exist, generate mock player data from the leaderboard
    // so fraggers, mvp, and playercard overlays work in demo mode.
    let playerList = players.map(p => ({
      playerName: p.playerName,
      displayName: p.displayName,
      teamName: p.teamName,
      teamSlot: p.teamSlot,
      kills: p.killNum,
      damage: p.damage,
      damageTaken: p.inDamage ?? 0,
      heal: p.heal ?? 0,
      headshots: p.headShotNum ?? 0,
      assists: p.assists ?? 0,
      knockouts: p.knockouts ?? 0,
      rescues: p.rescueTimes ?? 0,
      survivalTime: p.survivalTime ?? 0,
      survived: !p.bHasDied,
    }));

    if (playerList.length === 0 && leaderboard.length > 0) {
      const mockPlayerNames = [
        'ZywOo', 'Paraboy', 'Order', 'Jimmy', 'Luxxy',
        'Clutchgod', 'Mavi', 'Scout', 'Jyanma', 'Swagger',
        'TopPin', 'Ace2K', 'ReaperX', 'Neon', 'BlazeFire', 'Ryzen',
      ];
      playerList = leaderboard.flatMap((team, ti) => {
        const count = team.liveMemberNum > 0 ? team.liveMemberNum : 4;
        return Array.from({ length: count }, (_, pi) => {
          const pName = mockPlayerNames[(ti * 4 + pi) % mockPlayerNames.length] + (ti > 3 ? `_${ti}` : '');
          const kills = pi === 0 ? team.kills : Math.floor(Math.random() * 3);
          return {
            playerName: pName,
            displayName: pName,
            teamName: team.teamName,
            teamSlot: ti + 1,
            kills,
            damage: kills * 220 + Math.floor(Math.random() * 300),
            damageTaken: Math.floor(Math.random() * 400),
            heal: Math.floor(Math.random() * 200),
            headshots: Math.floor(kills * 0.4),
            assists: Math.floor(Math.random() * 3),
            knockouts: kills + Math.floor(Math.random() * 2),
            rescues: Math.floor(Math.random() * 2),
            survivalTime: 600 + Math.floor(Math.random() * 900),
            survived: team.alive,
          };
        });
      });
    }

    let bestPlayer = players[0];
    for (const p of players) {
      if ((p.killNum ?? 0) > (bestPlayer?.killNum ?? 0)) bestPlayer = p;
    }
    let spotlight =
      bestPlayer?.killNum > 0
        ? {
            playerName: bestPlayer.playerName,
            displayName: bestPlayer.displayName,
            teamName: bestPlayer.teamName,
            kills: bestPlayer.killNum,
          }
        : undefined;

    // Mock spotlight fallback
    if (!spotlight && playerList.length > 0) {
      const best = [...playerList].sort((a, b) => b.kills - a.kills)[0];
      if (best && best.kills > 0) {
        spotlight = {
          playerName: best.playerName,
          displayName: best.displayName || best.playerName,
          teamName: best.teamName,
          kills: best.kills,
        };
      }
    }

    const data: LeaderboardResponse = {
      matchId: gs.gameId || 'demo-match',
      serverTime: Date.now(),
      phase: phase || 'ingame',
      spotlight,
      teams: leaderboard,
      players: playerList,
    };

    return NextResponse.json(ok(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[Live API]', e);
    return NextResponse.json(err(message), { status: 500 });
  }
}
