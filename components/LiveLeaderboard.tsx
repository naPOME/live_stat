'use client';

import React from 'react';

interface TeamData {
  rank: number;
  teamName: string;
  countryCode?: string;
  logoUrl?: string;
  playerStatus: number[];
  points: number;
  elims: number;
}

const leaderboardData: TeamData[] = [
  { rank: 1, teamName: 'IBx', countryCode: 'sa', playerStatus: [2, 2, 2, 0], points: 3, elims: 3 },
  { rank: 2, teamName: 'GNF', countryCode: 'tr', playerStatus: [2, 2, 2, 2], points: 3, elims: 3 },
  { rank: 3, teamName: 'K2S', countryCode: 'es', playerStatus: [2, 2, 2, 2], points: 0, elims: 0 },
  { rank: 4, teamName: 'A2S', countryCode: 'kr', playerStatus: [2, 2, 2, 2], points: 0, elims: 0 },
  { rank: 5, teamName: 'A7', countryCode: 'br', playerStatus: [2, 2, 2, 2], points: 0, elims: 0 },
  { rank: 6, teamName: 'REG', countryCode: 'tr', playerStatus: [2, 2, 2, 2], points: 0, elims: 0 },
  { rank: 7, teamName: 'CLD', countryCode: 'th', playerStatus: [2, 2, 2, 2], points: 0, elims: 0 },
  { rank: 8, teamName: 'TBD', countryCode: 'mn', playerStatus: [2, 2, 0, 0], points: 0, elims: 0 },
  { rank: 9, teamName: 'EA', countryCode: 'th', playerStatus: [2, 2, 2, 2], points: 0, elims: 0 },
  { rank: 10, teamName: 'TBD', countryCode: 'tr', playerStatus: [2, 2, 2, 1], points: 0, elims: 0 },
  { rank: 11, teamName: 'CLD', countryCode: 'th', playerStatus: [2, 2, 2, 2], points: 0, elims: 0 },
  { rank: 12, teamName: 'TBD', countryCode: 'mn', playerStatus: [2, 2, 0, 0], points: 0, elims: 0 },
  { rank: 13, teamName: 'EA', countryCode: 'th', playerStatus: [2, 2, 2, 2], points: 0, elims: 0 },
  { rank: 14, teamName: 'TBD', countryCode: 'tr', playerStatus: [2, 2, 2, 1], points: 0, elims: 0 },
];

const StatusBars = ({ status }: { status: number[] }) => {
  return (
    <div className="flex gap-[3px]">
      {status.map((s, index) => {
        let colorClass = 'bg-[#3d405b]';
        if (s === 2) colorClass = 'bg-[#00ffc3] shadow-[0_0_8px_rgba(0,255,195,0.6)]';
        if (s === 1) colorClass = 'bg-[#ff4e4e]';
        return <div key={index} className={`h-6 w-1.5 rounded-sm ${colorClass} transition-all duration-300`} />;
      })}
    </div>
  );
};

const TeamRow = ({ team, flash }: { team: TeamData; flash?: 'kills' | 'points' | 'alive' }) => {
  const flashClass = (() => {
    if (!flash) return '';
    if (flash === 'kills') return 'bg-[#4a1f2a] ring-2 ring-[#ff4e4e] animate-pulse';
    if (flash === 'points') return 'bg-[#1f3f3a] ring-2 ring-[#00ffc3] animate-pulse';
    return 'bg-[#3a3b55] ring-2 ring-[#8b8da6] animate-pulse';
  })();

  const rankAccentClass = (() => {
    if (team.rank === 1) return 'from-[#00ffc3] to-[#6d5efc]';
    if (team.rank === 2) return 'from-[#ff4e4e] to-[#6d5efc]';
    if (team.rank === 3) return 'from-[#ffd166] to-[#6d5efc]';
    return 'from-white/20 to-white/0';
  })();

  return (
    <div
      className={`group relative flex items-center justify-between bg-[#1f2038]/80 hover:bg-[#2a2b45] border border-white/10 rounded-xl px-3 py-2 mb-2 transition-colors h-8 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] ${flashClass}`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="w-8 flex justify-center">
          <div
            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${rankAccentClass} flex items-center justify-center shadow-[0_0_16px_rgba(109,94,252,0.18)]`}
          >
            <div className="text-center font-extrabold text-[13px] text-white italic">{team.rank}</div>
          </div>
        </div>
        <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-[5px] font-bold text-white/50 border border-white/10">
          IMG
        </div>
        <div className="text-md font-semibold text-white tracking-wide uppercase drop-shadow-[0_0_10px_rgba(0,0,0,0.35)]">
          {team.teamName}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="w-[30px] flex justify-center">
          <StatusBars status={team.playerStatus} />
        </div>
        <div className="w-7 text-center font-extrabold text-xl text-white tabular-nums">{team.points}</div>
        <div className="w-7 text-center font-extrabold text-xl text-[#00ffc3] tabular-nums drop-shadow-[0_0_10px_rgba(0,255,195,0.15)]">
          {team.elims}
        </div>
      </div>
    </div>
  );
};

interface LeaderboardProps {
  teams?: TeamData[];
  flashByTeam?: Record<string, 'kills' | 'points' | 'alive'>;
}

const LiveLeaderboard: React.FC<LeaderboardProps> = ({ teams = leaderboardData, flashByTeam }) => {
  const displayTeams: TeamData[] = (() => {
    const normalized = (teams ?? []).slice(0, 16);
    const padded: TeamData[] = [...normalized];
    for (let i = padded.length; i < 16; i += 1) {
      padded.push({
        rank: i + 1,
        teamName: '—',
        countryCode: '',
        playerStatus: [0, 0, 0, 0],
        points: 0,
        elims: 0,
      });
    }
    return padded;
  })();

  return (
    <div className="relative w-full max-w-md rounded-2xl p-[1px] bg-gradient-to-br from-[#00ffc3]/35 via-[#6d5efc]/30 to-[#ff4e4e]/30 shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
      <div className="w-full bg-gradient-to-b from-[#1e1f35] to-[#151628] p-4 rounded-2xl border border-white/10">
      <div className="flex justify-between px-3 mb-2 text-white/60 text-xs font-extrabold tracking-widest uppercase">
        <div className="flex gap-14">
          <span className="w-8 text-center">Rank</span>
          <span>Team</span>
        </div>
        <div className="flex gap-6 text-center">
          <span className="w-[40px]">Alive</span>
          <span className="w-8">Pts</span>
          <span className="w-8">Elims</span>
        </div>
      </div>
      <div className="flex flex-col">
        {displayTeams.map((team) => (
          <TeamRow key={team.rank} team={team} flash={flashByTeam?.[team.teamName]} />
        ))}
      </div>
      </div>
    </div>
  );
};

export default LiveLeaderboard;
