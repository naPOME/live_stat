export type Organization = {
  id: string;
  name: string;
  api_key?: string;
  logo_url: string | null;
  brand_color: string;
  accent_color: string;
  bg_color: string;
  font: string;
  table_style: string;
  sponsor1_url: string | null;
  sponsor2_url: string | null;
  sponsor3_url: string | null;
  banner_url: string | null;
  banner_title: string | null;
  banner_subtitle: string | null;
  favicon_url: string | null;
  visibility: Record<string, boolean>;
  created_at: string;
};

export type Profile = {
  id: string;
  org_id: string | null;
  full_name: string | null;
  created_at: string;
};

export type Tournament = {
  id: string;
  org_id: string;
  name: string;
  status: 'active' | 'archived';
  api_key: string;
  registration_open: boolean;
  registration_mode: 'open' | 'cap' | 'pick_first';
  registration_limit: number | null;
  target_team_count: number | null;
  allow_overflow: boolean;
  created_at: string;
};

export type PointSystem = {
  id: string;
  tournament_id: string;
  name: string;
  kill_points: number;
  placement_points: Record<string, number>;
  created_at: string;
};

export type Stage = {
  id: string;
  tournament_id: string;
  name: string;
  stage_order: number;
  status: 'pending' | 'active' | 'completed';
  auto_advance: boolean;
  teams_expected: number | null;
  map_rotation: string[] | null;
  stage_type: 'group' | 'elimination' | 'finals';
  advancing_count: number | null;
  invitational_count: number;
  match_count: number | null;
  created_at: string;
};

export type Match = {
  id: string;
  stage_id: string;
  group_id: string | null;
  name: string;
  map_name: string | null;
  status: 'pending' | 'live' | 'finished';
  point_system_id: string | null;
  scheduled_at: string | null;
  created_at: string;
};

export type Team = {
  id: string;
  org_id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  brand_color: string;
  created_at: string;
};

export type Player = {
  id: string;
  team_id: string;
  display_name: string;
  player_open_id: string;
  photo_url: string | null;
  created_at: string;
};

export type MatchSlot = {
  id: string;
  match_id: string;
  team_id: string;
  slot_number: number;
};

export type MatchResult = {
  id: string;
  match_id: string;
  team_id: string;
  placement: number;
  kill_count: number;
  total_pts: number;
  created_at: string;
};

export type PlayerMatchResult = {
  id: string;
  match_id: string;
  player_id: string | null;
  player_open_id: string;
  team_id: string | null;
  kills: number;
  damage: number;
  survived: boolean;
  created_at: string;
};

export type MatchDispute = {
  id: string;
  match_id: string;
  team_id: string | null;
  status: 'open' | 'under_review' | 'resolved' | 'rejected';
  reason: string;
  evidence_url: string | null;
  evidence_note: string | null;
  created_by: string;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type MatchResultFlag = {
  id: string;
  match_id: string;
  team_id: string | null;
  code: string;
  message: string;
  created_at: string;
};

export type TournamentTemplate = {
  id: string;
  tournament_id: string;
  name: string;
  map_rotation: string[];
  matches_per_stage: number;
  teams_per_stage: number | null;
  auto_assign: boolean;
  created_at: string;
};

export type TournamentTeam = {
  id: string;
  tournament_id: string;
  team_id: string;
  seed: number | null;
  created_at: string;
};

export type StageGroup = {
  id: string;
  stage_id: string;
  name: string;
  group_order: number;
  team_count: number | null;
  created_at: string;
};

export type GroupTeam = {
  group_id: string;
  team_id: string;
  created_at: string;
};

export type TeamApplication = {
  id: string;
  tournament_id: string;
  team_name: string;
  short_name: string | null;
  brand_color: string;
  logo_url: string | null;
  contact_email: string | null;
  players: { display_name: string; player_open_id: string }[];
  status: 'pending' | 'accepted' | 'rejected';
  notes: string | null;
  created_at: string;
};
