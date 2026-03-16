import { NextResponse } from 'next/server';
import { getTheme, getOrgBrandColor, getPointSystem } from '@/lib/rosterStore';

export const runtime = 'nodejs';

export async function GET() {
  const theme = getTheme();
  const brandColor = getOrgBrandColor();
  const pointSystem = getPointSystem();
  return NextResponse.json({ ...theme, brand_color: brandColor, point_system: pointSystem });
}
