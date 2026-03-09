'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Team, Player } from '@/lib/types';

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = use(params);
  const supabase = createClient();
  const router = useRouter();

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [playerForm, setPlayerForm] = useState({ display_name: '', player_open_id: '' });
  const [saving, setSaving] = useState(false);
  const [editTeam, setEditTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', short_name: '', brand_color: '#ffffff' });
  const [logoUploading, setLogoUploading] = useState(false);

  async function loadData() {
    const [{ data: t }, { data: ps }] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('players').select('*').eq('team_id', teamId).order('display_name'),
    ]);
    if (!t) { router.push('/teams'); return; }
    setTeam(t);
    setTeamForm({ name: t.name, short_name: t.short_name ?? '', brand_color: t.brand_color });
    setPlayers(ps ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [teamId]);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!playerForm.display_name.trim() || !playerForm.player_open_id.trim()) return;
    setSaving(true);

    const { error } = await supabase.from('players').insert({
      team_id: teamId,
      display_name: playerForm.display_name.trim(),
      player_open_id: playerForm.player_open_id.trim(),
    });

    if (!error) {
      setPlayerForm({ display_name: '', player_open_id: '' });
      setAddingPlayer(false);
      await loadData();
    }
    setSaving(false);
  }

  async function deletePlayer(playerId: string) {
    if (!confirm('Remove this player?')) return;
    await supabase.from('players').delete().eq('id', playerId);
    await loadData();
  }

  async function saveTeam(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('teams').update({
      name: teamForm.name.trim(),
      short_name: teamForm.short_name.trim() || null,
      brand_color: teamForm.brand_color,
    }).eq('id', teamId);
    setEditTeam(false);
    await loadData();
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !team) return;
    setLogoUploading(true);

    const ext = file.name.split('.').pop();
    const path = `teams/${teamId}/logo.${ext}`;
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      await supabase.from('teams').update({ logo_url: publicUrl }).eq('id', teamId);
      await loadData();
    }
    setLogoUploading(false);
  }

  if (loading) return <div className="p-8 text-[#8b8da6]">Loading…</div>;
  if (!team) return null;

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6 text-sm">
        <Link href="/teams" className="text-[#8b8da6] hover:text-white transition-colors">Teams</Link>
        <span className="text-[#8b8da6]/40">/</span>
        <span className="text-white">{team.name}</span>
      </div>

      {/* Team card */}
      <div className="bg-[#213448] border border-white/10 rounded-2xl p-6 mb-6">
        {editTeam ? (
          <form onSubmit={saveTeam} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#8b8da6] mb-1">Team Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8b8da6] mb-1">Short Name</label>
                <input
                  type="text"
                  value={teamForm.short_name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, short_name: e.target.value.toUpperCase().slice(0, 5) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8b8da6] mb-1">Brand Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={teamForm.brand_color} onChange={(e) => setTeamForm((f) => ({ ...f, brand_color: e.target.value }))} className="w-10 h-9 rounded cursor-pointer" />
                  <span className="text-sm font-mono text-[#8b8da6]">{teamForm.brand_color}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Save</button>
              <button type="button" onClick={() => setEditTeam(false)} className="text-[#8b8da6] hover:text-white text-sm px-4 py-2 rounded-lg border border-white/10 transition-colors">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="relative group/logo">
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold"
                    style={{ backgroundColor: team.brand_color + '22', border: `1.5px solid ${team.brand_color}44` }}
                  >
                    <span style={{ color: team.brand_color }}>
                      {(team.short_name ?? team.name).substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer text-xs text-white font-medium">
                  {logoUploading ? '…' : 'Upload'}
                  <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-white">{team.name}</h1>
                  {team.short_name && (
                    <span className="text-xs text-[#8b8da6] bg-white/5 px-2 py-0.5 rounded">{team.short_name}</span>
                  )}
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.brand_color, boxShadow: `0 0 6px ${team.brand_color}88` }} />
                </div>
                <div className="text-sm text-[#8b8da6]">{players.length} player{players.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <button onClick={() => setEditTeam(true)} className="text-xs text-[#8b8da6] hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Players */}
      <div className="bg-[#213448] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <span className="text-sm font-semibold text-white">Players & IDs</span>
          <button
            onClick={() => setAddingPlayer(true)}
            className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors"
          >
            + Add Player
          </button>
        </div>

        {/* Add player form */}
        {addingPlayer && (
          <form onSubmit={addPlayer} className="border-b border-white/5 px-5 py-4 bg-black/10 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[#8b8da6] mb-1">Display Name</label>
              <input
                autoFocus
                type="text"
                value={playerForm.display_name}
                onChange={(e) => setPlayerForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. SnipeKing"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[#8b8da6] mb-1">
                playerOpenId{' '}
                <span className="text-[#00ffc3] font-semibold">(exact in-game ID)</span>
              </label>
              <input
                type="text"
                value={playerForm.player_open_id}
                onChange={(e) => setPlayerForm((f) => ({ ...f, player_open_id: e.target.value.trim() }))}
                placeholder="Paste exact character ID"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
              />
            </div>
            <button type="submit" disabled={saving} className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {saving ? '…' : 'Add'}
            </button>
            <button type="button" onClick={() => setAddingPlayer(false)} className="text-[#8b8da6] hover:text-white text-sm px-2 transition-colors">✕</button>
          </form>
        )}

        {/* Player list */}
        {players.length > 0 ? (
          <div>
            {players.map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors group ${
                  i > 0 ? 'border-t border-white/5' : ''
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-white">{player.display_name}</div>
                  <div className="text-xs font-mono text-[#8b8da6] mt-0.5">{player.player_open_id}</div>
                </div>
                <button
                  onClick={() => deletePlayer(player.id)}
                  className="text-xs text-[#8b8da6] hover:text-[#ff4e4e] transition-colors opacity-0 group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-[#8b8da6] text-sm">
            No players yet. Add their in-game character IDs to enable ID matching.
          </div>
        )}
      </div>
    </div>
  );
}
