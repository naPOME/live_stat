'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

type AuthState = {
  orgName: string;
  orgId: string | null;
  isAdmin: boolean;
  loading: boolean;
  sponsors: string[];
};

const AuthContext = createContext<AuthState>({ orgName: 'My Org', orgId: null, isAdmin: false, loading: true, sponsors: [] });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ orgName: 'My Org', orgId: null, isAdmin: false, loading: true, sponsors: [] });

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // getSession() reads from local cookie — no server round-trip
      // Middleware already validated the session, so this is safe
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setState((s) => ({ ...s, loading: false })); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, is_admin, org:organizations(name, sponsor1_url, sponsor2_url, sponsor3_url)')
        .eq('id', session.user.id)
        .single();

      const org = profile?.org as any;
      const sponsors = [org?.sponsor1_url, org?.sponsor2_url, org?.sponsor3_url].filter(Boolean) as string[];

      setState({
        orgName: org?.name ?? 'My Org',
        orgId: profile?.org_id ?? null,
        isAdmin: (profile as any)?.is_admin === true,
        loading: false,
        sponsors,
      });
    }

    load();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
