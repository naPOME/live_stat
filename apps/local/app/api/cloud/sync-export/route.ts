import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRoster, type RosterMapping } from '@/lib/rosterStore';

export const runtime = 'nodejs';

const DEFAULT_LOGO_DIR = 'C:/logo';

/**
 * POST /api/cloud/sync-export
 *
 * Downloads team + org logos from Supabase URLs to local disk (C:/logo)
 * and generates TeamLogoAndColor.ini for PCOB.
 *
 * Body: { logo_dir?: string }  (defaults to C:/logo)
 */
export async function POST(request: Request) {
  let body: { logo_dir?: string } = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const roster = getRoster();
  if (!roster) {
    return NextResponse.json({ ok: false, error: 'No roster loaded. Select a match first.' }, { status: 400 });
  }

  const logoDir = (body.logo_dir || DEFAULT_LOGO_DIR).replace(/\\/g, '/');

  // Ensure logo directory exists
  try {
    fs.mkdirSync(logoDir, { recursive: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Cannot create logo directory: ${logoDir}` }, { status: 500 });
  }

  const downloaded: string[] = [];
  const errors: string[] = [];

  // ─── Download org logo ───
  const orgLogoUrl = roster.org.logo_url ?? roster.org.logo_path;
  const orgLogoLocal = path.join(logoDir, 'org_logo.png').replace(/\\/g, '/');
  if (orgLogoUrl && orgLogoUrl.startsWith('http')) {
    const result = await downloadFile(orgLogoUrl, orgLogoLocal);
    if (result.ok) downloaded.push('org_logo.png');
    else errors.push(`org_logo: ${result.error}`);
  }

  // ─── Download team logos ───
  for (const team of roster.teams) {
    const padded = String(team.slot_number).padStart(3, '0');
    const localPath = path.join(logoDir, `${padded}.png`).replace(/\\/g, '/');

    const logoUrl = team.logo_url ?? team.logo_path;
    if (logoUrl && logoUrl.startsWith('http')) {
      const result = await downloadFile(logoUrl, localPath);
      if (result.ok) {
        downloaded.push(`${padded}.png`);
      } else {
        errors.push(`${team.short_name}: ${result.error}`);
      }
    }
  }

  // ─── Generate TeamLogoAndColor.ini ───
  const iniContent = generateIni(roster, logoDir);
  const iniPath = path.join(logoDir, 'TeamLogoAndColor.ini').replace(/\\/g, '/');
  try {
    fs.writeFileSync(iniPath, iniContent, 'utf-8');
  } catch (e) {
    errors.push(`INI write failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return NextResponse.json({
    ok: true,
    ini_path: iniPath,
    logo_dir: logoDir,
    downloaded: downloaded.length,
    errors: errors.length > 0 ? errors : undefined,
    teams: roster.teams.length,
  });
}

// ─── Helpers ───

async function downloadFile(url: string, destPath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function generateIni(roster: RosterMapping, logoDir: string): string {
  const lines: string[] = [
    '[/Script/ShadowTrackerExtra.FCustomTeamLogoAndColor]',
    'EnableTeamLogoAndColor=1',
  ];

  const SLOT_COUNT = 25;
  const slotMap = new Map(roster.teams.map(t => [t.slot_number, t]));

  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const t = slotMap.get(slot);
    const padded = String(slot).padStart(3, '0');
    const logoPath = `c:/logo/${padded}.png`;

    if (t) {
      const hex = t.brand_color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;

      lines.push(
        `TeamLogoAndColor=(TeamNo=${slot},TeamName=${t.short_name},TeamLogoPath=${logoPath},KillInfoPath=${logoPath},TeamColorR=${r},TeamColorG=${g},TeamColorB=${b},TeamColorA=255,PlayerColorR=0,PlayerColorG=255,PlayerColorB=0,PlayerColorA=255,CornerMarkPath=,fin)`,
      );
    } else {
      lines.push(
        `TeamLogoAndColor=(TeamNo=${slot},TeamName=,TeamLogoPath=,KillInfoPath=,TeamColorR=0,TeamColorG=0,TeamColorB=0,TeamColorA=255,PlayerColorR=0,PlayerColorG=255,PlayerColorB=0,PlayerColorA=255,CornerMarkPath=,fin)`,
      );
    }
  }

  return lines.join('\n');
}
