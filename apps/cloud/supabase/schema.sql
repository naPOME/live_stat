-- ─── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Tables ────────────────────────────────────────────────────────────────────

create table organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  api_key         uuid not null default gen_random_uuid(),
  logo_url        text,
  brand_color     text not null default '#00ffc3',
  accent_color    text not null default '#00ffc3',
  bg_color        text not null default '#213448',
  font            text not null default 'Inter',
  table_style     text not null default 'strip' check (table_style in ('strip','card','dark','minimal')),
  sponsor1_url    text,
  sponsor2_url    text,
  sponsor3_url    text,
  banner_url      text,
  banner_title    text,
  banner_subtitle text,
  favicon_url     text,
  visibility      jsonb not null default '{
    "leaderboard": true, "killfeed": true, "playercard": true,
    "elimination": true, "wwcd": true, "fraggers": true,
    "results": true, "pointtable": true, "teamlist": true,
    "matchinfo": true, "mvp": true, "schedule": true,
    "sponsor_overlay": true
  }',
  created_at      timestamptz not null default now()
);

-- Extends auth.users (auto-created via trigger)
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid references organizations(id) on delete set null,
  full_name  text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

create table tournaments (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null,
  status     text not null default 'active' check (status in ('active', 'archived')),
  format     text not null default 'tournament' check (format in ('tournament', 'quick_stream')),
  api_key    uuid not null default gen_random_uuid(),
  registration_open boolean not null default true,
  registration_mode text not null default 'open' check (registration_mode in ('open','cap','pick_first')),
  registration_limit int,
  target_team_count int,
  allow_overflow boolean not null default false,
  created_at timestamptz not null default now()
);

create table point_systems (
  id                uuid primary key default gen_random_uuid(),
  tournament_id     uuid not null references tournaments(id) on delete cascade,
  name              text not null default 'Default',
  kill_points       numeric not null default 1,
  placement_points  jsonb not null default '{
    "1":10,"2":6,"3":5,"4":4,"5":3,"6":2,"7":1,"8":1,
    "9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0,
    "17":0,"18":0,"19":0,"20":0,"21":0,"22":0,"23":0,"24":0,"25":0
  }',
  created_at        timestamptz not null default now()
);

create table stages (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name          text not null,
  stage_order   int not null default 1,
  status        text not null default 'pending' check (status in ('pending','active','completed')),
  auto_advance  boolean not null default true,
  teams_expected int,
  map_rotation  jsonb,
  stage_type    text not null default 'group' check (stage_type in ('group','elimination','finals')),
  advancing_count int,
  invitational_count int not null default 0,
  match_count   int,
  created_at    timestamptz not null default now()
);

create table matches (
  id               uuid primary key default gen_random_uuid(),
  stage_id         uuid not null references stages(id) on delete cascade,
  group_id         uuid references stage_groups(id) on delete set null,
  name             text not null,
  map_name         text,
  status           text not null default 'pending' check (status in ('pending','live','finished')),
  point_system_id  uuid references point_systems(id) on delete set null,
  scheduled_at     timestamptz,
  created_at       timestamptz not null default now()
);

create table teams (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  short_name  text,
  logo_url    text,
  created_at  timestamptz not null default now()
);

create table players (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references teams(id) on delete cascade,
  display_name    text not null,
  player_open_id  text not null,
  photo_url       text,
  created_at      timestamptz not null default now()
);

-- Slot 1-25, one team per slot per match (PCOB supports up to 25)
create table match_slots (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches(id) on delete cascade,
  team_id     uuid not null references teams(id) on delete cascade,
  slot_number int not null check (slot_number between 1 and 25),
  unique (match_id, slot_number),
  unique (match_id, team_id)
);

-- Pushed by local engine after match ends
create table match_results (
  id                 uuid primary key default gen_random_uuid(),
  match_id           uuid not null references matches(id) on delete cascade,
  team_id            uuid references teams(id) on delete set null,
  slot_number        int,
  in_game_team_name  text,
  placement          int,
  kill_count         int default 0,
  total_pts          int default 0,
  created_at         timestamptz not null default now(),
  unique (match_id, team_id)
);
-- Quick Stream results use slot_number instead of team_id
create unique index idx_match_results_slot on match_results(match_id, slot_number) where slot_number is not null;

