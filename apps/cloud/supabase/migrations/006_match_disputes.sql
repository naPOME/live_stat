create table match_disputes (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references matches(id) on delete cascade,
  team_id         uuid references teams(id) on delete set null,
  status          text not null default 'open' check (status in ('open','under_review','resolved','rejected')),
  reason          text not null,
  evidence_url    text,
  evidence_note   text,
  created_by      uuid not null default auth.uid() references auth.users(id) on delete set null,
  resolved_by     uuid references auth.users(id) on delete set null,
  resolution_note text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

alter table match_disputes enable row level security;

create policy "Own match_disputes" on match_disputes for all
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
