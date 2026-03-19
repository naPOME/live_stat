import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRoster, setRosterPathOverride, type RosterMapping } from '@/lib/rosterStore';
import { loadCloudConfig } from '@/lib/cloudConfig';

export const runtime = 'nodejs';

const DEFAULT_LOGO_DIR = 'C:/logo';
const DEFAULT_ROSTER_DIR = 'C:/logo';

/**
 * POST /api/cloud/sync-export
 *
 * After selecting a tournament via cloud pairing, this endpoint:
 * 1. Downloads team + org logos from cloud URLs to local disk
 * 2. Rewrites logo_path fields to local paths
 * 3. Generates TeamLogoAndColor.ini for PCOB
 * 4. Writes roster_mapping.json to disk
 * 5. Reloads rosterStore from the file
 *
 * Body: { logo_dir?: string }  (defaults to C:/logo)
 */
export async function POST(request: Request) {
  let body: { logo_dir?: string } = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const roster = getRoster();
  if (!roster) {
    return NextResponse.json({ ok: false, error: 'No roster loaded. Select a tournament first.' }, { status: 400 });
  }

  const logoDir = (body.logo_dir || DEFAULT_LOGO_DIR).replace(/\\/g, '/');
  const rosterDir = body.logo_dir || DEFAULT_ROSTER_DIR;

  // Ensure logo directory exists
  try {
    fs.mkdirSync(logoDir, { recursive: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Cannot create logo directory: ${logoDir}` }, { status: 500 });
  }

  const downloaded: string[] = [];
  const errors: string[] = [];

  // ─── Download org logo ───
  const orgLogoUrl = roster.org.logo_path;
  const orgLogoLocal = path.join(logoDir, 'org_logo.png').replace(/\\/g, '/');
  if (orgLogoUrl && orgLogoUrl.startsWith('http')) {
    const result = await downloadFile(orgLogoUrl, orgLogoLocal);
    if (result.ok) downloaded.push('org_logo.png');
    else errors.push(`org_logo: ${result.error}`);
  }

  // ─── Download team logos ───
  const updatedTeams = [];
  for (const team of roster.teams) {
    const padded = String(team.slot_number).padStart(3, '0');
    const localPath = path.join(logoDir, `${padded}.png`).replace(/\\/g, '/');
    const localPath64 = path.join(logoDir, `${padded}_64.png`).replace(/\\/g, '/');

    // Download main logo
    const logoUrl = team.logo_path;
    if (logoUrl && logoUrl.startsWith('http')) {
      const result = await downloadFile(logoUrl, localPath);
      if (result.ok) {
        downloaded.push(`${padded}.png`);
        // Also copy as _64 variant
        try { fs.copyFileSync(localPath, localPath64); } catch { /* ignore */ }
      } else {
        errors.push(`${team.short_name}: ${result.error}`);
      }
    }

    updatedTeams.push({
      ...team,
      logo_path: localPath,
      logo_path_64: localPath64,
    });
  }

  // ─── Build updated roster with local paths ───
  const localRoster: RosterMapping = {
    ...roster,
    org: {
      ...roster.org,
      logo_path: orgLogoLocal,
    },
    teams: updatedTeams,
  };

  // ─── Generate TeamLogoAndColor.ini ───
  const iniContent = generateIni(localRoster, logoDir);
  const iniPath = path.join(logoDir, 'TeamLogoAndColor.ini').replace(/\\/g, '/');
  try {
    fs.writeFileSync(iniPath, iniContent, 'utf-8');
  } catch (e) {
    errors.push(`INI write failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ─── Write roster_mapping.json ───
  const rosterPath = path.join(rosterDir, 'roster_mapping.json').replace(/\\/g, '/');
  try {
    fs.writeFileSync(rosterPath, JSON.stringify(localRoster, null, 2), 'utf-8');
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Cannot write roster_mapping.json: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  // ─── Reload rosterStore from file ───
  setRosterPathOverride(rosterPath);

  return NextResponse.json({
    ok: true,
    roster_path: rosterPath,
    ini_path: iniPath,
    logo_dir: logoDir,
    downloaded: downloaded.length,
    errors: errors.length > 0 ? errors : undefined,
    teams: updatedTeams.length,
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

function hexToRgba(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b},255`;
}

function generateIni(roster: RosterMapping, logoDir: string): string {
  const lines: string[] = [
    '[General]',
    `TeamNum=${roster.teams.length}`,
    `LogoPath=${logoDir.replace(/\//g, '\\\\')}`,
    `KillInfoPath=${logoDir.replace(/\//g, '\\\\')}`,
    '',
  ];

  for (const team of roster.teams) {
    const padded = String(team.slot_number).padStart(3, '0');
    const rgba = hexToRgba(team.brand_color);
    lines.push(`[Team${padded}]`);
    lines.push(`Name=${team.short_name || team.name}`);
    lines.push(`Logo=${padded}.png`);
    lines.push(`Color=${rgba}`);
    lines.push('');
  }

  return lines.join('\r\n');
}
