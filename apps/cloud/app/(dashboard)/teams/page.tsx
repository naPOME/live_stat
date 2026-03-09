'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Team } from '@/lib/types';

export default function TeamsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasTournaments, setHasTournaments] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', short_name: '', brand_color: '#00ffc3' });
  const [saving, setSaving] = useState(false);

  async function loadTeams() {
    const [{ data: teamsData }, { count }] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    setTeams(teamsData ?? []);
    setHasTournaments((count ?? 0) > 0);
    setLoading(false);
  }

  useEffect(() => { loadTeams(); }, []);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
    if (!profile?.org_id) { setSaving(false); return; }

    const { error } = await supabase.from('teams').insert({
      org_id: profile.org_id,
      name: form.name.trim(),
      short_name: form.short_name.trim() || null,
      brand_color: form.brand_color,
    });

    if (!error) {
      setForm({ name: '', short_name: '', brand_color: '#00ffc3' });
      setAdding(false);
      await loadTeams();
    }
    setSaving(false);
  }

  async function deleteTeam(teamId: string) {
    if (!confirm('Delete this team? This will remove all their player IDs too.')) return;
    await supabase.from('teams').delete().eq('id', teamId);
    await loadTeams();
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams</h1>
          <p className="text-[#8b8da6] text-sm mt-1">{teams.length} team{teams.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          + New Team
        </button>
      </div>

      {/* No tournament warning */}
      {!loading && !hasTournaments && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-amber-400 flex-shrink-0">
              <path d="M9 2L16 15H2L9 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M9 8v3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="9" cy="13.5" r="0.75" fill="currentColor"/>
            </svg>
            <span className="text-amber-300 text-sm">
              Create a tournament first — teams are assigned to matches within a tournament.
            </span>
          </div>
          <Link
            href="/tournaments/new"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/40 hover:border-amber-400/60 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-4"
          >
            + New Tournament
          </Link>
        </div>
      )}

      {/* New team form */}
      {adding && (
        <form
          onSubmit={createTeam}
          className="bg-[#213448] border border-[#00ffc3]/30 rounded-2xl p-5 mb-4 space-y-4"
        >
          <div className="text-sm font-semibold text-white mb-1">New Team</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs text-[#8b8da6] mb-1">Team Name *</label>
              <input
                autoFocus
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Team Alpha"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8b8da6] mb-1">Short Name</label>
              <input
                type="text"
                value={form.short_name}
                onChange={(e) => setForm((f) => ({ ...f, short_name: e.target.value.toUpperCase().slice(0, 5) }))}
                placeholder="ALPH"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8b8da6] mb-1">Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.brand_color}
                  onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                  className="w-10 h-9 rounded-lg cursor-pointer"
                />
                <span className="text-sm font-mono text-[#8b8da6]">{form.brand_color}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Creating…' : 'Create Team'}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-[#8b8da6] hover:text-white text-sm px-4 py-2 rounded-lg border border-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Teams grid */}
      {loading ? (
        <div className="text-[#8b8da6] text-sm">Loading…</div>
      ) : teams.length === 0 ? (
        <div className="bg-[#213448] border border-dashed border-white/10 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-white font-semibold text-lg mb-2">No teams yet</h3>
          <p className="text-[#8b8da6] text-sm mb-6">Add teams and link player IDs before assigning match rosters.</p>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            + New Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-[#213448] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Logo placeholder or color dot */}
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="w-10 h-10 rounded-lg object-cover bg-white/5"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: team.brand_color + '33', border: `1.5px solid ${team.brand_color}44` }}
                    >
                      <span style={{ color: team.brand_color }}>
                        {(team.short_name ?? team.name).substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-white">{team.name}</div>
                    {team.short_name && (
                      <div className="text-xs text-[#8b8da6]">{team.short_name}</div>
                    )}
                  </div>
                </div>
                <div
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: team.brand_color, boxShadow: `0 0 8px ${team.brand_color}66` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <Link
                  href={`/teams/${team.id}`}
                  className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors"
                >
                  Manage players →
                </Link>
                <button
                  onClick={() => deleteTeam(team.id)}
                  className="text-xs text-[#8b8da6] hover:text-[#ff4e4e] transition-colors opacity-0 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
