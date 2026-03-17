import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Inventory/backpack updates — acknowledged but not stored (low priority data)
export async function POST() {
  return NextResponse.json({ ok: true });
}
