import { NextResponse } from 'next/server';
import { recordTelemetry } from '@/lib/lifecycleStore';

export const runtime = 'nodejs';

// Inventory/backpack updates — acknowledged but not stored (low priority data)
export async function POST() {
  recordTelemetry();
  return NextResponse.json({ ok: true });
}
