'use client';

import React from 'react';

// --- Types & Interfaces ---
interface TeamData {
  rank: number;
  teamName: string;
  countryCode?: string;
  logoUrl?: string;
  playerStatus: number[];
  points: number;
  elims: number;
}

// --- Mock Data ---
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

// --- Sub-Components ---
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

  return (
    <div
      className={`group relative flex items-center justify-between bg-[#2a2b45] hover:bg-[#323352] border border-[#4a4c68] rounded-xl px-3 py-2 mb-2 transition-colors h-7 ${flashClass}`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="w-8 text-center font-bold text-lg text-white italic">{team.rank}</div>
        <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-[5px] font-bold text-white/50 border border-white/10">IMG</div>
        <div className="text-md font-semibold text-white tracking-wide uppercase">{team.teamName}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="w-[30px] flex justify-center"><StatusBars status={team.playerStatus} /></div>
        <div className="w-7 text-center font-bold text-xl text-white">{team.points}</div>
        <div className="w-7 text-center font-bold text-xl text-white">{team.elims}</div>
      </div>
    </div>
  );
};

// --- Main Component ---
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
    <div className="w-full max-w-md bg-gradient-to-b from-[#1e1f35] to-[#151628] p-4 rounded-2xl shadow-2xl border border-[#2e2f4f]">
      <div className="flex justify-between px-3 mb-2 text-[#8b8da6] text-xs font-bold tracking-widest uppercase">
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
  );
};

export default LiveLeaderboard;
