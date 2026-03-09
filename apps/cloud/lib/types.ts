export type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  accent_color: string;
  bg_color: string;
  font: string;
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
  created_at: string;
};

export type Match = {
  id: string;
  stage_id: string;
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
