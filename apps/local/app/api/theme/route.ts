import { NextResponse } from 'next/server';
import { getTheme, getOrgBrandColor, getPointSystem, getSponsors } from '@/lib/rosterStore';
import { ok } from '@shared/api';

export const runtime = 'nodejs';

export async function GET() {
  const theme = getTheme();
  const brandColor = getOrgBrandColor();
  const pointSystem = getPointSystem();
  const sponsors = getSponsors();
  return NextResponse.json(ok({ ...theme, brand_color: brandColor, point_system: pointSystem, sponsors }));
}
