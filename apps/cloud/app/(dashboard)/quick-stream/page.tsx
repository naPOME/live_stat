import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuickStreamClient from './QuickStreamClient';

export default async function QuickStreamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/');

  const { data: sessions } = await supabase
    .from('tournaments')
    .select(`
      id, name, status, created_at, api_key,
      stages(id, name, status, match_count,
        matches(id, name, status)
      )
    `)
    .eq('org_id', profile.org_id)
    .eq('format', 'quick_stream')
    .order('created_at', { ascending: false })
    .limit(50);

  return <QuickStreamClient sessions={sessions ?? []} />;
}
