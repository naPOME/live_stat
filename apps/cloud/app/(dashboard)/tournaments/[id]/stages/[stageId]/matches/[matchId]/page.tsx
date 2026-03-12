'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { MatchDispute, Team } from '@/lib/types';

const SLOT_COUNT = 22;

type SlotAssignment = { teamId: string | null };

export default function MatchPage({
  params,
}: {
  params: Promise<{ id: string; stageId: string; matchId: string }>;
}) {
  const { id: tournamentId, stageId, matchId } = use(params);
  const supabase = createClient();
  const router = useRouter();

  const [match, setMatch] = useState<{ id: string; name: string; map_name: string | null; status: string; scheduled_at: string | null } | null>(null);
  const [stage, setStage] = useState<{ name: string } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [disputes, setDisputes] = useState<MatchDispute[]>([]);
  const [slots, setSlots] = useState<SlotAssignment[]>(
    Array.from({ length: SLOT_COUNT }, () => ({ teamId: null })),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [disputeTeamId, setDisputeTeamId] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidenceUrl, setDisputeEvidenceUrl] = useState('');
  const [disputeEvidenceNote, setDisputeEvidenceNote] = useState('');
  const [disputeSaving, setDisputeSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: s }, { data: ts }, { data: existingSlots }] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase.from('stages').select('name').eq('id', stageId).single(),
        supabase.from('teams').select('*').order('name'),
        supabase.from('match_slots').select('*').eq('match_id', matchId),
      ]);

      if (!m) { router.push(`/tournaments/${tournamentId}`); return; }

      setMatch(m);
      setStage(s);
      setTeams(ts ?? []);

      // Build initial slots
      const initial: SlotAssignment[] = Array.from({ length: SLOT_COUNT }, () => ({ teamId: null }));
      for (const slot of existingSlots ?? []) {
        const idx = slot.slot_number - 1;
        if (idx >= 0 && idx < SLOT_COUNT) {
          initial[idx] = { teamId: slot.team_id };
        }
      }
      setSlots(initial);
      await refreshDisputes();
      setLoading(false);
    }
    load();
  }, [matchId]);

  async function refreshDisputes() {
    const { data } = await supabase
      .from('match_disputes')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });
    setDisputes((data as MatchDispute[]) ?? []);
  }

  function setSlotTeam(slotIdx: number, teamId: string | null) {
    // Prevent same team in two slots
    if (teamId) {
      const existing = slots.findIndex((s, i) => s.teamId === teamId && i !== slotIdx);
      if (existing !== -1) {
        setSlots((prev) => {
          const next = [...prev];
          next[existing] = { teamId: null };
          next[slotIdx] = { teamId };
          return next;
        });
        return;
      }
    }
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { teamId };
      return next;
    });
  }

  async function saveRoster() {
    setSaving(true);
    setSaveMsg('');

    // Delete existing and re-insert
    await supabase.from('match_slots').delete().eq('match_id', matchId);

    const rows = slots
      .map((s, i) => ({ match_id: matchId, team_id: s.teamId!, slot_number: i + 1 }))
      .filter((r) => r.team_id);

    if (rows.length > 0) {
      const { error } = await supabase.from('match_slots').insert(rows);
      if (error) {
        setSaveMsg('Error: ' + error.message);
        setSaving(false);
        return;
      }
    }

    setSaveMsg('Roster saved!');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  const assignedCount = slots.filter((s) => s.teamId).length;
  const usedTeamIds = new Set(slots.map((s) => s.teamId).filter(Boolean));
  const assignedTeams = teams.filter((t) => usedTeamIds.has(t.id));

  async function createDispute() {
    if (!disputeReason.trim()) return;
    setDisputeSaving(true);
    const { error } = await supabase.from('match_disputes').insert({
      match_id: matchId,
      team_id: disputeTeamId || null,
      reason: disputeReason.trim(),
      evidence_url: disputeEvidenceUrl.trim() || null,
      evidence_note: disputeEvidenceNote.trim() || null,
    });
    if (error) {
      alert('Failed to create dispute: ' + error.message);
      setDisputeSaving(false);
      return;
    }
    setDisputeTeamId('');
    setDisputeReason('');
    setDisputeEvidenceUrl('');
    setDisputeEvidenceNote('');
    await refreshDisputes();
    setDisputeSaving(false);
  }

  async function updateDisputeStatus(dispute: MatchDispute, status: MatchDispute['status']) {
    const { data: { user } } = await supabase.auth.getUser();
    const updates: Partial<MatchDispute> = { status };
    if (status === 'resolved' || status === 'rejected') {
      const note = prompt('Resolution note (optional)') ?? '';
      updates.resolution_note = note.trim() || null;
      updates.resolved_by = user?.id ?? null;
      updates.resolved_at = new Date().toISOString();
    } else {
      updates.resolved_by = null;
      updates.resolved_at = null;
    }
    const { error } = await supabase.from('match_disputes').update(updates).eq('id', dispute.id);
    if (error) {
      alert('Failed to update dispute: ' + error.message);
      return;
    }
    await refreshDisputes();
  }

  async function updateSchedule(value: string) {
    const scheduled_at = value ? new Date(value).toISOString() : null;
    setMatch((m) => m ? { ...m, scheduled_at } : m);
    await supabase.from('matches').update({ scheduled_at }).eq('id', matchId);
  }

  function formatCountdown(scheduledAt: string): string | null {
    const diff = new Date(scheduledAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh]">
        <span className="loader" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1100px] page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm flex-wrap">
        <Link href="/tournaments" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Tournaments</Link>
        <span className="text-[var(--text-muted)]/50">/</span>
        <Link href={`/tournaments/${tournamentId}`} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          Tournament
        </Link>
        <span className="text-[var(--text-muted)]/50">/</span>
        <span className="text-[var(--text-secondary)]">{stage?.name}</span>
        <span className="text-[var(--text-muted)]/50">/</span>
        <span className="text-[var(--text-primary)]">{match?.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)]">{match?.name}</h1>
            {match?.map_name && (
              <span className="badge badge-muted">
                {match.map_name}
              </span>
            )}
            <span className={`badge ${
              match?.status === 'finished'
                ? 'badge-accent'
                : match?.status === 'live'
                  ? 'badge-danger'
                  : 'badge-muted'
            }`}>
              {match?.status}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm flex items-center gap-3">
            <span>{assignedCount}/{SLOT_COUNT} slots assigned</span>
            {match?.scheduled_at && new Date(match.scheduled_at).getTime() > Date.now() && (
              <>
                <span className="text-[var(--border)]">&bull;</span>
                <span className="text-[var(--accent)] font-medium">Starts in {formatCountdown(match.scheduled_at)}</span>
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className={`text-xs font-medium ${saveMsg.startsWith('Error') ? 'text-[var(--red)]' : 'text-[var(--accent)]'}`}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={saveRoster}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Roster'}
          </button>
        </div>
      </div>

      {/* Slot grid */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Lobby Slot Assignment</span>
          <button
            onClick={() => setSlots(Array.from({ length: SLOT_COUNT }, () => ({ teamId: null })))}
            className="btn-ghost btn-sm text-[var(--red)] hover:text-[var(--red)]"
          >
            Clear all
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-2">
          {slots.map((slot, idx) => {
            const slotNum = idx + 1;
            const assignedTeam = teams.find((t) => t.id === slot.teamId);

            return (
              <div
                key={idx}
                className="flex items-center gap-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl px-3 py-2.5 hover:border-[var(--border-hover)] transition-colors"
              >
                {/* Slot number */}
                <div className="w-7 h-7 flex-shrink-0 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] tabular-nums">
                    {String(slotNum).padStart(2, '0')}
                  </span>
                </div>

                {/* Color dot for assigned team */}
                {assignedTeam && (
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: assignedTeam.brand_color }}
                  />
                )}

                {/* Team select */}
                <select
                  value={slot.teamId ?? ''}
                  onChange={(e) => setSlotTeam(idx, e.target.value || null)}
                  className="select-premium flex-1 min-w-0"
                >
                  <option value="">— Empty —</option>
                  {teams.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      disabled={usedTeamIds.has(t.id) && slot.teamId !== t.id}
                    >
                      {t.name}{t.short_name ? ` (${t.short_name})` : ''}
                      {usedTeamIds.has(t.id) && slot.teamId !== t.id ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {teams.length === 0 && (
          <div className="px-5 pb-5 text-center text-[var(--text-muted)] text-sm">
            No teams yet.{' '}
            <Link href="/teams" className="text-[var(--accent)] hover:text-[var(--purple)] transition-colors">
              Add teams first →
            </Link>
          </div>
        )}
      </div>

      {/* Legend */}
      <p className="text-xs text-[var(--text-muted)] mt-3">
        Tip: Slot number maps to the in-game lobby slot. Teams marked with ✓ are already assigned to another slot.
      </p>

      {/* Schedule */}
      <div className="mt-6 surface overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Schedule</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {match?.scheduled_at
                ? new Date(match.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                : 'No date set'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="datetime-local"
              value={match?.scheduled_at ? new Date(match.scheduled_at).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateSchedule(e.target.value)}
              className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/60"
            />
            {match?.scheduled_at && (
              <button onClick={() => updateSchedule('')} className="text-xs text-[var(--red)] hover:text-[var(--text-primary)] transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disputes */}
      <div className="mt-8 surface overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Disputes</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">Track contested results and decisions</div>
          </div>
          <span className="text-[10px] font-semibold text-[var(--text-muted)]">
            {disputes.length} total
          </span>
        </div>

        <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-base)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Team (optional)
              </label>
              <select
                value={disputeTeamId}
                onChange={(e) => setDisputeTeamId(e.target.value)}
                className="select-premium w-full"
              >
                <option value="">â€” None â€”</option>
                {assignedTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Evidence URL (optional)
              </label>
              <input
                type="url"
                value={disputeEvidenceUrl}
                onChange={(e) => setDisputeEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className="input-premium"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Reason *
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={3}
                className="input-premium resize-none"
                placeholder="Explain the issue with the match result"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Evidence note (optional)
              </label>
              <textarea
                value={disputeEvidenceNote}
                onChange={(e) => setDisputeEvidenceNote(e.target.value)}
                rows={3}
                className="input-premium resize-none"
                placeholder="Short note about the evidence"
              />
            </div>
          </div>
          <div className="flex items-center justify-end mt-3">
            <button
              onClick={createDispute}
              disabled={disputeSaving || !disputeReason.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disputeSaving ? 'Creatingâ€¦' : 'Open Dispute'}
            </button>
          </div>
        </div>

        {disputes.length === 0 ? (
          <div className="px-5 py-6 text-center text-[var(--text-muted)] text-sm">
            No disputes yet.
          </div>
        ) : (
          <div>
            {disputes.map((d, i) => {
              const team = teams.find((t) => t.id === d.team_id);
              const statusClass = d.status === 'resolved'
                ? 'badge-accent'
                : d.status === 'rejected'
                  ? 'badge-danger'
                  : d.status === 'under_review'
                    ? 'badge-warning'
                    : 'badge-muted';
              return (
                <div key={d.id} className={`px-5 py-4 ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {team?.name ?? 'General dispute'}
                        </span>
                        <span className={`badge ${statusClass}`}>
                          {d.status}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        {new Date(d.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {d.status === 'open' && (
                        <button
                          onClick={() => updateDisputeStatus(d, 'under_review')}
                          className="text-xs text-[var(--accent)] hover:text-[var(--purple)] transition-colors"
                        >
                          Mark under review
                        </button>
                      )}
                      {d.status !== 'resolved' && d.status !== 'rejected' && (
                        <>
                          <button
                            onClick={() => updateDisputeStatus(d, 'resolved')}
                            className="text-xs text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => updateDisputeStatus(d, 'rejected')}
                            className="text-xs text-[var(--red)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] mt-2">{d.reason}</p>
                  {(d.evidence_url || d.evidence_note) && (
                    <div className="text-xs text-[var(--text-muted)] mt-2">
                      {d.evidence_url && (
                        <div>Evidence: {d.evidence_url}</div>
                      )}
                      {d.evidence_note && (
                        <div>Note: {d.evidence_note}</div>
                      )}
                    </div>
                  )}
                  {d.resolution_note && (
                    <div className="text-xs text-[var(--text-muted)] mt-2">
                      Resolution: {d.resolution_note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
