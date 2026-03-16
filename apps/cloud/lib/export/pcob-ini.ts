import JSZip from 'jszip';

const SLOT_COUNT = 22;

type ExportTeam = {
  team_id: string;
  slot_number: number;
  name: string;
  short_name: string;
  brand_color: string;
  players: Array<{ player_open_id: string; display_name: string }>;
};


export function generatePcobIni(teams: ExportTeam[]): string {
  const lines: string[] = [
    '[/Script/ShadowTrackerExtra.FCustomTeamLogoAndColor]',
    'EnableTeamLogoAndColor=1',
  ];


  const slotMap = new Map<number, ExportTeam>();
  for (const t of teams) {
    slotMap.set(t.slot_number, t);
  }

  // PCOB expects all 22 slots
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
      // Empty slot — still required by PCOB
      lines.push(
        `TeamLogoAndColor=(TeamNo=${slot},TeamName=,TeamLogoPath=,KillInfoPath=,TeamColorR=0,TeamColorG=0,TeamColorB=0,TeamColorA=255,PlayerColorR=0,PlayerColorG=255,PlayerColorB=0,PlayerColorA=255,CornerMarkPath=,fin)`,
      );
    }
  }

  return lines.join('\n');
}

/**
 * Add team logo files to a JSZip logos folder.
 * Creates 4 resolution variants per team: 001.png, 001_64.png, 001_128.png, 001_256.png
 * (All use the same source buffer — actual resizing would need sharp/canvas on the server)
 */
export async function addTeamLogos(
  logosFolder: JSZip,
  teams: ExportTeam[],
  getLogoUrl: (teamId: string) => string | null,
) {
  for (const t of teams) {
    const logoUrl = getLogoUrl(t.team_id);
    if (!logoUrl) continue;

    try {
      const res = await fetch(logoUrl);
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      const padded = String(t.slot_number).padStart(3, '0');

      // 4 resolution variants expected by PCOB
      logosFolder.file(`${padded}.png`, buffer);
      logosFolder.file(`${padded}_64.png`, buffer);
      logosFolder.file(`${padded}_128.png`, buffer);
      logosFolder.file(`${padded}_256.png`, buffer);
    } catch {
      // Skip failed logo downloads
    }
  }
}
