export type LeaderboardTeam = {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  kills: number;
  placement?: number;
  alive?: boolean;
  liveMemberNum?: number;
  placementPoints: number;
  totalPoints: number;
  updatedAt: number;
};

export type LeaderboardPlayer = {
  playerName: string;
  displayName?: string;
  teamName: string;
  kills: number;
};

export type GamePhase = 'lobby' | 'ingame' | 'finished';

export type LeaderboardResponse = {
  matchId: string;
  serverTime: number;
  phase?: GamePhase;
  spotlight?: {
    playerName: string;
    displayName?: string;
    teamName: string;
    kills: number;
  };
  teams: LeaderboardTeam[];
  players?: LeaderboardPlayer[];
};
