import type { Stage, Match, Team, StageGroup, PointSystem, TeamApplication, TournamentTemplate, MatchResultFlag, MatchDispute } from '@/lib/types';

export type GroupWithTeams = StageGroup & { teams: Team[]; matches: Match[] };
export type StageWithDetails = Stage & { matches: Match[]; groups: GroupWithTeams[] };

export type Tab = 'overview' | 'stages' | 'standings' | 'applications' | 'ops';

export type TournamentData = {
  id: string;
  name: string;
  status: string;
  api_key: string;
  registration_open: boolean;
  registration_mode: 'open' | 'cap' | 'pick_first';
  registration_limit: number | null;
  target_team_count: number | null;
  org_id: string;
};

export type StandingEntry = {
  team_id: string;
  total_pts: number;
  total_kills: number;
  matches_played: number;
  wins: number;
  avg_placement: number;
  rank: number;
  team: { id: string; name: string; short_name: string | null; logo_url: string | null } | null;
};

export type StageStandings = {
  id: string;
  name: string;
  stage_order: number;
  matchCount: number;
  standings: StandingEntry[];
};

export type ToastState = { message: string; type: 'error' | 'info' } | null;
export type ConfirmDialogState = { message: string; onConfirm: () => void } | null;

export type { PointSystem, TeamApplication, TournamentTemplate, MatchResultFlag, MatchDispute, Team, Match };
