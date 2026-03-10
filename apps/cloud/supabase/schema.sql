-- ─── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Tables ────────────────────────────────────────────────────────────────────

create table organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  logo_url     text,
  brand_color  text not null default '#00ffc3',
  accent_color text not null default '#00ffc3',
  bg_color     text not null default '#213448',
  font         text not null default 'Inter',
  created_at   timestamptz not null default now()
);

-- Extends auth.users (auto-created via trigger)
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid references organizations(id) on delete set null,
  full_name  text,
  created_at timestamptz not null default now()
);

create table tournaments (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null,
  status     text not null default 'active' check (status in ('active', 'archived')),
  api_key    uuid not null default gen_random_uuid(),
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
    "17":0,"18":0,"19":0,"20":0,"21":0,"22":0
  }',
  created_at        timestamptz not null default now()
);

create table stages (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name          text not null,
  stage_order   int not null default 1,
  created_at    timestamptz not null default now()
);

create table matches (
  id               uuid primary key default gen_random_uuid(),
  stage_id         uuid not null references stages(id) on delete cascade,
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
  brand_color text not null default '#ffffff',
  created_at  timestamptz not null default now()
);

create table players (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references teams(id) on delete cascade,
  display_name    text not null,
  player_open_id  text not null,
  created_at      timestamptz not null default now()
);

-- Slot 1-22, one team per slot per match
create table match_slots (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches(id) on delete cascade,
  team_id     uuid not null references teams(id) on delete cascade,
  slot_number int not null check (slot_number between 1 and 22),
  unique (match_id, slot_number),
  unique (match_id, team_id)
);

-- Pushed by local engine after match ends
create table match_results (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches(id) on delete cascade,
  team_id     uuid references teams(id) on delete set null,
  placement   int,
  kill_count  int default 0,
  total_pts   int default 0,
  created_at  timestamptz not null default now(),
  unique (match_id, team_id)
);

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