-- Per-player stats pushed by local engine alongside team results
create table player_match_results (
  id               uuid primary key default gen_random_uuid(),
  match_id         uuid not null references matches(id) on delete cascade,
  player_id        uuid references players(id) on delete set null,
  player_open_id   text not null,
  team_id          uuid references teams(id) on delete set null,
  in_game_name     text,
  kills            int not null default 0,
  damage           int not null default 0,
  damage_taken     int not null default 0,
  heal             int not null default 0,
  headshots        int not null default 0,
  assists          int not null default 0,
  knockouts        int not null default 0,
  rescues          int not null default 0,
  survival_time    int not null default 0,
  survived         boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (match_id, player_open_id)
);

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

create table match_result_flags (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  team_id    uuid references teams(id) on delete set null,
  code       text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

create table tournament_templates (
  id                uuid primary key default gen_random_uuid(),
  tournament_id     uuid not null references tournaments(id) on delete cascade,
  name              text not null,
  map_rotation      jsonb not null default '[]',
  matches_per_stage int not null default 0,
  teams_per_stage   int,
  auto_assign       boolean not null default true,
  created_at        timestamptz not null default now()
);

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

create table tournament_teams (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  team_id        uuid not null references teams(id) on delete cascade,
  seed           int,
  created_at     timestamptz not null default now(),
  unique (tournament_id, team_id)
);

-- Public team registration submissions
create table team_applications (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_name     text not null,
  short_name    text,
  brand_color   text not null default '#ffffff',
  logo_url      text,
  contact_email text,
  players       jsonb not null default '[]',
  status        text not null default 'pending' check (status in ('pending','accepted','rejected')),
  notes         text,
  created_at    timestamptz not null default now()
);

create table org_devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text,
  device_token uuid not null default gen_random_uuid(),
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen timestamptz
);

create table device_pairings (
  code text primary key,
  org_id uuid references organizations(id) on delete cascade,
  device_token uuid,
  device_name text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_at timestamptz
);

-- ─── Indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_tournaments_org_id on tournaments(org_id);
create index if not exists idx_stages_tournament_id on stages(tournament_id);
create index if not exists idx_matches_stage_id on matches(stage_id);
create index if not exists idx_stage_groups_stage_id on stage_groups(stage_id);
create index if not exists idx_group_teams_group_id on group_teams(group_id);
create index if not exists idx_tournament_teams_tournament_id on tournament_teams(tournament_id);
create index if not exists idx_teams_org_id on teams(org_id);
create unique index if not exists idx_organizations_api_key on organizations(api_key);
create unique index if not exists idx_org_devices_token on org_devices(device_token);
create index if not exists idx_org_devices_org_id on org_devices(org_id);
create index if not exists idx_device_pairings_org_id on device_pairings(org_id);
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

-- ─── Storage ────────────────────────────────────────────────────────────────────
-- Run manually in Supabase dashboard → Storage → New bucket:
-- Name: logos, Public: true
-- insert into storage.buckets (id, name, public) values ('logos', 'logos', true);

-- ─── Triggers ──────────────────────────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
exception when others then
  raise log 'Error in handle_new_user trigger: %', sqlerrm;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Helper: register org (bypasses RLS for initial setup) ─────────────────────

create or replace function register_organization(org_name text)
returns uuid language plpgsql security definer as $$
declare
  v_org_id uuid;
begin
  insert into organizations (name) values (org_name)
  returning id into v_org_id;

  update profiles set org_id = v_org_id where id = auth.uid();

  return v_org_id;
end;
$$;

-- ─── Helper: get current user's org_id ─────────────────────────────────────────

create or replace function get_my_org_id()
returns uuid language sql security definer as $$
  select org_id from profiles where id = auth.uid();
$$;

-- ─── RLS ───────────────────────────────────────────────────────────────────────

