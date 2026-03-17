import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Plane path + circle array — acknowledged (circle data comes via /setcircleinfo)
export async function POST() {
  return NextResponse.json({ ok: true });
}
