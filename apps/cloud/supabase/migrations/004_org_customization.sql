-- ─── Migration 004: Organization customization (branding, banner, visibility) ──
-- Run this in Supabase SQL editor

-- Sponsor logos (up to 3)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sponsor1_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sponsor2_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sponsor3_url text;

-- Banner / Hero
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS banner_title text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS banner_subtitle text;

-- Favicon
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url text;

-- Overlay visibility toggles (jsonb for flexibility)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS visibility jsonb NOT NULL DEFAULT '{
  "leaderboard": true,
  "killfeed": true,
  "playercard": true,
  "elimination": true,
  "wwcd": true,
  "fraggers": true,
  "results": true,
  "pointtable": true,
  "teamlist": true,
  "matchinfo": true,
  "mvp": true,
  "schedule": true,
  "sponsor_overlay": true
}';
