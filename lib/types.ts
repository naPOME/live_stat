

export type LeaderboardTeam = {
  teamName: string;
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
  teamName: string;
  kills: number;
 };

export type LeaderboardResponse = {
  matchId: string;
  serverTime: number;
  spotlight?: {
    playerName: string;
    teamName: string;
    kills: number;
  };
  teams: LeaderboardTeam[];
  players?: LeaderboardPlayer[];
};
