import { getSupabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Server-side auth state for the local engine.
 * Stores Supabase session in memory (persists across requests, not across restarts).
 */

interface AuthState {
  session: Session | null;
  user: User | null;
  orgId: string | null;
  orgName: string | null;
}

let state: AuthState = {
  session: null,
  user: null,
  orgId: null,
  orgName: null,
};

export function getAuthState(): AuthState {
  return state;
}

export function isLoggedIn(): boolean {
  return Boolean(state.session && state.user);
}

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { ok: false, error: error?.message ?? 'Login failed' };
  }

  state.session = data.session;
  state.user = data.user;

  // Fetch org from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, organizations(name)')
    .eq('id', data.user.id)
    .single();

  if (profile?.org_id) {
    state.orgId = profile.org_id;
    const org = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations;
    state.orgName = (org as any)?.name ?? null;
  }

  return { ok: true };
}

export function logout(): void {
  const supabase = getSupabase();
  supabase?.auth.signOut().catch(() => {});
  state = { session: null, user: null, orgId: null, orgName: null };
}

/** Get a supabase client with the current session set. */
export function getAuthedSupabase() {
  const supabase = getSupabase();
  if (!supabase || !state.session) return null;
  // Set the session on the client so RLS works
  supabase.auth.setSession(state.session);
  return supabase;
}
