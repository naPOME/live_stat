"use client";

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTeamPlayers, useAddPlayer, useDeletePlayer, useUpdateTeam } from '@/lib/hooks/use-teams';
import type { Team, Player } from '@/lib/types';
import { PlayerAvatar } from '@/components/Avatar';

type TeamDetailClientProps = {
  teamId: string;
  initialTeam: Team;
  initialPlayers: Player[];
};

export default function TeamDetailClient({ teamId, initialTeam, initialPlayers }: TeamDetailClientProps) {
  const supabase = createClient();

  const [team, setTeam] = useState<Team>(initialTeam);
  const { data: players = [] } = useTeamPlayers(teamId, initialPlayers);
  const addPlayerMutation = useAddPlayer(teamId);
  const deletePlayerMutation = useDeletePlayer(teamId);
  const updateTeamMutation = useUpdateTeam(teamId);

  const [addingPlayer, setAddingPlayer] = useState(false);
  const [playerForm, setPlayerForm] = useState({ display_name: '', player_open_id: '' });
  const [editTeam, setEditTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: initialTeam.name, short_name: initialTeam.short_name ?? '' });
  const [logoImgError, setLogoImgError] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [playerPhotoUploading, setPlayerPhotoUploading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!playerForm.display_name.trim() || !playerForm.player_open_id.trim()) return;
    addPlayerMutation.mutate(
      { display_name: playerForm.display_name.trim(), player_open_id: playerForm.player_open_id.trim() },
      {
        onSuccess: () => { setPlayerForm({ display_name: '', player_open_id: '' }); setAddingPlayer(false); showToast('Player added'); },
        onError: (err) => showToast(err.message, 'error'),
      },
    );
  }

  function deletePlayer(playerId: string) {
    const player = players.find(p => p.id === playerId);
    setConfirmDialog({
      title: 'Remove Player',
      message: `Remove "${player?.display_name ?? 'this player'}" from the team?`,
      onConfirm: () => {
        setConfirmDialog(null);
        deletePlayerMutation.mutate(playerId, {
          onSuccess: () => showToast('Player removed'),
          onError: (err) => showToast(err.message, 'error'),
        });
      },
    });
  }

  async function saveTeam(e: React.FormEvent) {
    e.preventDefault();
    const updates = { name: teamForm.name.trim(), short_name: teamForm.short_name.trim() || null };
    const prevTeam = team;
    setTeam((t) => ({ ...t, ...updates }));
    setEditTeam(false);
    updateTeamMutation.mutate(updates, {
      onSuccess: () => showToast('Team updated'),
      onError: (err) => {
        setTeam(prevTeam);
        setTeamForm({ name: prevTeam.name, short_name: prevTeam.short_name ?? '' });
        showToast(err.message, 'error');
      },
    });
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const prevUrl = team.logo_url;
    const localPreview = URL.createObjectURL(file);
    setTeam((t) => ({ ...t, logo_url: localPreview }));
    const ext = file.name.split('.').pop();
    const path = `teams/${teamId}/logo.${ext}`;
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      const { error: updateError } = await supabase.from('teams').update({ logo_url: publicUrl }).eq('id', teamId);
      if (!updateError) {
        URL.revokeObjectURL(localPreview);
        setLogoImgError(false);
        setTeam((t) => ({ ...t, logo_url: `${publicUrl}?t=${Date.now()}` }));
        showToast('Logo updated');
      } else { setTeam((t) => ({ ...t, logo_url: prevUrl })); showToast(updateError.message, 'error'); }
    } else { setTeam((t) => ({ ...t, logo_url: prevUrl })); showToast(error.message, 'error'); }
    setLogoUploading(false);
  }

  async function uploadPlayerPhoto(playerId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlayerPhotoUploading(playerId);
    const ext = file.name.split('.').pop();
    const path = `players/${playerId}/photo.${ext}`;
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      const { error: updateError } = await supabase.from('players').update({ photo_url: publicUrl }).eq('id', playerId);
      if (!updateError) showToast('Photo updated');
      else showToast(updateError.message, 'error');
    } else showToast(error.message, 'error');
    setPlayerPhotoUploading(null);
  }

  return (
    <div className="max-w-[1000px] page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/teams" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Teams</Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--text-muted)] opacity-40"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span className="text-[var(--text-primary)] font-medium">{team.name}</span>
      </div>

      {/* ─── Team Banner ─── */}
      <div className="relative rounded-2xl overflow-hidden mb-8" style={{ background: `linear-gradient(135deg, ${'#2F6B3F'}12 0%, var(--bg-surface) 50%, ${'#2F6B3F'}08 100%)` }}>
        {/* Subtle brand color accent line at top */}
        <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${'#2F6B3F'}60, transparent)` }} />

        <div className="px-8 py-8">
          {editTeam ? (
            /* ── Edit mode ── */
            <form onSubmit={saveTeam} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Team Name *</label>
                  <input autoFocus type="text" value={teamForm.name}
                    onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                    required className="input-premium" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Tag</label>
                  <input type="text" value={teamForm.short_name}
                    onChange={(e) => setTeamForm((f) => ({ ...f, short_name: e.target.value.toUpperCase().slice(0, 5) }))}
                    placeholder="SEN" className="input-premium uppercase" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" onClick={() => setEditTeam(false)} className="btn-ghost">Cancel</button>
              </div>
            </form>
          ) : (
            /* ── Display mode — Banner layout ── */
            <div className="flex items-center gap-6">
              {/* Logo */}
              <div className="relative group/logo flex-shrink-0">
                {team.logo_url && !logoImgError ? (
                  <img src={team.logo_url} alt={team.name}
                    className="w-20 h-20 rounded-2xl object-cover border border-[var(--border)]"
                    onError={() => setLogoImgError(true)} />
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black border"
                    style={{ backgroundColor: '#2F6B3F' + '18', borderColor: '#2F6B3F' + '30', color: '#2F6B3F' }}>
                    {(team.short_name ?? team.name).substring(0, 2).toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-xs text-white font-medium">{logoUploading ? '...' : 'Upload'}</span>
                  <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                </label>
              </div>

              {/* Team info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-display font-black uppercase tracking-wide text-[var(--text-primary)]">{team.name}</h1>
                  {team.short_name && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md border"
                      style={{ color: '#2F6B3F', borderColor: '#2F6B3F' + '40', backgroundColor: '#2F6B3F' + '10' }}>
                      {team.short_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    <span>{players.length} player{players.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setEditTeam(true)}
                  className="text-xs font-medium px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors">
                  Edit Team
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Meet the Roster ─── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Meet the Roster</h2>
            <div className="h-px flex-1 bg-[var(--border)] min-w-[40px]" />
          </div>
          <button onClick={() => setAddingPlayer(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent-border)] transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add Player
          </button>
        </div>

        {/* Add player form — inline, not a modal */}
        {addingPlayer && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 mb-5 animate-fade-in">
            <form onSubmit={handleAddPlayer} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Display Name</label>
                <input autoFocus type="text" value={playerForm.display_name}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="e.g. SnipeKing" required className="input-premium" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                  Character ID <span className="normal-case tracking-normal font-normal text-[var(--text-muted)]">(exact match)</span>
                </label>
                <input type="text" value={playerForm.player_open_id}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, player_open_id: e.target.value.trim() }))}
                  placeholder="Paste exact ID" required className="input-premium font-mono" />
              </div>
              <button type="submit" disabled={addPlayerMutation.isPending} className="btn-primary py-[9px]">
                {addPlayerMutation.isPending ? '...' : 'Add'}
              </button>
              <button type="button" onClick={() => setAddingPlayer(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-2 transition-colors">&times;</button>
            </form>
          </div>
        )}

        {/* Player cards grid */}
        {players.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {players.map((player) => (
              <div key={player.id}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] transition-all">
                {/* Card content */}
                <div className="p-5 flex flex-col items-center text-center">
                  {/* Player portrait */}
                  <div className="relative group/photo mb-4">
                    <PlayerAvatar
                      name={player.display_name}
                      logoUrl={player.photo_url}
                      brandColor={'#2F6B3F'}
                      px={72}
                      className="rounded-xl"
                    />
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover/photo:opacity-100 transition-opacity cursor-pointer">
                      {playerPhotoUploading === player.id ? (
                        <span className="text-[9px] text-white font-medium">...</span>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      )}
                      <input type="file" accept="image/*" onChange={(e) => uploadPlayerPhoto(player.id, e)} className="hidden" />
                    </label>
                  </div>

                  {/* Name */}
                  <div className="text-sm font-bold text-[var(--text-primary)] mb-0.5">{player.display_name}</div>

                  {/* In-game ID */}
                  <div className="text-[10px] font-mono text-[var(--text-muted)] mb-4 truncate max-w-full px-2">{player.player_open_id}</div>

                  {/* Stats row */}
                  <div className="flex items-center justify-center gap-5 w-full">
                    <div className="text-center">
                      <div className="text-[15px] font-bold text-[var(--text-primary)] tabular-nums">—</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Matches</div>
                    </div>
                    <div className="w-px h-6 bg-[var(--border)]" />
                    <div className="text-center">
                      <div className="text-[15px] font-bold text-[var(--text-primary)] tabular-nums">—</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Kills</div>
                    </div>
                    <div className="w-px h-6 bg-[var(--border)]" />
                    <div className="text-center">
                      <div className="text-[15px] font-bold text-[var(--text-primary)] tabular-nums">—</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Dmg</div>
                    </div>
                  </div>
                </div>

                {/* Remove button — top-right corner */}
                <button
                  onClick={() => deletePlayer(player.id)}
                  className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-all opacity-0 group-hover:opacity-100">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}

            {/* Add player ghost card */}
            <button
              onClick={() => setAddingPlayer(true)}
              className="rounded-2xl border border-dashed border-[var(--border)] hover:border-[var(--accent-border)] bg-transparent hover:bg-[var(--accent)]/5 transition-all flex flex-col items-center justify-center py-10 text-[var(--text-muted)] hover:text-[var(--accent)] min-h-[200px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
              <span className="text-xs font-medium">Add Player</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] py-16 text-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mx-auto mb-4 text-[var(--text-muted)] opacity-30">
              <circle cx="12" cy="10" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 28c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="22" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
            </svg>
            <div className="text-sm text-[var(--text-muted)] mb-1">No players on this roster</div>
            <div className="text-xs text-[var(--text-muted)] opacity-60 mb-5">Add players with their exact in-game IDs for live match tracking.</div>
            <button onClick={() => setAddingPlayer(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Add First Player
            </button>
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