alter table organizations  enable row level security;
alter table profiles       enable row level security;
alter table tournaments    enable row level security;
alter table point_systems  enable row level security;
alter table stages         enable row level security;
alter table matches        enable row level security;
alter table teams          enable row level security;
alter table players        enable row level security;
alter table match_slots    enable row level security;
alter table match_results  enable row level security;
alter table player_match_results enable row level security;
alter table match_disputes enable row level security;
alter table match_result_flags enable row level security;
alter table tournament_templates enable row level security;
alter table tournament_teams enable row level security;
alter table stage_groups enable row level security;
alter table group_teams enable row level security;
alter table team_applications enable row level security;

-- NOTE: All policies use an inlined (SELECT org_id FROM profiles WHERE id = auth.uid())
-- instead of calling get_my_org_id(). PostgreSQL optimises this as a single-execution
-- "init plan" (runs once per query), whereas a SECURITY DEFINER function call is
-- re-evaluated per row — making every query O(n) slower.

-- Profiles
create policy "Own profile" on profiles for all using (auth.uid() = id);

-- Organizations
create policy "Own org" on organizations for all
  using (id = (select org_id from profiles where id = auth.uid()));

-- Tournaments
create policy "Own tournaments" on tournaments for all
  using (org_id = (select org_id from profiles where id = auth.uid()));

-- Point systems (through tournament)
create policy "Own point_systems" on point_systems for all
  using (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ));

-- Stages (through tournament)
create policy "Own stages" on stages for all
  using (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ));

-- Matches (through stage → tournament)
create policy "Own matches" on matches for all
  using (stage_id in (
    select s.id from stages s
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ));

-- Teams
create policy "Own teams" on teams for all
  using (org_id = (select org_id from profiles where id = auth.uid()));

-- Players (through team)
create policy "Own players" on players for all
  using (team_id in (
    select id from teams
    where org_id = (select org_id from profiles where id = auth.uid())
  ));

-- Match slots (through match → stage → tournament)
create policy "Own match_slots" on match_slots for all
  using (match_id in (
    select m.id from matches m
    join stages s on s.id = m.stage_id
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ));

-- Match results: org members can view; inserts handled by service role in API
create policy "Own match_results read" on match_results for select
  using (match_id in (
    select m.id from matches m
    join stages s on s.id = m.stage_id
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ));

-- Player match results: org members can view; inserts handled by service role
create policy "Own player_match_results read" on player_match_results for select
  using (match_id in (
    select m.id from matches m
    join stages s on s.id = m.stage_id
    join tournaments t on t.id = s.tournament_id
    where t.org_id = (select org_id from profiles where id = auth.uid())
  ));

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

create policy "Own tournament_templates" on tournament_templates for all
  using (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ))
  with check (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ));

create policy "Own tournament_teams" on tournament_teams for all
  using (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ))
  with check (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ));

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

create policy "Own team_applications" on team_applications for all
  using (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ))
  with check (tournament_id in (
    select id from tournaments
    where org_id = (select org_id from profiles where id = auth.uid())
  ));

-- ─── Migration: Quick Stream support ────────────────────────────────────────────
-- Run these on existing databases that already have the tables created above.

-- ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'tournament' CHECK (format IN ('tournament', 'quick_stream'));
-- ALTER TABLE match_results ADD COLUMN IF NOT EXISTS slot_number int;
-- ALTER TABLE match_results ADD COLUMN IF NOT EXISTS in_game_team_name text;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_match_results_slot ON match_results(match_id, slot_number) WHERE slot_number IS NOT NULL;
-- ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS in_game_name text;
-- ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS damage_taken int NOT NULL DEFAULT 0;
-- ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS heal int NOT NULL DEFAULT 0;
-- ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS headshots int NOT NULL DEFAULT 0;
-- ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS assists int NOT NULL DEFAULT 0;
-- ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS knockouts int NOT NULL DEFAULT 0;
-- ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS rescues int NOT NULL DEFAULT 0;
-- ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS survival_time int NOT NULL DEFAULT 0;

