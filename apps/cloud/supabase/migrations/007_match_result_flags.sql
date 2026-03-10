create table match_result_flags (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  team_id    uuid references teams(id) on delete set null,
  code       text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table match_result_flags enable row level security;

create policy "Own match_result_flags" on match_result_flags for all
  using (match_id in (
    select m.id from matches m
    join stages s on s.id = m.stage_id
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ))
  with check (match_id in (
    select m.id from matches m
    join stages s on s.id = m.stage_id
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ));
