'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_PLACEMENT_POINTS: Record<string, number> = {
  '1': 15, '2': 12, '3': 10, '4': 8, '5': 6, '6': 5, '7': 4, '8': 3,
  '9': 2, '10': 1, '11': 1, '12': 1, '13': 0, '14': 0, '15': 0, '16': 0,
  '17': 0, '18': 0, '19': 0, '20': 0, '21': 0, '22': 0,
};

const POINT_PRESETS = [
  {
    label: 'PUBG Esports (15/12/10…)',
    points: { '1':15,'2':12,'3':10,'4':8,'5':6,'6':5,'7':4,'8':3,'9':2,'10':1,'11':1,'12':1 },
    killPts: 1,
  },
  {
    label: 'Standard (10/6/5…)',
    points: { '1':10,'2':6,'3':5,'4':4,'5':3,'6':2,'7':1,'8':1 },
    killPts: 1,
  },
  {
    label: 'Kill-focused (5/3/2…)',
    points: { '1':5,'2':3,'3':2,'4':1,'5':1 },
    killPts: 2,
  },
];

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [killPoints, setKillPoints] = useState(1);
  const [placementPoints, setPlacementPoints] = useState<Record<string, number>>(DEFAULT_PLACEMENT_POINTS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function applyPreset(idx: number) {
    const p = POINT_PRESETS[idx];
    setKillPoints(p.killPts);
    setPlacementPoints({ ...DEFAULT_PLACEMENT_POINTS, ...p.points });
  }

  function setPlacement(rank: number, val: string) {
    setPlacementPoints((prev) => ({ ...prev, [String(rank)]: Number(val) || 0 }));
  }

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

    // Create default point system
    await supabase.from('point_systems').insert({
      tournament_id: tournament.id,
      name: 'Default',
      kill_points: killPoints,
      placement_points: placementPoints,
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
            placeholder="e.g. PGIS Season 4 — Grand Finals"
          />
        </div>

        {/* Point system */}
        <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-white">Point System</div>
              <div className="text-xs text-[#8b8da6] mt-0.5">Applied to all matches by default</div>
            </div>
            <div className="flex gap-2">
              {POINT_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(i)}
                  className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-[#00ffc3]/20 text-[#8b8da6] hover:text-[#00ffc3] transition-colors border border-white/10"
                >
                  {p.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">
              Kill Points
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={killPoints}
              onChange={(e) => setKillPoints(Number(e.target.value))}
              className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-2">
              Placement Points (positions 1–22)
            </label>
            <div className="grid grid-cols-11 gap-1.5">
              {Array.from({ length: 22 }, (_, i) => i + 1).map((rank) => (
                <div key={rank} className="text-center">
                  <div className="text-[9px] text-[#8b8da6] mb-0.5">#{rank}</div>
                  <input
                    type="number"
                    min={0}
                    value={placementPoints[String(rank)] ?? 0}
                    onChange={(e) => setPlacement(rank, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-1 py-1 text-white text-xs text-center focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                  />
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
