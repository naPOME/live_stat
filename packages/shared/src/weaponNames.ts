// PUBG Mobile weapon ID → display name lookup table
export const WEAPON_NAMES: Record<string, string> = {
  // ARs
  '102005': 'M416',
  '101006': 'AKM',
  '102007': 'SCAR-L',
  '102001': 'M16A4',
  '103004': 'QBZ',
  '103007': 'G36C',
  '102010': 'M762',
  '102012': 'Beryl M762',
  '102013': 'MK47 Mutant',
  '103001': 'Groza',
  // SMGs
  '106004': 'UMP45',
  '106001': 'Micro UZI',
  '106006': 'Vector',
  '106002': 'Tommy Gun',
  '106005': 'PP-19 Bizon',
  '106007': 'MP5K',
  '106009': 'MP9',
  // SRs
  '105001': 'Kar98k',
  '105006': 'M24',
  '105007': 'AWM',
  '105002': 'SKS',
  '105004': 'Mini 14',
  '105003': 'Mk14 EBR',
  '105005': 'VSS',
  // DMRs
  '104003': 'QBU',
  '104001': 'SLR',
  '104002': 'Dragunov',
  // Shotguns
  '107001': 'S686',
  '107002': 'S12K',
  '107003': 'S1897',
  '107004': 'DBS',
  '107005': 'Sawed-Off',
  // LMGs
  '108001': 'M249',
  '108002': 'DP-28',
  '108003': 'MG3',
  // Pistols
  '111001': 'P18C',
  '111002': 'P92',
  '111003': 'R1895',
  '111004': 'R45',
  '111005': 'Deagle',
  '111006': 'Skorpion',
  '111007': 'Flare Gun',
  // Melee / Throwables
  '120001': 'Pan',
  '130001': 'Frag Grenade',
  '130002': 'Smoke Grenade',
  '130003': 'Stun Grenade',
  '130005': 'Molotov',
  // Vehicles & other
  '200001': 'Blue Zone',
  '0': 'Unknown',
};

export function getWeaponName(itemId: string | number): string {
  return WEAPON_NAMES[String(itemId)] ?? `Weapon (${itemId})`;
}
