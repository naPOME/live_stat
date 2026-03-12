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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

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

  function deletePlayer(playerId: string) {
    const player = players.find(p => p.id === playerId);
    setConfirmDialog({
      title: 'Remove Player',
      message: `Remove "${player?.display_name ?? 'this player'}" from the team?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        await supabase.from('players').delete().eq('id', playerId);
        showToast('Player removed');
        await loadData();
      },
    });
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

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh]">
        <span className="loader" aria-label="Loading" />
      </div>
    );
  }
  if (!team) return null;

  return (
    <div className="p-10 max-w-[900px] page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6 text-sm">
        <Link href="/teams" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Teams</Link>
        <span className="text-[var(--text-muted)]/50">/</span>
        <span className="text-[var(--text-primary)]">{team.name}</span>
      </div>

      {/* Team card */}
      <div className="surface p-6 mb-6">
        {editTeam ? (
          <form onSubmit={saveTeam} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="label">Team Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="input-premium"
                />
              </div>
              <div>
                <label className="label">Short Name</label>
                <input
                  type="text"
                  value={teamForm.short_name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, short_name: e.target.value.toUpperCase().slice(0, 5) }))}
                  className="input-premium uppercase"
                />
              </div>
              <div>
                <label className="label">Brand Color</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <label className="relative cursor-pointer w-10 h-10 shrink-0 block">
                      <input
                        type="color"
                        value={teamForm.brand_color}
                        onChange={(e) => setTeamForm((f) => ({ ...f, brand_color: e.target.value }))}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                      <div
                        className="w-10 h-10 rounded-lg border border-[var(--border)]"
                        style={{ backgroundColor: teamForm.brand_color }}
                      />
                    </label>
                  </div>
                  <span className="text-[13px] font-mono text-[var(--text-secondary)] uppercase">{teamForm.brand_color}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => setEditTeam(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="relative group/logo">
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="w-16 h-16 rounded-xl object-cover border border-[var(--border)]" />
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold border"
                    style={{ backgroundColor: team.brand_color + '22', borderColor: `${team.brand_color}44` }}
                  >
                    <span style={{ color: team.brand_color }}>
                      {(team.short_name ?? team.name).substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer text-xs text-white font-medium">
                  {logoUploading ? 'Uploading…' : 'Upload'}
                  <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-semibold text-[var(--text-primary)]">{team.name}</h1>
                  {team.short_name && (
                    <span className="badge badge-muted">{team.short_name}</span>
                  )}
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.brand_color }} />
                </div>
                <div className="text-sm text-[var(--text-secondary)]">{players.length} player{players.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <button onClick={() => setEditTeam(true)} className="btn-ghost btn-sm">
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Players */}
      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Players & IDs</span>
          <button onClick={() => setAddingPlayer(true)} className="btn-ghost btn-sm">
            + Add Player
          </button>
        </div>

        {/* Add player form */}
        {addingPlayer && (
          <form onSubmit={addPlayer} className="border-b border-[var(--border)] px-5 py-4 bg-[var(--bg-base)] flex items-end gap-3">
            <div className="flex-1">
              <label className="label">Display Name</label>
              <input
                autoFocus
                type="text"
                value={playerForm.display_name}
                onChange={(e) => setPlayerForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. SnipeKing"
                required
                className="input-premium"
              />
            </div>
            <div className="flex-1">
              <label className="label">
                In-Game Character ID <span className="text-[var(--text-muted)]">(must match exactly)</span>
              </label>
              <input
                type="text"
                value={playerForm.player_open_id}
                onChange={(e) => setPlayerForm((f) => ({ ...f, player_open_id: e.target.value.trim() }))}
                placeholder="Paste exact character ID"
                required
                className="input-premium font-mono"
              />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button type="button" onClick={() => setAddingPlayer(false)} className="btn-ghost btn-sm">Cancel</button>
          </form>
        )}

        {/* Player list */}
        {players.length > 0 ? (
          <div>
            {players.map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-hover)] transition-colors group ${
                  i > 0 ? 'border-t border-[var(--border)]' : ''
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{player.display_name}</div>
                  <div className="text-xs font-mono text-[var(--text-muted)] mt-0.5">{player.player_open_id}</div>
                </div>
                <button
                  onClick={() => deletePlayer(player.id)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--red)] transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-[var(--text-muted)] text-sm">
            No players yet. Add players with their exact in-game character IDs so they can be identified during live matches.
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg animate-slide-up ${
          toast.type === 'error' ? 'bg-[var(--red)] text-white' : 'bg-[var(--accent)] text-black'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="surface-elevated rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-slide-up">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDialog(null)} className="btn-ghost">Cancel</button>
              <button onClick={confirmDialog.onConfirm} className="btn-primary bg-[var(--red)] hover:bg-[var(--red)]">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
