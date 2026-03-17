import { NextResponse } from 'next/server';
import { recordTelemetry } from '@/lib/lifecycleStore';

export const runtime = 'nodejs';

// Plane path + circle array — acknowledged (circle data comes via /setcircleinfo)
export async function POST() {
  recordTelemetry();
  return NextResponse.json({ ok: true });
}
