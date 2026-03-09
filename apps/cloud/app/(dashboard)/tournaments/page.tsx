import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function TournamentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/');

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id,name,status,created_at,api_key')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournaments</h1>
          <p className="text-[#8b8da6] text-sm mt-1">{tournaments?.length ?? 0} tournament{tournaments?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/tournaments/new"
          className="flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          + New Tournament
        </Link>
      </div>

      {tournaments && tournaments.length > 0 ? (
        <div className="bg-[#213448] border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-white/5">
            {['Name', 'Status', 'Created', ''].map((h) => (
              <span key={h} className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {tournaments.map((t, i) => (
            <div
              key={t.id}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-white/5 transition-colors ${
                i > 0 ? 'border-t border-white/5' : ''
              }`}
            >
              <Link href={`/tournaments/${t.id}`} className="font-medium text-white hover:text-[#00ffc3] transition-colors">
                {t.name}
              </Link>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  t.status === 'active'
                    ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
                    : 'bg-white/5 text-[#8b8da6]'
                }`}
              >
                {t.status}
              </span>
              <span className="text-[#8b8da6] text-sm tabular-nums">
                {new Date(t.created_at).toLocaleDateString()}
              </span>
              <Link
                href={`/tournaments/${t.id}`}
                className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] transition-colors font-medium"
              >
                Manage →
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#213448] border border-dashed border-white/10 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="text-white font-semibold text-lg mb-2">No tournaments yet</h3>
          <p className="text-[#8b8da6] text-sm mb-6">Create your first tournament to start managing stages and matches.</p>
          <Link
            href="/tournaments/new"
            className="inline-flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            + New Tournament
          </Link>
        </div>
      )}
    </div>
  );
}
