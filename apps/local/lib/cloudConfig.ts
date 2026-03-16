import fs from 'fs';
import path from 'path';

export interface CloudConfig {
  cloud_url: string;
  org_api_key?: string;
  device_token?: string;
  org?: { id: string; name: string };
  tournament?: { id: string; name: string };
  match_id?: string | null;
}

const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(CONFIG_DIR, 'cloud_config.json');

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadCloudConfig(): CloudConfig | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as CloudConfig;
  } catch {
    return null;
  }
}

export function saveCloudConfig(next: CloudConfig | null): void {
  ensureDir();
  if (!next) {
    try { fs.unlinkSync(CONFIG_PATH); } catch { /* ignore */ }
    return;
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
}

export function clearCloudConfig(): void {
  saveCloudConfig(null);
}
