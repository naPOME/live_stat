import { NextResponse } from 'next/server';
import { getTheme, getOrgBrandColor } from '@/lib/rosterStore';

export const runtime = 'nodejs';

export async function GET() {
  const theme = getTheme();
  const brandColor = getOrgBrandColor();
  return NextResponse.json({ ...theme, brand_color: brandColor });
}
