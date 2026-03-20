import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WidgetsClient from './WidgetsClient';

export default async function WidgetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();

  const tournaments: { id: string; name: string; stages: { id: string; name: string }[] }[] = [];

  if (profile?.org_id) {
    const { data } = await supabase
      .from('tournaments')
      .select('id, name, stages(id, name, stage_order)')
      .eq('org_id', profile.org_id)
      .order('name');

    for (const t of data ?? []) {
      const stages = ((t.stages ?? []) as { id: string; name: string; stage_order: number }[])
        .sort((a, b) => a.stage_order - b.stage_order)
        .map(({ id, name }) => ({ id, name }));
      tournaments.push({ id: t.id, name: t.name, stages });
    }
  }

  return <WidgetsClient initialTournaments={tournaments} />;
}
