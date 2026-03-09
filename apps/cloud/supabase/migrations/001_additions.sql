-- ─── Migration 001: table_style + is_admin ─────────────────────────────────
-- Run this in Supabase SQL editor after the initial schema.sql

-- Leaderboard style preference per org
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS table_style text NOT NULL DEFAULT 'strip'
  CHECK (table_style IN ('strip', 'card', 'dark', 'minimal'));

-- Super-admin flag on profiles (set manually for platform owners)
-- Example: UPDATE profiles SET is_admin = true WHERE id = 'your-user-uuid';
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
