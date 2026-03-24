-- Quick Stream support migration
-- Run in Supabase SQL Editor

-- 1. Add format column to tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'tournament';

ALTER TABLE tournaments
  DROP CONSTRAINT IF EXISTS tournaments_format_check;

ALTER TABLE tournaments
  ADD CONSTRAINT tournaments_format_check CHECK (format IN ('tournament', 'quick_stream'));

-- 2. Add slot-based identification to match_results
ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS slot_number int,
  ADD COLUMN IF NOT EXISTS in_game_team_name text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_results_slot
  ON match_results(match_id, slot_number) WHERE slot_number IS NOT NULL;

-- 3. Extend player_match_results with full stat columns + in-game name
ALTER TABLE player_match_results
  ADD COLUMN IF NOT EXISTS in_game_name text,
  ADD COLUMN IF NOT EXISTS damage_taken int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heal int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS headshots int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assists int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS knockouts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rescues int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS survival_time int NOT NULL DEFAULT 0;
