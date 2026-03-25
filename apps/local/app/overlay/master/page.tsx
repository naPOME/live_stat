'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
import { EliminationAlertWidget, type EliminationData } from '@/components/EliminationAlertWidget';
import { TeamListWidget, type TeamEntry } from '@/components/TeamListWidget';
import { MatchInfoWidget, type MatchInfoData } from '@/components/MatchInfoWidget';
import { ScheduleWidget, type ScheduleMatch } from '@/components/ScheduleWidget';
import { BrandOverlay } from '@/components/BrandOverlay';

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

// ── Mock schedule data ──
const MOCK_SCHEDULE: ScheduleMatch[] = [
  { matchNumber: 1, mapName: 'Erangel', status: 'completed', startTime: '14:00', winnerTeam: 'Alpha 7' },
  { matchNumber: 2, mapName: 'Miramar', status: 'completed', startTime: '14:45', winnerTeam: 'Nova Esports' },
  { matchNumber: 3, mapName: 'Sanhok', status: 'live', startTime: '15:30' },
  { matchNumber: 4, mapName: 'Vikendi', status: 'upcoming', startTime: '16:15' },
  { matchNumber: 5, mapName: 'Erangel', status: 'upcoming', startTime: '17:00' },
  { matchNumber: 6, mapName: 'Miramar', status: 'upcoming', startTime: '17:45' },
];

