alter table stages
  add column teams_expected int,
  add column map_rotation jsonb;

create table tournament_templates (
  id                uuid primary key default gen_random_uuid(),
  tournament_id     uuid not null references tournaments(id) on delete cascade,
  name              text not null,
  map_rotation      jsonb not null default '[]',
  matches_per_stage int not null default 0,
  teams_per_stage   int,
  created_at        timestamptz not null default now()
);

alter table tournament_templates enable row level security;

create policy "Own tournament_templates" on tournament_templates for all
  using (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ))
  with check (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ));
