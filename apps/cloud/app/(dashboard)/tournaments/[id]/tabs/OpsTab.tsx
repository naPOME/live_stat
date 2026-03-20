'use client';

import { useTournament } from '../_context';

export default function OpsTab() {
  const { stages, flags, disputes, totalMatches, exportTournament, exportInclude, setExportInclude } = useTournament();

  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'under_review');

  return (
    <div className="space-y-4 animate-fade-in pb-32">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Stages', value: stages.length, color: 'var(--accent)' },
          { label: 'Matches', value: totalMatches, color: 'var(--text-primary)' },
          { label: 'Flags', value: flags.length, color: flags.length > 0 ? 'var(--red)' : 'var(--text-muted)' },
          { label: 'Open Disputes', value: openDisputes.length, color: openDisputes.length > 0 ? 'var(--amber)' : 'var(--text-muted)' },
        ].map((stat) => (
          <div key={stat.label} className="surface p-4">
            <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Backup / Export */}
      <div className="surface p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Backup & Export</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Export tournament data as a ZIP of JSON files</div>
          </div>
          <button onClick={exportTournament} className="btn-primary py-2 px-4 text-sm">Export ZIP</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(exportInclude).map(([key, enabled]) => (
            <label key={key} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <input type="checkbox" checked={enabled}
                onChange={(e) => setExportInclude((prev) => ({ ...prev, [key]: e.target.checked }))}
                className="accent-[var(--accent)]" />
              {key}
            </label>
          ))}
        </div>
      </div>

      {/* Recent Flags */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="text-sm font-semibold text-[var(--text-primary)]">Recent Flags</div>
        </div>
        {flags.length === 0 ? (
          <div className="px-5 py-6 text-center text-[var(--text-muted)] text-sm">No flags found.</div>
        ) : (
          flags.slice(0, 8).map((f, i) => (
            <div key={f.id} className={`px-5 py-3 ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}>
              <div className="text-xs text-[var(--red)] font-semibold">{f.code}</div>
              <div className="text-sm text-[var(--text-primary)]">{f.message}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(f.created_at).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      {/* Open Disputes */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="text-sm font-semibold text-[var(--text-primary)]">Open Disputes</div>
        </div>
        {openDisputes.length === 0 ? (
          <div className="px-5 py-6 text-center text-[var(--text-muted)] text-sm">No open disputes.</div>
        ) : (
          openDisputes.slice(0, 8).map((d, i) => (
            <div key={d.id} className={`px-5 py-3 ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}>
              <div className="text-xs text-[var(--amber)] font-semibold uppercase">{d.status.replace('_', ' ')}</div>
              <div className="text-sm text-[var(--text-primary)]">{d.reason}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(d.created_at).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