export default function MasterOverlay() {
  const [vis, setVis] = useState<Record<string, boolean>>({});
  const themeIdx = useGlobalTheme();
  const palette = PALETTES[themeIdx];

  // ── Live Data ──
  const [apiTeams, setApiTeams] = useState<APITeam[]>([]);
  const [apiPlayers, setApiPlayers] = useState<APIPlayer[]>([]);
  const prevTeamAlive = useRef<Record<string, boolean>>({});

  // ── Kill Feed ──
  const [killEvents, setKillEvents] = useState<KillEvent[]>([]);
  const killTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Elimination Alert Queue ──
  const [elimAlert, setElimAlert] = useState<EliminationData | null>(null);
  const elimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Widget visibility SSE ──
  useEffect(() => {
    fetch('/api/widgets').then(r => r.json()).then(setVis).catch(() => {});
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = e => { try { setVis(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  // Show elimination alert
  const showElimAlert = useCallback((data: EliminationData) => {
    if (elimTimer.current) clearTimeout(elimTimer.current);
    setElimAlert(data);
    elimTimer.current = setTimeout(() => setElimAlert(null), 5500);
  }, []);

  // ── Live data polling ──
  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(raw => {
      const d = (raw?.data ?? raw) as LiveData;
      const teams = d.teams || [];
      setApiTeams(teams);
      setApiPlayers((d.players as APIPlayer[]) || []);

      // Detect newly eliminated teams
      for (const t of teams) {
        const name = t.displayName || t.teamName;
        const wasAlive = prevTeamAlive.current[name];
        const isNowDead = !t.alive && t.liveMemberNum === 0;
        if (wasAlive === true && isNowDead) {
          const rank = teams.filter(x => !x.alive && x.liveMemberNum === 0).length;
          showElimAlert({
            teamName: name,
            teamShort: t.shortName,
            teamLogoUrl: t.logoPath,
            teamColor: t.brandColor,
            placement: 16 - rank + 1,
            totalTeams: teams.length,
            matchKills: t.kills,
            matchPoints: t.totalPoints,
          });
        }
        prevTeamAlive.current[name] = t.alive && t.liveMemberNum > 0;
      }
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [showElimAlert]);

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
  const leaderboardTeams: TeamStandings[] = apiTeams.map((t, i) => ({
    rank: i + 1, name: t.displayName || t.teamName, logoUrl: t.logoPath,
    wwcd: 0, eliminations: t.kills, placement: t.placementPoints, totalPoints: t.totalPoints,
  }));

  const sidebarTeams: SidebarTeam[] = apiTeams.map((t, i) => ({
    rank: i + 1, name: t.displayName || t.teamName, logoUrl: t.logoPath,
    playersAlive: t.liveMemberNum, matchKills: t.kills, totalPoints: t.totalPoints,
  }));

  const liveTeams: LiveTeam[] = apiTeams.slice(0, 5).map((t, i) => ({
    rank: i + 1, rankChange: 0, name: t.displayName || t.teamName,
    logoUrl: t.logoPath, points: t.totalPoints, isAlive: t.alive,
  }));

  const topPlayers: PlayerStat[] = [...apiPlayers]
    .filter(p => p.kills > 0).sort((a, b) => b.kills - a.kills).slice(0, 5)
    .map(p => ({
      name: p.displayName || p.playerName, eliminations: p.kills, damage: p.damage,
      assists: p.assists, survivalTime: `${Math.floor(p.survivalTime / 60)}m`,
    }));

  const winnerTeam = apiTeams[0];
  const winnerPlayers: MatchPlayerStat[] = winnerTeam
    ? apiPlayers.filter(p => p.teamName === winnerTeam.teamName)
        .sort((a, b) => b.kills - a.kills).slice(0, 4)
        .map(p => ({ name: p.displayName || p.playerName, eliminations: p.kills, damage: p.damage, assists: p.assists }))
    : [];

  const mvpPlayer = [...apiPlayers].sort((a, b) => b.kills - a.kills || b.damage - a.damage)[0];
  const mvpTeam = mvpPlayer ? apiTeams.find(t => t.teamName === mvpPlayer.teamName) : undefined;

  const teamListEntries: TeamEntry[] = apiTeams.map(t => ({
    name: t.displayName || t.teamName,
    shortName: t.shortName, logoUrl: t.logoPath, brandColor: t.brandColor,
    players: apiPlayers.filter(p => p.teamName === t.teamName).slice(0, 4)
      .map(p => ({ name: p.displayName || p.playerName })),
  }));

  const matchInfoData: MatchInfoData = {
    tournamentName: 'PUBG MOBILE PRO LEAGUE',
    stageName: 'GRAND FINALS',
    matchNumber: 3, totalMatches: 6,
    mapName: 'ERANGEL', perspective: 'TPP',
    teamsAlive: apiTeams.filter(t => t.alive).length,
    totalTeams: apiTeams.length,
    playersAlive: apiTeams.reduce((s, t) => s + t.liveMemberNum, 0),
    totalPlayers: apiTeams.length * 4,
    phase: 'ingame', currentZone: 4,
  };

  const isOn = (key: string) => vis[key] ?? false;

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

      {/* ── Full-screen overlays (wrapped with PUBG MOBILE brand logos) ── */}

      {isOn('results') && winnerTeam && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 12 }}>
          <BrandOverlay>
            <MatchResultsWidget
              teamName={winnerTeam.displayName || winnerTeam.teamName} teamLogo={winnerTeam.logoPath}
              matchTotalPoints={winnerTeam.totalPoints} matchElims={winnerTeam.kills}
              matchDamage={winnerPlayers.reduce((s, p) => s + p.damage, 0)}
              players={winnerPlayers} palette={palette} stageText="GRAND FINALS" matchText="MATCH WINNER"
            />
          </BrandOverlay>
        </div>
      )}

      {isOn('fraggers') && topPlayers.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 14 }}>
          <BrandOverlay>
            <TopPlayersWidget players={topPlayers} palette={palette} stageText="GRAND FINALS" matchText="TOP FRAGGERS" />
          </BrandOverlay>
        </div>
      )}

      {isOn('mvp') && mvpPlayer && mvpPlayer.kills > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 16 }}>
          <BrandOverlay>
            <PlayerSpotlightWidget
              playerName={mvpPlayer.displayName || mvpPlayer.playerName}
              teamName={mvpTeam?.displayName || mvpPlayer.teamName}
              teamLogoUrl={mvpTeam?.logoPath}
              stats={{
                eliminations: mvpPlayer.kills, damage: mvpPlayer.damage,
                headshotHitRate: mvpPlayer.kills > 0 ? ((mvpPlayer.headshots || 0) / mvpPlayer.kills) * 100 : 0,
                assists: mvpPlayer.assists,
                survivalTime: `${Math.floor(mvpPlayer.survivalTime / 60)}:${String(mvpPlayer.survivalTime % 60).padStart(2, '0')}`,
                longestKill: 120 + Math.floor(Math.random() * 200),
              }}
              palette={palette}
            />
          </BrandOverlay>
        </div>
      )}

      {isOn('pointtable') && leaderboardTeams.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 11 }}>
          <BrandOverlay>
            <OverallLeaderboardWidget teams={leaderboardTeams} palette={palette} stageText="OVERALL" matchText="POINT TABLE" />
          </BrandOverlay>
        </div>
      )}

      {isOn('teamlist') && teamListEntries.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 13 }}>
          <BrandOverlay>
            <TeamListWidget teams={teamListEntries} palette={palette} stageText="PARTICIPATING TEAMS" />
          </BrandOverlay>
        </div>
      )}

      {isOn('matchinfo') && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 15 }}>
          <BrandOverlay>
            <MatchInfoWidget data={matchInfoData} palette={palette} />
          </BrandOverlay>
        </div>
      )}

      {isOn('schedule') && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 13 }}>
          <BrandOverlay>
            <ScheduleWidget matches={MOCK_SCHEDULE} palette={palette} tournamentName="PUBG MOBILE PRO LEAGUE" dayLabel="DAY 1" />
          </BrandOverlay>
        </div>
      )}

      {/* ── HUD Overlays (sit on top of the game feed) ── */}

      {isOn('killfeed') && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
          <KillFeedWidget events={killEvents} palette={palette} />
        </div>
      )}

      {isOn('playercard') && liveTeams.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 18, pointerEvents: 'none' }}>
          <LiveStandingsWidget teams={liveTeams} palette={palette} title="LIVE MATCH STANDINGS" />
        </div>
      )}

      {/* Match Leaderboard Sidebar (bottom-right live ranking) */}
      {isOn('leaderboard') && sidebarTeams.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 19, pointerEvents: 'none' }}>
          <MatchLeaderboardSidebar teams={sidebarTeams} palette={palette} />
        </div>
      )}

      {/* ── Elimination Alert Popup (enabled via Elimination Alert button) ── */}
      {isOn('elimination') && elimAlert && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
          <EliminationAlertWidget data={elimAlert} palette={palette} />
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
        body { background: transparent !important; margin: 0; overflow: hidden; }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
      `}} />
    </div>
  );
}
