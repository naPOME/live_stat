'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { useLiveState } from '@/hooks/useLiveState';

// Import all premium widget components
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

// API response types
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

// Mock schedule data
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
  const [themeIdx, setThemeIdx] = useState(0);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [lbPage, setLbPage] = useState(1);
  const palette = PALETTES[themeIdx];
  const live = useLiveState();

  // Live Data
  const apiTeams = live.teams as APITeam[];
  const apiPlayers = live.players as APIPlayer[];
  const prevTeamAlive = useRef<Record<string, boolean>>({});

  // Kill Feed
  const [killEvents, setKillEvents] = useState<KillEvent[]>([]);
  const killTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Elimination Alert Queue
  const [elimAlert, setElimAlert] = useState<EliminationData | null>(null);
  const elimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single SSE for widgets + theme + wallpaper + leaderboard page
  useEffect(() => {
    const es = new EventSource('/api/stream?filter=widgets,theme,wallpaper,lbpage');
    es.addEventListener('widgets', (e: MessageEvent) => {
      try { setVis(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('theme', (e: MessageEvent) => {
      try { const d = JSON.parse(e.data); if (typeof d.activeThemeIdx === 'number') setThemeIdx(d.activeThemeIdx); } catch {}
    });
    es.addEventListener('wallpaper', (e: MessageEvent) => {
      try { const d = JSON.parse(e.data); setWallpaperUrl(d.active ?? null); } catch {}
    });
    es.addEventListener('lbpage', (e: MessageEvent) => {
      try { const d = JSON.parse(e.data); if (typeof d.page === 'number') setLbPage(d.page); } catch {}
    });
    return () => es.close();
  }, []);

  // Show elimination alert
  const showElimAlert = useCallback((data: EliminationData) => {
    if (elimTimer.current) clearTimeout(elimTimer.current);
    setElimAlert(data);
    elimTimer.current = setTimeout(() => setElimAlert(null), 5500);
  }, []);

  // Detect team eliminations
  useEffect(() => {
    for (const t of apiTeams) {
      const name = t.displayName || t.teamName;
      const wasAlive = prevTeamAlive.current[name];
      const isNowDead = !t.alive && t.liveMemberNum === 0;
      if (wasAlive === true && isNowDead) {
        const rank = apiTeams.filter((x) => !x.alive && x.liveMemberNum === 0).length;
        setTimeout(() => {
          showElimAlert({
            teamName: name,
            teamShort: t.shortName,
            teamLogoUrl: t.logoPath,
            teamColor: t.brandColor,
            placement: 16 - rank + 1,
            totalTeams: apiTeams.length,
            matchKills: t.kills,
            matchPoints: t.totalPoints,
          });
        }, 0);
      }
      prevTeamAlive.current[name] = t.alive && t.liveMemberNum > 0;
    }
  }, [apiTeams, showElimAlert]);

  // Kill feed SSE
  useEffect(() => {
    const es = new EventSource('/api/killfeed');
    const timers = killTimers.current;
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
        timers.set(kill.id, t);
      } catch {}
    };
    return () => { es.close(); timers.forEach(clearTimeout); };
  }, []);

  // Data Mappers
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

  // Shorthand — wallpaper is used as background for all full-screen stat widgets
  const wp = wallpaperUrl;

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

      {/* Full-screen overlays (wrapped with PUBG MOBILE brand logos) */}

      {isOn('results') && winnerTeam && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 12 }}>
          <BrandOverlay>
            <MatchResultsWidget
              teamName={winnerTeam.displayName || winnerTeam.teamName} teamLogo={winnerTeam.logoPath}
              matchTotalPoints={winnerTeam.totalPoints} matchElims={winnerTeam.kills}
              matchDamage={winnerPlayers.reduce((s, p) => s + p.damage, 0)}
              players={winnerPlayers} palette={palette} stageText="GRAND FINALS" matchText="MATCH WINNER"
              bannerImageUrl={wp ?? undefined}
            />
          </BrandOverlay>
        </div>
      )}

      {isOn('fraggers') && topPlayers.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 14 }}>
          <BrandOverlay>
            <TopPlayersWidget
              players={topPlayers} palette={palette} stageText="GRAND FINALS" matchText="TOP FRAGGERS"
              backgroundImageUrl={wp ?? undefined}
            />
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
                longestKill: 120 + ((mvpPlayer.kills * 37 + (mvpPlayer.damage || 0)) % 200),
              }}
              palette={palette}
              bannerImageUrl={wp ?? undefined}
            />
          </BrandOverlay>
        </div>
      )}

      {isOn('pointtable') && leaderboardTeams.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 11 }}>
          <BrandOverlay>
            <OverallLeaderboardWidget
              teams={leaderboardTeams} palette={palette}
              stageText="OVERALL" matchText="POINT TABLE"
              headerImageUrl={wp ?? undefined}
              page={lbPage}
            />
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

      {isOn('wwcd') && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 12 }}>
          <BrandOverlay>
            <WwcdInline
              teams={apiTeams} players={apiPlayers}
              palette={palette} wallpaperUrl={wp}
            />
          </BrandOverlay>
        </div>
      )}

      {/* HUD Overlays (sit on top of the game feed) */}

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

      {isOn('leaderboard') && sidebarTeams.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 19, pointerEvents: 'none' }}>
          <MatchLeaderboardSidebar teams={sidebarTeams} palette={palette} />
        </div>
      )}

      {/* Elimination Alert Popup */}
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

