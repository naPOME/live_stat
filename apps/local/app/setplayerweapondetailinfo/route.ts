import { NextRequest, NextResponse } from 'next/server';
import { handlePostMatchWeapons } from '@/lib/gameStore';
import { recordTelemetry } from '@/lib/lifecycleStore';

export const runtime = 'nodejs';

// Post-match per-player weapon accuracy data
export async function POST(req: NextRequest) {
  try {
    recordTelemetry();
    const body = await req.json();
    const weapons = (body.WeaponResult ?? []).map((w: Record<string, unknown>) => ({
      avatarId: Number(w.AvatarID ?? 0),
      totalDamage: Number(w.TotalDamage ?? 0),
      killCount: Number(w.KillCount ?? 0),
      headShootCount: Number(w.HeadShootCount ?? 0),
      bodyShootCount: Number(w.BodyShootCount ?? 0),
      limbsShootCount: Number(w.LimbsShootCount ?? 0),
      uniqueHitCount: Number(w.UniqueHitCount ?? 0),
      totalUseTime: Number(w.TotalUseTime ?? 0),
    }));
    // The player ID isn't directly in this payload — derive from weapon avatar context
    // For now store with empty playerId; the game sends one per player in order
    handlePostMatchWeapons('', weapons);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/setplayerweapondetailinfo]', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
