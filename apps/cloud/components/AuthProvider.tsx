'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

type AuthState = {
  orgName: string;
  orgId: string | null;
  isAdmin: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ orgName: 'My Org', orgId: null, isAdmin: false, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ orgName: 'My Org', orgId: null, isAdmin: false, loading: true });

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // getSession() reads from local cookie — no server round-trip
      // Middleware already validated the session, so this is safe
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setState((s) => ({ ...s, loading: false })); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, is_admin, org:organizations(name)')
        .eq('id', session.user.id)
        .single();

      setState({
        orgName: (profile?.org as any)?.name ?? 'My Org',
        orgId: profile?.org_id ?? null,
        isAdmin: (profile as any)?.is_admin === true,
        loading: false,
      });
    }

    load();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
