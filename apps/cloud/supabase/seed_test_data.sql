-- Seed 16 teams + 64 players for org 7f103a55-8143-412c-b3bc-d8668f51ad66
-- Run in Supabase SQL Editor

DO $$
DECLARE
  v_org_id uuid := '7f103a55-8143-412c-b3bc-d8668f51ad66';
  v_team_id uuid;
  team_names text[] := ARRAY[
    'Phoenix Rising', 'Shadow Wolves', 'Iron Eagles', 'Storm Breakers',
    'Nova Kings', 'Dark Titans', 'Frost Reapers', 'Venom Strike',
    'Thunder Hawks', 'Blood Ravens', 'Cyber Ghosts', 'Steel Vipers',
    'Blaze Squad', 'Night Stalkers', 'Apex Legends', 'War Machine'
  ];
  team_tags text[] := ARRAY[
    'PHX', 'SHW', 'IRE', 'STB',
    'NVK', 'DKT', 'FSR', 'VNM',
    'THK', 'BLR', 'CGH', 'STV',
    'BLZ', 'NST', 'APX', 'WRM'
  ];
  player_names text[][] := ARRAY[
    ARRAY['Blaze', 'Ember', 'Ash', 'Inferno'],
    ARRAY['Fang', 'Howl', 'Ghost', 'Shadow'],
    ARRAY['Hawk', 'Talon', 'Eagle', 'Falcon'],
    ARRAY['Thor', 'Bolt', 'Storm', 'Surge'],
    ARRAY['Nova', 'Stellar', 'Comet', 'Orbit'],
    ARRAY['Titan', 'Golem', 'Brute', 'Wraith'],
    ARRAY['Frost', 'Ice', 'Glacier', 'Blizzard'],
    ARRAY['Viper', 'Cobra', 'Mamba', 'Fang'],
    ARRAY['Zeus', 'Ares', 'Hermes', 'Apollo'],
    ARRAY['Raven', 'Crow', 'Reaper', 'Doom'],
    ARRAY['Cipher', 'Glitch', 'Pixel', 'Byte'],
    ARRAY['Steel', 'Chrome', 'Titanium', 'Alloy'],
    ARRAY['Pyro', 'Scorch', 'Flame', 'Spark'],
    ARRAY['Shade', 'Dusk', 'Phantom', 'Specter'],
    ARRAY['Apex', 'Prime', 'Alpha', 'Omega'],
    ARRAY['Tank', 'Cannon', 'Rocket', 'Turret']
  ];
BEGIN
  FOR i IN 1..16 LOOP
    INSERT INTO teams (org_id, name, short_name)
    VALUES (v_org_id, team_names[i], team_tags[i])
    RETURNING id INTO v_team_id;

    FOR j IN 1..4 LOOP
      INSERT INTO players (team_id, display_name, player_open_id)
      VALUES (
        v_team_id,
        player_names[i][j],
        'open_' || lower(team_tags[i]) || '_' || j
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded 16 teams and 64 players for org %', v_org_id;
END $$;
