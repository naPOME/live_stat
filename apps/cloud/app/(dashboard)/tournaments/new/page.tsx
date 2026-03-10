'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// PUBG Mobile standard point system — hardcoded
const PUBGM_PLACEMENT_POINTS: Record<string, number> = {
  '1': 10, '2': 6, '3': 5, '4': 4, '5': 3, '6': 2, '7': 1, '8': 1,
  '9': 0, '10': 0, '11': 0, '12': 0, '13': 0, '14': 0, '15': 0, '16': 0,
  '17': 0, '18': 0, '19': 0, '20': 0, '21': 0, '22': 0,
};
const PUBGM_KILL_POINTS = 1;

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Tournament name is required'); return; }
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase
      .from('profiles').select('org_id').eq('id', user.id).single();
    if (!profile?.org_id) { setError('No organization found'); setLoading(false); return; }

    // Create tournament
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .insert({ org_id: profile.org_id, name: name.trim() })
      .select()
      .single();

    if (tErr || !tournament) { setError(tErr?.message ?? 'Failed to create'); setLoading(false); return; }

    // Auto-create PUBG Mobile standard point system
    await supabase.from('point_systems').insert({
      tournament_id: tournament.id,
      name: 'PUBG Mobile Standard',
      kill_points: PUBGM_KILL_POINTS,
      placement_points: PUBGM_PLACEMENT_POINTS,
    });

    router.push(`/tournaments/${tournament.id}`);
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/tournaments" className="text-[#8b8da6] hover:text-white transition-colors text-sm">
          ← Tournaments
        </Link>
        <span className="text-[#8b8da6]/40">/</span>
        <span className="text-white text-sm">New Tournament</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">New Tournament</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-[#ff4e4e]/10 border border-[#ff4e4e]/30 text-[#ff4e4e] text-sm px-3 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        {/* Tournament name */}
        <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
          <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-2">
            Tournament Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 focus:ring-1 focus:ring-[#00ffc3]/30 transition-colors"
            placeholder="e.g. PMPL Africa Season 4 — Grand Finals"
          />
        </div>

        {/* Point system info (read-only) */}
        <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
          <div className="mb-3">
            <div className="text-sm font-semibold text-white">Point System</div>
            <div className="text-xs text-[#8b8da6] mt-0.5">PUBG Mobile Standard — applied to all matches</div>
          </div>

          <div className="flex items-center gap-6 mb-3">
            <div>
              <span className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">Kill Points</span>
              <div className="text-sm text-[#00ffc3] font-mono mt-0.5">1 pt / kill</div>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">Placement Points</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { rank: '1st', pts: 10 },
                { rank: '2nd', pts: 6 },
                { rank: '3rd', pts: 5 },
                { rank: '4th', pts: 4 },
                { rank: '5th', pts: 3 },
                { rank: '6th', pts: 2 },
                { rank: '7th', pts: 1 },
                { rank: '8th', pts: 1 },
                { rank: '9th+', pts: 0 },
              ].map(({ rank, pts }) => (
                <div
                  key={rank}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-center min-w-[52px]"
                >
                  <div className="text-[10px] text-[#8b8da6]">{rank}</div>
                  <div className={`text-sm font-mono ${pts > 0 ? 'text-[#00ffc3]' : 'text-[#8b8da6]'}`}>{pts}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 text-[#00ffc3] font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Creating…' : 'Create Tournament'}
          </button>
          <Link
            href="/tournaments"
            className="px-5 py-2.5 rounded-lg border border-white/10 text-[#8b8da6] hover:text-white hover:border-white/20 text-sm font-medium transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
