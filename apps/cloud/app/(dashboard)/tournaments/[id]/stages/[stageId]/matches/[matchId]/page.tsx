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

  const [match, setMatch] = useState<{ id: string; name: string; map_name: string | null; status: string } | null>(null);
  const [stage, setStage] = useState<{ name: string } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [disputes, setDisputes] = useState<MatchDispute[]>([]);
  const [slots, setSlots] = useState<SlotAssignment[]>(
    Array.from({ length: SLOT_COUNT }, () => ({ teamId: null })),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  async function exportMatch() {
    setExporting(true);
    try {
      const res = await fetch(`/api/export/${matchId}`);
      if (!res.ok) {
        const err = await res.json();
        alert('Export failed: ' + (err.error ?? res.statusText));
        setExporting(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${match?.name ?? 'match'}_export.zip`.replace(/[^a-zA-Z0-9._-]/g, '_');
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export error: ' + String(e));
    }
    setExporting(false);
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-[#8b8da6]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm flex-wrap">
        <Link href="/tournaments" className="text-[#8b8da6] hover:text-white transition-colors">Tournaments</Link>
        <span className="text-[#8b8da6]/40">/</span>
        <Link href={`/tournaments/${tournamentId}`} className="text-[#8b8da6] hover:text-white transition-colors">
          Tournament
        </Link>
        <span className="text-[#8b8da6]/40">/</span>
        <span className="text-[#8b8da6]">{stage?.name}</span>
        <span className="text-[#8b8da6]/40">/</span>
        <span className="text-white">{match?.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{match?.name}</h1>
            {match?.map_name && (
              <span className="text-sm bg-white/5 border border-white/10 text-[#8b8da6] px-2.5 py-0.5 rounded-lg">
                {match.map_name}
              </span>
            )}
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              match?.status === 'finished' ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
              : match?.status === 'live' ? 'bg-[#ff4e4e]/10 text-[#ff4e4e] animate-pulse'
              : 'bg-white/5 text-[#8b8da6]'
            }`}>
              {match?.status}
            </span>
          </div>
          <p className="text-[#8b8da6] text-sm">
            {assignedCount}/{SLOT_COUNT} slots assigned
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className={`text-xs font-medium ${saveMsg.startsWith('Error') ? 'text-[#ff4e4e]' : 'text-[#00ffc3]'}`}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={saveRoster}
            disabled={saving}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Roster'}
          </button>
          <button
            onClick={exportMatch}
            disabled={exporting || assignedCount === 0}
            className="flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 disabled:cursor-not-allowed text-[#00ffc3] text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6l3 3 3-3M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {exporting ? 'Exporting…' : 'Export ZIP'}
          </button>
        </div>
      </div>

      {/* Slot grid */}
      <div className="bg-[#213448] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Lobby Slot Assignment</span>
          <button
            onClick={() => setSlots(Array.from({ length: SLOT_COUNT }, () => ({ teamId: null })))}
            className="text-xs text-[#8b8da6] hover:text-[#ff4e4e] transition-colors"
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
                className="flex items-center gap-3 bg-black/20 border border-white/5 rounded-xl px-3 py-2.5 hover:border-white/10 transition-colors"
              >
                {/* Slot number */}
                <div className="w-7 h-7 flex-shrink-0 rounded-md bg-[#213448] border border-white/10 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-[#8b8da6] tabular-nums">
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
                  className="flex-1 bg-transparent text-sm text-white focus:outline-none cursor-pointer min-w-0"
                >
                  <option value="" className="bg-[#213448] text-[#8b8da6]">— Empty —</option>
                  {teams.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      disabled={usedTeamIds.has(t.id) && slot.teamId !== t.id}
                      className={`bg-[#213448] ${usedTeamIds.has(t.id) && slot.teamId !== t.id ? 'text-[#8b8da6]' : 'text-white'}`}
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
          <div className="px-5 pb-5 text-center text-[#8b8da6] text-sm">
            No teams yet.{' '}
            <Link href="/teams" className="text-[#00ffc3] hover:text-[#8b7ffe] transition-colors">
              Add teams first →
            </Link>
          </div>
        )}
      </div>

      {/* Legend */}
      <p className="text-xs text-[#8b8da6] mt-3">
        Tip: Slot number maps to the in-game lobby slot. Teams marked with ✓ are already assigned to another slot.
      </p>

      {/* Disputes */}
      <div className="mt-8 bg-[#213448] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Disputes</div>
            <div className="text-xs text-[#8b8da6] mt-0.5">Track contested results and decisions</div>
          </div>
          <span className="text-[10px] font-semibold text-[#8b8da6]">
            {disputes.length} total
          </span>
        </div>

        <div className="px-5 py-4 border-b border-white/5 bg-black/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">
                Team (optional)
              </label>
              <select
                value={disputeTeamId}
                onChange={(e) => setDisputeTeamId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
              >
                <option value="">â€” None â€”</option>
                {assignedTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">
                Evidence URL (optional)
              </label>
              <input
                type="url"
                value={disputeEvidenceUrl}
                onChange={(e) => setDisputeEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">
                Reason *
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors resize-none"
                placeholder="Explain the issue with the match result"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">
                Evidence note (optional)
              </label>
              <textarea
                value={disputeEvidenceNote}
                onChange={(e) => setDisputeEvidenceNote(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors resize-none"
                placeholder="Short note about the evidence"
              />
            </div>
          </div>
          <div className="flex items-center justify-end mt-3">
            <button
              onClick={createDispute}
              disabled={disputeSaving || !disputeReason.trim()}
              className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 disabled:cursor-not-allowed text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {disputeSaving ? 'Creatingâ€¦' : 'Open Dispute'}
            </button>
          </div>
        </div>

        {disputes.length === 0 ? (
          <div className="px-5 py-6 text-center text-[#8b8da6] text-sm">
            No disputes yet.
          </div>
        ) : (
          <div>
            {disputes.map((d, i) => {
              const team = teams.find((t) => t.id === d.team_id);
              const statusClass = d.status === 'resolved'
                ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
                : d.status === 'rejected'
                  ? 'bg-[#ff4e4e]/10 text-[#ff4e4e]'
                  : d.status === 'under_review'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-white/10 text-[#8b8da6]';
              return (
                <div key={d.id} className={`px-5 py-4 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {team?.name ?? 'General dispute'}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>
                          {d.status}
                        </span>
                      </div>
                      <div className="text-xs text-[#8b8da6] mt-1">
                        {new Date(d.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {d.status === 'open' && (
                        <button
                          onClick={() => updateDisputeStatus(d, 'under_review')}
                          className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] transition-colors"
                        >
                          Mark under review
                        </button>
                      )}
                      {d.status !== 'resolved' && d.status !== 'rejected' && (
                        <>
                          <button
                            onClick={() => updateDisputeStatus(d, 'resolved')}
                            className="text-xs text-[#00ffc3] hover:text-white transition-colors"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => updateDisputeStatus(d, 'rejected')}
                            className="text-xs text-[#ff4e4e] hover:text-white transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-white/90 mt-2">{d.reason}</p>
                  {(d.evidence_url || d.evidence_note) && (
                    <div className="text-xs text-[#8b8da6] mt-2">
                      {d.evidence_url && (
                        <div>Evidence: {d.evidence_url}</div>
                      )}
                      {d.evidence_note && (
                        <div>Note: {d.evidence_note}</div>
                      )}
                    </div>
                  )}
                  {d.resolution_note && (
                    <div className="text-xs text-[#8b8da6] mt-2">
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
