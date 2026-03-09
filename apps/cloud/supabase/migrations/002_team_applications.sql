-- ─── Migration 002: Team applications (public registration portal) ──────────
-- Run this in Supabase SQL editor after 001_additions.sql

create table if not exists team_applications (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_name     text not null,
  short_name    text,
  brand_color   text not null default '#ffffff',
  logo_url      text,
  contact_email text,
  players       jsonb not null default '[]',
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  notes         text,
  created_at    timestamptz not null default now()
);

-- RLS: org members can read/manage applications for their tournaments.
-- Public inserts are done via the /api/apply route (service role).
alter table team_applications enable row level security;

create policy "Own team_applications" on team_applications for all
  using (tournament_id in (select id from tournaments where org_id = get_my_org_id()));
