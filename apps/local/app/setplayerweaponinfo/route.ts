import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Post-match global weapon report — acknowledged
export async function POST() {
  return NextResponse.json({ ok: true });
}
