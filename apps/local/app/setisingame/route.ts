import { NextRequest, NextResponse } from 'next/server';
import { handleMatchPhase } from '@/lib/gameStore';
import { pushMatchResult } from '@/lib/cloudSync';
import { recordTelemetry, goLive, goFinished, syncPending, syncDone, setPostMatchCallback } from '@/lib/lifecycleStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    recordTelemetry();
    const text = (await req.text()).trim().replace(/^"|"$/g, '');

    if (text === 'InGame') {
      handleMatchPhase('InGame');
      goLive();
    }

    if (text === 'Finished') {
      handleMatchPhase('Finished');

      // Register sync callback BEFORE goFinished() — it fires after 30s collection window.
      // Per PCOB guideline: host must stay online 30s for all post-match data to arrive.
      setPostMatchCallback(async () => {
        syncPending();
        try {
          const result = await pushMatchResult();
          syncDone(result.ok, result.error);
        } catch (e) {
          syncDone(false, e instanceof Error ? e.message : 'Unknown error');
        }
      });

      goFinished();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/setisingame]', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
