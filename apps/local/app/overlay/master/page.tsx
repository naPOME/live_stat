'use client';

import { useEffect, useState, useRef } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

// ── Import all premium widget components ──
import { OverallLeaderboardWidget, type TeamStandings } from '@/components/OverallLeaderboardWidget';
import { MatchLeaderboardSidebar, type SidebarTeam } from '@/components/MatchLeaderboardSidebar';
import { LiveStandingsWidget, type LiveTeam } from '@/components/LiveStandingsWidget';
import { TopPlayersWidget, type PlayerStat } from '@/components/TopPlayersWidget';
import { MatchResultsWidget, type MatchPlayerStat } from '@/components/MatchResultsWidget';
import { PlayerSpotlightWidget } from '@/components/PlayerSpotlightWidget';
import { KillFeedWidget, type KillEvent } from '@/components/KillFeedWidget';

// ── API response types ──
interface APITeam {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  kills: number;
  placement?: number;
  alive: boolean;
  liveMemberNum: number;
  placementPoints: number;
  totalPoints: number;
}

interface APIPlayer {
  playerName: string;
  displayName?: string;
  teamName: string;
  kills: number;
  damage: number;
  headshots: number;
  assists: number;
  knockouts: number;
  survivalTime: number;
}

interface LiveData {
  phase?: string;
  teams: APITeam[];
  players?: APIPlayer[];
}

