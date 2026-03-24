import { NextResponse } from 'next/server';
import { getAuthState, isLoggedIn, login, logout } from '@/lib/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  const auth = getAuthState();
  return NextResponse.json({
    ok: true,
    configured: isSupabaseConfigured(),
    logged_in: isLoggedIn(),
    user: auth.user ? { id: auth.user.id, email: auth.user.email } : null,
    org: auth.orgId ? { id: auth.orgId, name: auth.orgName } : null,
  });
}

export async function POST(request: Request) {
  let body: any = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const action = body?.action as string;

  if (action === 'login') {
    const email = (body?.email || '').trim();
    const password = body?.password || '';

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Email and password required' }, { status: 400 });
    }

    const result = await login(email, password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    const auth = getAuthState();
    return NextResponse.json({
      ok: true,
      user: { id: auth.user?.id, email: auth.user?.email },
      org: auth.orgId ? { id: auth.orgId, name: auth.orgName } : null,
    });
  }

  if (action === 'logout') {
    logout();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
}
