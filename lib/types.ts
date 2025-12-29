// Type definitions for the live ranking system

export type LeaderboardTeam = {
  teamName: string;
  kills: number;
  placement?: number;
  alive?: boolean;
  placementPoints: number;
  totalPoints: number;
  updatedAt: number;
};

export type LeaderboardResponse = {
  matchId: string;
  serverTime: number;
  teams: LeaderboardTeam[];
};
