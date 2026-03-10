'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

type AuthState = {
  orgName: string;
  isAdmin: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ orgName: 'My Org', isAdmin: false, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ orgName: 'My Org', isAdmin: false, loading: true });

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState((s) => ({ ...s, loading: false })); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, is_admin, org:organizations(name)')
        .eq('id', user.id)
        .single();

      setState({
        orgName: (profile?.org as any)?.name ?? 'My Org',
        isAdmin: (profile as any)?.is_admin === true,
        loading: false,
      });
    }

    load();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
