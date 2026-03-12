-- Performance indexes
create index if not exists idx_tournaments_org_id on tournaments(org_id);
create index if not exists idx_stages_tournament_id on stages(tournament_id);
create index if not exists idx_matches_stage_id on matches(stage_id);
create index if not exists idx_stage_groups_stage_id on stage_groups(stage_id);
create index if not exists idx_group_teams_group_id on group_teams(group_id);
create index if not exists idx_tournament_teams_tournament_id on tournament_teams(tournament_id);
create index if not exists idx_teams_org_id on teams(org_id);
create index if not exists idx_players_team_id on players(team_id);
create index if not exists idx_players_player_open_id on players(player_open_id);
create index if not exists idx_match_slots_match_id on match_slots(match_id);
create index if not exists idx_match_results_match_id on match_results(match_id);
create index if not exists idx_player_match_results_match_id on player_match_results(match_id);
create index if not exists idx_team_applications_tournament_id on team_applications(tournament_id);
create index if not exists idx_team_applications_tournament_status on team_applications(tournament_id, status);
create index if not exists idx_team_applications_created_at on team_applications(created_at);
create index if not exists idx_match_disputes_match_id on match_disputes(match_id);
create index if not exists idx_match_result_flags_match_id on match_result_flags(match_id);