// Inline WWCD component — rendered within master to access wallpaper prop
import type { ColorPalette } from '@/components/TopPlayersWidget';

function WwcdInline({
  teams, players, palette: p, wallpaperUrl,
}: {
  teams: APITeam[];
  players: APIPlayer[];
  palette: ColorPalette;
  wallpaperUrl: string | null;
}) {
  const [show, setShow] = useState(false);
  const winner = teams[0] ?? null;
  const squad = winner
    ? players.filter(pl => pl.teamName === winner.teamName).sort((a, b) => b.kills - a.kills)
    : [];

  useEffect(() => {
    if (!winner) return;
    const id = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(id);
  }, [winner]);

  if (!winner) return null;

  const name = winner.displayName || winner.teamName;
  const color = winner.brandColor || p.accent;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Roboto', sans-serif",
      opacity: show ? 1 : 0, transform: show ? 'scale(1)' : 'scale(0.9)',
      transition: 'all 1s ease',
    }}>
      {/* Background wallpaper */}
      {wallpaperUrl && (
        <>
          <img src={wallpaperUrl} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.25,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%)',
          }} />
        </>
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em',
          padding: '5px 18px', borderRadius: 100,
          background: p.accent, color: p.cardBg,
          marginBottom: 12,
        }}>
          PUBG MOBILE TOURNAMENT
        </div>

        <h1 style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 52, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: p.accent,
          textShadow: `0 0 40px ${p.accent}44, 0 0 80px ${p.accent}22`,
          margin: '0 0 24px',
        }}>
          WINNER WINNER CHICKEN DINNER
        </h1>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 24 }}>
          {squad.slice(0, 4).map((pl, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 120, height: 140, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
                background: p.bg, border: '1px solid ' + p.separator,
              }}>
                <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
                  <circle cx="30" cy="20" r="14" fill={p.textMuted + '33'} />
                  <path d="M8 75C8 55 15 42 30 42C45 42 52 55 52 75" fill={p.textMuted + '22'} />
                </svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: p.text }}>{pl.displayName || pl.playerName}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: p.accent }}>{pl.kills} ELIMS</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {winner.logoPath ? (
            <img src={winner.logoPath} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain' }} />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900,
              background: color + '33', color,
            }}>{(winner.shortName || name).substring(0, 2)}</div>
          )}
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 26, fontWeight: 800, color: p.text }}>{name}</span>
        </div>

        <div style={{
          display: 'flex', borderRadius: 12, overflow: 'hidden',
          border: '2px solid ' + p.accent + '33',
        }}>
          {[
            { label: 'WWCD', value: '1' },
            { label: 'TOTAL ELIMS', value: String(winner.kills) },
            { label: 'PLACEMENT PTS', value: String(winner.placementPoints) },
            { label: 'TOTAL POINTS', value: String(winner.totalPoints) },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: '12px 32px', textAlign: 'center',
              background: i === 0 ? p.accent : p.cardBg,
              color: i === 0 ? p.cardBg : p.text,
              borderLeft: i > 0 ? '1px solid ' + p.separator : 'none',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                color: i === 0 ? p.cardBg : p.textMuted, marginBottom: 4,
              }}>{stat.label}</div>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 24, fontWeight: 900,
              }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
