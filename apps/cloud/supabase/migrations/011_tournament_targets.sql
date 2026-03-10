alter table tournaments
  add column target_team_count int,
  add column allow_overflow boolean not null default false;
