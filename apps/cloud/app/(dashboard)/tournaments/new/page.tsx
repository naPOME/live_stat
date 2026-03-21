'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const PUBGM_PLACEMENT_POINTS: Record<string, number> = {
  '1': 10, '2': 6, '3': 5, '4': 4, '5': 3, '6': 2, '7': 1, '8': 1,
  '9': 0, '10': 0, '11': 0, '12': 0, '13': 0, '14': 0, '15': 0, '16': 0,
  '17': 0, '18': 0, '19': 0, '20': 0, '21': 0, '22': 0,
};
const PUBGM_KILL_POINTS = 1;

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [targetTeams, setTargetTeams] = useState<number | ''>('');
  const [allowOverflow, setAllowOverflow] = useState(false);
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

    const targetTeamCount = targetTeams === '' ? null : Number(targetTeams);
    const registrationMode = targetTeamCount ? (allowOverflow ? 'pick_first' : 'cap') : 'open';

    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .insert({
        org_id: profile.org_id,
        name: name.trim(),
        target_team_count: targetTeamCount,
        allow_overflow: allowOverflow,
        registration_mode: registrationMode,
        registration_limit: targetTeamCount,
        registration_open: true,
      })
      .select()
      .single();

    if (tErr || !tournament) { setError(tErr?.message ?? 'Failed to create'); setLoading(false); return; }

    await supabase.from('point_systems').insert({
      tournament_id: tournament.id,
      name: 'PUBG Mobile Standard',
      kill_points: PUBGM_KILL_POINTS,
      placement_points: PUBGM_PLACEMENT_POINTS,
    });

    router.push(`/tournaments/${tournament.id}`);
  }

  const placementData = [
    { rank: '1st', pts: 10 }, { rank: '2nd', pts: 6 }, { rank: '3rd', pts: 5 },
    { rank: '4th', pts: 4 }, { rank: '5th', pts: 3 }, { rank: '6th', pts: 2 },
    { rank: '7th', pts: 1 }, { rank: '8th', pts: 1 }, { rank: '9th+', pts: 0 },
  ];

  return (
    <div className="max-w-[700px] page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-xs text-[var(--text-muted)]">
        <Link href="/tournaments" className="hover:text-[var(--text-primary)] transition-colors">
          Tournaments
        </Link>
        <span className="opacity-40">/</span>
        <span className="text-[var(--text-primary)]">Create</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            New Tournament
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Configure registration and default scoring.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative">
        
        {error && (
          <div className="surface-elevated border border-[var(--red-border)] text-[var(--red)] text-sm px-4 py-3 rounded-lg animate-slide-down">
            {error}
          </div>
        )}

        {/* Name */}
        <div className="surface-elevated p-6">
          <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Tournament Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="input-premium h-12 w-full"
            placeholder="e.g. PMPL Africa Season 4"
          />
        </div>

        {/* Teams */}
        <div className="surface-elevated p-6">
          <div className="mb-4 pb-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold text-[var(--text-primary)]">Team Registration Settings</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Set how many teams can register and what happens when the limit is reached.</div>
          </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Target Team Count</label>
                <input
                  type="number"
                  min={0}
                  value={targetTeams}
                  onChange={(e) => setTargetTeams(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 60"
                  className="input-premium h-11 w-full"
                />
              </div>
              <div className="flex flex-col justify-end pb-1">
                <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="relative flex-shrink-0">
                    <input type="checkbox" checked={allowOverflow} onChange={(e) => setAllowOverflow(e.target.checked)}
                      className="sr-only peer" />
                    <div className="w-10 h-6 rounded-full bg-[var(--bg-base)] border border-[var(--border)] peer-checked:bg-[var(--accent)]/15 peer-checked:border-[var(--accent-border)] transition-all" />
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-[var(--text-muted)] peer-checked:bg-[var(--accent)] peer-checked:translate-x-4 transition-all" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">Allow extra teams</span>
                    <span className="block text-xs text-[var(--text-muted)] mt-0.5">Keep accepting registrations after the target is reached.</span>
                  </div>
                </label>
              </div>
            </div>
        </div>

        {/* Point System */}
        <div className="surface-elevated p-6">
          <div className="mb-4 pb-3 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Scoring Rules</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Points awarded for kills and placements (PUBG Mobile standard).</div>
            </div>
            <div className="badge badge-accent">Preset</div>
          </div>

          <div className="mb-5 border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-base)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Points per kill</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">1 pt / kill</span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[var(--text-muted)] mb-3">Placement distribution</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
              {placementData.map(({ rank, pts }) => (
                <div key={rank} className={`border rounded-lg p-2 text-center ${pts > 0 ? 'bg-[var(--bg-hover)] border-[var(--border)]' : 'bg-[var(--bg-base)] border-[var(--border)]'}`}>
                  <div className="text-[10px] text-[var(--text-muted)] mb-1">{rank}</div>
                  <div className={`text-[13px] font-semibold ${pts > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{pts}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4 border-t border-[var(--border)] mt-8 pt-8">
          <button type="submit" disabled={loading} className="btn-primary flex-1 h-12 text-sm font-semibold">
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
          <Link href="/tournaments" className="btn-ghost flex-1 h-12 text-sm font-semibold flex items-center justify-center">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
