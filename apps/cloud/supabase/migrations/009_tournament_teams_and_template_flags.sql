alter table tournament_templates
  add column auto_assign boolean not null default true;

create table tournament_teams (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  team_id        uuid not null references teams(id) on delete cascade,
  seed           int,
  created_at     timestamptz not null default now(),
  unique (tournament_id, team_id)
);

alter table tournament_teams enable row level security;

create policy "Own tournament_teams" on tournament_teams for all
  using (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ))
  with check (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ));
