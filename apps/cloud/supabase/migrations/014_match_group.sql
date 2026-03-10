alter table matches
  add column group_id uuid references stage_groups(id) on delete set null;

alter table stages
  add column match_count int;