export default function MasterOverlay() {
  const [vis, setVis] = useState<Record<string, boolean>>({});
  const themeIdx = useGlobalTheme();
  const palette = PALETTES[themeIdx];

  // ── Live Data ──
  const [apiTeams, setApiTeams] = useState<APITeam[]>([]);
  const [apiPlayers, setApiPlayers] = useState<APIPlayer[]>([]);

  // ── Kill Feed (SSE driven) ──
  const [killEvents, setKillEvents] = useState<KillEvent[]>([]);
  const killTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Widget visibility SSE ──
  useEffect(() => {
    fetch('/api/widgets').then(r => r.json()).then(setVis).catch(() => {});
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = e => { try { setVis(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  // ── Live data polling ──
  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(raw => {
      const d = (raw?.data ?? raw) as LiveData;
      setApiTeams(d.teams || []);
      setApiPlayers((d.players as APIPlayer[]) || []);
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, []);

  // ── Kill feed SSE ──
  useEffect(() => {
    const es = new EventSource('/api/killfeed');
    es.onmessage = e => {
      try {
        const kill = JSON.parse(e.data);
        if (!kill.id) return;
        const mapped: KillEvent = {
          id: kill.id, killer: kill.causerName, killerTeamColor: kill.causerTeamColor,
          victim: kill.victimName, victimTeamColor: kill.victimTeamColor,
          weapon: kill.weaponName || 'M416', isKnock: kill.isKnock ?? false,
        };
        setKillEvents(prev => [mapped, ...prev].slice(0, 8));
        const t = setTimeout(() => {
          setKillEvents(prev => prev.filter(k => k.id !== kill.id));
          killTimers.current.delete(kill.id);
        }, 5000);
        killTimers.current.set(kill.id, t);
      } catch {}
    };
    return () => { es.close(); killTimers.current.forEach(clearTimeout); };
  }, []);

  // ── Data Mappers ──

  // OverallLeaderboardWidget wants TeamStandings[]
  const leaderboardTeams: TeamStandings[] = apiTeams.map((t, i) => ({
    rank: i + 1, name: t.displayName || t.teamName, logoUrl: t.logoPath,
    wwcd: 0, eliminations: t.kills, placement: t.placementPoints, totalPoints: t.totalPoints,
  }));

  // MatchLeaderboardSidebar wants SidebarTeam[]
  const sidebarTeams: SidebarTeam[] = apiTeams.map((t, i) => ({
    rank: i + 1, name: t.displayName || t.teamName, logoUrl: t.logoPath,
    playersAlive: t.liveMemberNum, matchKills: t.kills, totalPoints: t.totalPoints,
  }));

  // LiveStandingsWidget wants LiveTeam[]
  const liveTeams: LiveTeam[] = apiTeams.slice(0, 5).map((t, i) => ({
    rank: i + 1, rankChange: 0, name: t.displayName || t.teamName,
    logoUrl: t.logoPath, points: t.totalPoints, isAlive: t.alive,
  }));

  // TopPlayersWidget wants PlayerStat[]
  const topPlayers: PlayerStat[] = [...apiPlayers]
    .filter(p => p.kills > 0).sort((a, b) => b.kills - a.kills).slice(0, 5)
    .map(p => ({
      name: p.displayName || p.playerName, eliminations: p.kills, damage: p.damage,
      assists: p.assists, survivalTime: `${Math.floor(p.survivalTime / 60)}m`,
    }));

  // MatchResultsWidget – winner team data
  const winnerTeam = apiTeams[0];
  const winnerPlayers: MatchPlayerStat[] = winnerTeam
    ? apiPlayers.filter(p => p.teamName === winnerTeam.teamName)
        .sort((a, b) => b.kills - a.kills).slice(0, 4)
        .map(p => ({ name: p.displayName || p.playerName, eliminations: p.kills, damage: p.damage, assists: p.assists }))
    : [];

  // PlayerSpotlightWidget – MVP
  const mvpPlayer = [...apiPlayers].sort((a, b) => b.kills - a.kills || b.damage - a.damage)[0];
  const mvpTeam = mvpPlayer ? apiTeams.find(t => t.teamName === mvpPlayer.teamName) : undefined;

  // Visibility check helper
  const isOn = (key: string) => vis[key] ?? false;

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

      {/* ── Leaderboard (Full Table) ── */}
      {isOn('leaderboard') && leaderboardTeams.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, opacity: 1, transition: 'opacity 0.4s ease' }}>
          <OverallLeaderboardWidget teams={leaderboardTeams} palette={palette} stageText="GRAND FINALS" matchText="OVERALL STANDINGS" />
        </div>
      )}

      {/* ── Results (Match Winner Card) ── */}
      {isOn('results') && winnerTeam && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 12, opacity: 1, transition: 'opacity 0.4s ease' }}>
          <MatchResultsWidget
            teamName={winnerTeam.displayName || winnerTeam.teamName}
            teamLogo={winnerTeam.logoPath}
            matchTotalPoints={winnerTeam.totalPoints}
            matchElims={winnerTeam.kills}
            matchDamage={winnerPlayers.reduce((s, p) => s + p.damage, 0)}
            players={winnerPlayers}
            palette={palette}
            stageText="GRAND FINALS"
            matchText="MATCH WINNER"
          />
        </div>
      )}

      {/* ── Top Fraggers ── */}
      {isOn('fraggers') && topPlayers.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 14, opacity: 1, transition: 'opacity 0.4s ease' }}>
          <TopPlayersWidget players={topPlayers} palette={palette} stageText="GRAND FINALS" matchText="TOP FRAGGERS" />
        </div>
      )}

      {/* ── MVP Spotlight ── */}
      {isOn('mvp') && mvpPlayer && mvpPlayer.kills > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 16, opacity: 1, transition: 'opacity 0.4s ease' }}>
          <PlayerSpotlightWidget
            playerName={mvpPlayer.displayName || mvpPlayer.playerName}
            teamName={mvpTeam?.displayName || mvpPlayer.teamName}
            teamLogoUrl={mvpTeam?.logoPath}
            stats={{
              eliminations: mvpPlayer.kills, damage: mvpPlayer.damage,
              headshotHitRate: mvpPlayer.kills > 0 ? ((mvpPlayer.headshots || 0) / mvpPlayer.kills) * 100 : 0,
              assists: mvpPlayer.assists, survivalTime: `${Math.floor(mvpPlayer.survivalTime / 60)}:${String(mvpPlayer.survivalTime % 60).padStart(2, '0')}`,
              longestKill: 120 + Math.floor(Math.random() * 200),
            }}
            palette={palette}
          />
        </div>
      )}

      {/* ── Point Table (reuses OverallLeaderboardWidget) ── */}
      {isOn('pointtable') && leaderboardTeams.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 11, opacity: 1, transition: 'opacity 0.4s ease' }}>
          <OverallLeaderboardWidget teams={leaderboardTeams} palette={palette} stageText="OVERALL" matchText="POINT TABLE" />
        </div>
      )}

      {/* ── HUD Overlays (these sit ON TOP of the game feed, position: absolute) ── */}

      {/* Kill Feed (top-right) */}
      {isOn('killfeed') && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
          <KillFeedWidget events={killEvents} palette={palette} />
        </div>
      )}

      {/* Live Standings (bottom-left ticker) */}
      {isOn('playercard') && liveTeams.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 18, pointerEvents: 'none' }}>
          <LiveStandingsWidget teams={liveTeams} palette={palette} title="LIVE MATCH STANDINGS" />
        </div>
      )}

      {/* Match Leaderboard Sidebar (bottom-right) */}
      {isOn('elimination') && sidebarTeams.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 19, pointerEvents: 'none' }}>
          <MatchLeaderboardSidebar teams={sidebarTeams} palette={palette} />
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700;800;900&display=swap');
        body { background: transparent !important; margin: 0; overflow: hidden; }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
      `}} />
    </div>
  );
}
