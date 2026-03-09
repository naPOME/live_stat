-- ─── Migration 002: Optimize RLS policies ──────────────────────────────────
-- Replace get_my_org_id() function calls in RLS policies with inlined subqueries.
-- PostgreSQL optimises an inlined (SELECT …) as a single-execution "init plan"
-- (runs once per query), whereas a SECURITY DEFINER function gets re-evaluated
-- per row, making every query O(n) slower.
--
-- Run this in Supabase SQL editor after 001_additions.sql

-- Drop all existing policies first
DROP POLICY IF EXISTS "Own profile"          ON profiles;
DROP POLICY IF EXISTS "Own org"              ON organizations;
DROP POLICY IF EXISTS "Own tournaments"      ON tournaments;
DROP POLICY IF EXISTS "Own point_systems"    ON point_systems;
DROP POLICY IF EXISTS "Own stages"           ON stages;
DROP POLICY IF EXISTS "Own matches"          ON matches;
DROP POLICY IF EXISTS "Own teams"            ON teams;
DROP POLICY IF EXISTS "Own players"          ON players;
DROP POLICY IF EXISTS "Own match_slots"      ON match_slots;
DROP POLICY IF EXISTS "Own match_results read" ON match_results;

-- Profiles — unchanged (already fast, just uses auth.uid())
CREATE POLICY "Own profile" ON profiles FOR ALL
  USING (auth.uid() = id);

-- Organizations — inline the org_id lookup
CREATE POLICY "Own org" ON organizations FOR ALL
  USING (id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Tournaments
CREATE POLICY "Own tournaments" ON tournaments FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Point systems (through tournament)
CREATE POLICY "Own point_systems" ON point_systems FOR ALL
  USING (tournament_id IN (
    SELECT id FROM tournaments
    WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Stages (through tournament)
CREATE POLICY "Own stages" ON stages FOR ALL
  USING (tournament_id IN (
    SELECT id FROM tournaments
    WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Matches (through stage → tournament)
CREATE POLICY "Own matches" ON matches FOR ALL
  USING (stage_id IN (
    SELECT s.id FROM stages s
    JOIN tournaments t ON t.id = s.tournament_id
    WHERE t.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Teams
CREATE POLICY "Own teams" ON teams FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Players (through team)
CREATE POLICY "Own players" ON players FOR ALL
  USING (team_id IN (
    SELECT id FROM teams
    WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Match slots (through match → stage → tournament)
CREATE POLICY "Own match_slots" ON match_slots FOR ALL
  USING (match_id IN (
    SELECT m.id FROM matches m
    JOIN stages s ON s.id = m.stage_id
    JOIN tournaments t ON t.id = s.tournament_id
    WHERE t.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Match results: org members can read; inserts handled by service role
CREATE POLICY "Own match_results read" ON match_results FOR SELECT
  USING (match_id IN (
    SELECT m.id FROM matches m
    JOIN stages s ON s.id = m.stage_id
    JOIN tournaments t ON t.id = s.tournament_id
    WHERE t.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));
