import { NextResponse } from 'next/server';
import { recordTelemetry } from '@/lib/lifecycleStore';

export const runtime = 'nodejs';

// Post-match ammo/pickup data per player — acknowledged
export async function POST() {
  recordTelemetry();
  return NextResponse.json({ ok: true });
}
