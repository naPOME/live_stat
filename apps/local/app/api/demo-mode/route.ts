import { NextResponse } from 'next/server';
import { isDemoModeEnabled, setDemoModeEnabled, toggleDemoModeEnabled } from '@/lib/demoMode';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    enabled: isDemoModeEnabled(),
    envDefault: process.env.LOCAL_DEMO_MODE ?? null,
    usage: {
      method: 'POST',
      path: '/api/demo-mode',
      bodyExamples: [{ enabled: true }, { action: 'toggle' }],
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { enabled?: unknown; action?: unknown };

    if (body.action === 'toggle') {
      const enabled = toggleDemoModeEnabled();
      return NextResponse.json({ ok: true, enabled });
    }

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'enabled must be a boolean' }, { status: 400 });
    }

    const enabled = setDemoModeEnabled(body.enabled);
    return NextResponse.json({ ok: true, enabled });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
