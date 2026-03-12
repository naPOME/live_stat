import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

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

async function main() {
  const seedPath = path.join(repoRoot, 'mock', 'e2e-cloud-to-local', 'seed.json');
  if (!fs.existsSync(seedPath)) {
    console.error('seed.json not found. Run e2e_seed_export.mjs first.');
    process.exit(1);
  }
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const orgId = seed.org_id;
  if (!orgId) {
    console.error('org_id missing in seed.json');
    process.exit(1);
  }

  // Deleting org cascades tournaments, teams, players, etc.
  const { error } = await supabase.from('organizations').delete().eq('id', orgId);
  if (error) throw error;

  console.log('Deleted mock org and cascading data:', orgId);
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
