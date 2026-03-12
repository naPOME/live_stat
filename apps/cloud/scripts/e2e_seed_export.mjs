import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const mockDir = path.join(repoRoot, 'mock', 'e2e-cloud-to-local');
const logosDir = path.join(mockDir, 'logos');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

readEnvFile(path.join(repoRoot, 'apps', 'cloud', '.env.local'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const ORG_NAME = `E2E Mock Org ${RUN_ID}`;
const TOURNAMENT_NAME = `E2E Mock Tournament ${RUN_ID}`;

const TEAM_LIST = [
  ['Alpha Wolves', 'ALPH', '#00ffc3'],
  ['Bravo Foxes', 'BRAV', '#ff4e4e'],
  ['Crimson Hawks', 'CRIM', '#ffb300'],
  ['Delta Vipers', 'DLTA', '#6d5efc'],
  ['Echo Titans', 'ECHO', '#34d399'],
  ['Frost Ravens', 'FROST', '#60a5fa'],
  ['Ghost Lynx', 'GHLX', '#a78bfa'],
  ['Horizon Owls', 'HRZN', '#f59e0b'],
  ['Iron Rhinos', 'IRON', '#f87171'],
  ['Jade Serpents', 'JADE', '#10b981'],
  ['Kinetic Bears', 'KNTC', '#22c55e'],
  ['Lunar Stags', 'LUNA', '#93c5fd'],
  ['Magma Cobras', 'MGM', '#f97316'],
  ['Nova Sharks', 'NOVA', '#38bdf8'],
  ['Omega Bulls', 'OMGA', '#facc15'],
  ['Phantom Kites', 'PHNT', '#e879f9'],
].map(([name, short, color]) => ({ name, short, color }));

const TEAMS = TEAM_LIST.slice(0, 16);

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAfJp8rwAAAABJRU5ErkJggg==',
  'base64',
);

const cloudOrigin = process.env.CLOUD_APP_ORIGIN || 'http://localhost:3002';

async function uploadLogo(pathKey) {
  await supabase.storage.from('logos').upload(pathKey, tinyPng, {
    contentType: 'image/png',
    upsert: true,
  });
  const { data } = supabase.storage.from('logos').getPublicUrl(pathKey);
  return data.publicUrl;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function main() {
  ensureDir(mockDir);
  ensureDir(logosDir);

  // Clean mock dir contents
  for (const entry of fs.readdirSync(mockDir)) {
    if (entry === 'README.md' || entry === 'install.ps1') continue;
    fs.rmSync(path.join(mockDir, entry), { recursive: true, force: true });
  }
  ensureDir(logosDir);

  // Create org
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: ORG_NAME, brand_color: '#00ffc3', accent_color: '#00ffc3', bg_color: '#0e1621', font: 'Inter' })
    .select('*')
    .single();
  if (orgErr) throw orgErr;

  // Org logo
  const orgLogoUrl = await uploadLogo(`e2e/${RUN_ID}/org_logo.png`);
  await supabase.from('organizations').update({ logo_url: orgLogoUrl }).eq('id', org.id);

  // Tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({ org_id: org.id, name: TOURNAMENT_NAME, status: 'active', registration_open: true })
    .select('*')
    .single();
  if (tErr) throw tErr;

  // Point system
  const { data: ps, error: psErr } = await supabase
    .from('point_systems')
    .insert({ tournament_id: tournament.id, name: 'E2E Default' })
    .select('*')
    .single();
  if (psErr) throw psErr;

  // Stage
  const { data: stage, error: sErr } = await supabase
    .from('stages')
    .insert({ tournament_id: tournament.id, name: 'E2E Stage', stage_order: 1, status: 'active', stage_type: 'group', match_count: 1 })
    .select('*')
    .single();
  if (sErr) throw sErr;

  // Match
  const { data: match, error: mErr } = await supabase
    .from('matches')
    .insert({ stage_id: stage.id, name: 'Match 1', status: 'finished', point_system_id: ps.id })
    .select('*')
    .single();
  if (mErr) throw mErr;

  // Teams + players
  const teamIds = [];
  const starPlayers = new Map();
  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .insert({ org_id: org.id, name: t.name, short_name: t.short, brand_color: t.color })
      .select('*')
      .single();
    if (teamErr) throw teamErr;

    const logoUrl = await uploadLogo(`e2e/${RUN_ID}/team_${i + 1}.png`);
    await supabase.from('teams').update({ logo_url: logoUrl }).eq('id', team.id);

    teamIds.push(team.id);

    const players = Array.from({ length: 4 }).map((_, pIdx) => ({
      team_id: team.id,
      display_name: `${t.short} Player ${pIdx + 1}`,
      player_open_id: `${t.short}_P${pIdx + 1}`,
    }));
    await supabase.from('players').insert(players);

    // Mark one "star" player per team for higher stats later
    starPlayers.set(team.id, `${t.short}_P1`);
  }

  // Tournament teams
  await supabase.from('tournament_teams').insert(
    teamIds.map((teamId, i) => ({ tournament_id: tournament.id, team_id: teamId, seed: i + 1 })),
  );

  // Match slots
  await supabase.from('match_slots').insert(
    teamIds.map((teamId, i) => ({ match_id: match.id, team_id: teamId, slot_number: i + 1 })),
  );

  // Results (ranked in order, descending points)
  const matchResults = teamIds.map((teamId, i) => ({
    match_id: match.id,
    team_id: teamId,
    placement: i + 1,
    kill_count: Math.max(1, 16 - i),
    total_pts: 30 - i * 2,
  }));
  await supabase.from('match_results').insert(matchResults);

  // Player match results
  const { data: players } = await supabase.from('players').select('id, player_open_id, team_id');
  if (players && players.length > 0) {
    const pmr = players.map((p) => {
      const isStar = starPlayers.get(p.team_id) === p.player_open_id;
      return {
        match_id: match.id,
        player_id: p.id,
        player_open_id: p.player_open_id,
        team_id: p.team_id,
        kills: isStar ? 8 : 2,
        damage: isStar ? 1200 : 350,
        survived: isStar,
      };
    });
    await supabase.from('player_match_results').insert(pmr);
  }

  // Build export files (mirror export route)
  const { data: slots } = await supabase
    .from('match_slots')
    .select('slot_number, team:teams(*, players(*))')
    .eq('match_id', match.id)
    .order('slot_number');

  const teams = [];
  const playerIndex = {};
  for (const slot of slots ?? []) {
    const team = slot.team;
    if (!team) continue;
    const slotNum = slot.slot_number;
    const padded = String(slotNum).padStart(3, '0');

    const teamPlayers = (team.players ?? []).map((p) => ({
      player_open_id: p.player_open_id,
      display_name: p.display_name,
    }));

    teams.push({
      team_id: team.id,
      slot_number: slotNum,
      name: team.name,
      short_name: team.short_name ?? team.name.substring(0, 4).toUpperCase(),
      brand_color: team.brand_color,
      logo_path: `c:/logo/${padded}.png`,
      logo_path_64: `c:/logo/${padded}_64.png`,
      players: teamPlayers,
    });

    for (const p of teamPlayers) {
      playerIndex[p.player_open_id] = {
        team_id: team.id,
        display_name: p.display_name,
        slot_number: slotNum,
      };
    }
  }

  const rosterMapping = {
    version: 1,
    tournament_id: tournament.id,
    stage_id: stage.id,
    match_id: match.id,
    cloud_endpoint: `${cloudOrigin}/api/match-results`,
    cloud_api_key: tournament.api_key,
    point_system: {
      kill_points: Number(ps.kill_points ?? 1),
      placement_points: ps.placement_points ?? {
        '1': 10, '2': 6, '3': 5, '4': 4, '5': 3, '6': 2,
        '7': 1, '8': 1, '9': 0, '10': 0,
      },
    },
    org: {
      id: org.id,
      name: org.name,
      brand_color: org.brand_color,
      logo_path: 'c:/logo/org_logo.png',
      theme: {
        bg_color: org.bg_color,
        accent_color: org.accent_color,
        font: org.font,
      },
    },
    teams,
    player_index: playerIndex,
  };

  writeJson(path.join(mockDir, 'roster_mapping.json'), rosterMapping);

  // Logos
  for (const slot of slots ?? []) {
    const team = slot.team;
    if (!team?.logo_url) continue;
    const res = await fetch(team.logo_url);
    if (!res.ok) continue;
    const buffer = Buffer.from(await res.arrayBuffer());
    const padded = String(slot.slot_number).padStart(3, '0');
    fs.writeFileSync(path.join(logosDir, `${padded}.png`), buffer);
    fs.writeFileSync(path.join(logosDir, `${padded}_64.png`), buffer);
  }

  if (orgLogoUrl) {
    const res = await fetch(orgLogoUrl);
    if (res.ok) fs.writeFileSync(path.join(logosDir, 'org_logo.png'), Buffer.from(await res.arrayBuffer()));
  }

  // TeamLogoAndColor.ini
  const iniLines = ['[TeamLogoAndColor]', ''];
  for (const t of teams) {
    const padded = String(t.slot_number).padStart(3, '0');
    const hex = t.brand_color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    iniLines.push(`; Slot ${t.slot_number}`);
    iniLines.push(`TeamName${t.slot_number}=${t.name}`);
    iniLines.push(`TeamShortName${t.slot_number}=${t.short_name}`);
    iniLines.push(`TeamLogo${t.slot_number}=c:/logo/${padded}.png`);
    iniLines.push(`TeamColor${t.slot_number}=${r},${g},${b}`);
    iniLines.push('');
  }
  fs.writeFileSync(path.join(mockDir, 'TeamLogoAndColor.ini'), iniLines.join('\n'));

  // README
  fs.writeFileSync(
    path.join(mockDir, 'README.txt'),
    [
      'LiveStat Cloud -> Local E2E Mock Export',
      `Tournament: ${tournament.name}`,
      `Stage: ${stage.name}`,
      `Match: ${match.name}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'SETUP INSTRUCTIONS:',
      '1. Copy mock/e2e-cloud-to-local/logos/* to C:/logo/',
      '2. Set ROSTER_MAPPING_PATH to mock/e2e-cloud-to-local/roster_mapping.json',
      '3. Copy TeamLogoAndColor.ini to your game client scripts folder (optional).',
      '',
      `Teams assigned: ${teams.length}`,
      `Players indexed: ${Object.keys(playerIndex).length}`,
    ].join('\n'),
  );

  // Seed metadata
  writeJson(path.join(mockDir, 'seed.json'), {
    run_id: RUN_ID,
    org_id: org.id,
    tournament_id: tournament.id,
    stage_id: stage.id,
    match_id: match.id,
    created_at: new Date().toISOString(),
  });

  console.log('E2E mock export created at:', mockDir);
  console.log('Tournament ID:', tournament.id);
  console.log('Match ID:', match.id);
}

main().catch((err) => {
  console.error('E2E seed/export failed:', err);
  process.exit(1);
});
