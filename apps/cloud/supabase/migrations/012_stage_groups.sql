create table stage_groups (
  id          uuid primary key default gen_random_uuid(),
  stage_id    uuid not null references stages(id) on delete cascade,
  name        text not null,
  group_order int not null default 1,
  team_count  int,
  created_at  timestamptz not null default now()
);

create table group_teams (
  group_id  uuid not null references stage_groups(id) on delete cascade,
  team_id   uuid not null references teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, team_id)
);

alter table stage_groups enable row level security;
alter table group_teams enable row level security;

create policy "Own stage_groups" on stage_groups for all
  using (stage_id in (
    select s.id from stages s
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ))
  with check (stage_id in (
    select s.id from stages s
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ));

create policy "Own group_teams" on group_teams for all
  using (group_id in (
    select g.id from stage_groups g
    join stages s on s.id = g.stage_id
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ))
  with check (group_id in (
    select g.id from stage_groups g
    join stages s on s.id = g.stage_id
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ));
