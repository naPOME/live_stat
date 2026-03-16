'use client';

import { useEffect, useMemo, useState } from 'react';

export default function CloudDetailPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cloud/tournament');
      const d = await res.json();
      if (d.ok) setData(d.data);
      else setError(d.error || 'Failed to load cloud data');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stages = data?.stages ?? [];
  const teams = data?.teams ?? [];
  const matches = useMemo(() => stages.flatMap((s: any) => s.matches ?? []), [stages]);
  const players = data?.playerStats ?? [];

  return (
    <div className="page">
      <header className="topbar">
        <div className="flex items-center gap-8">
          <div className="topbar-brand">
            <div className="topbar-logo">LS</div>
            <div>
              <div className="topbar-title">Cloud Detail</div>
              <div className="topbar-sub">Local Engine</div>
            </div>
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn" onClick={load} disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        {error && (
          <div className="card" style={{ borderColor: 'rgba(255,78,78,0.25)' }}>
            <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>
          </div>
        )}

        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Teams', value: teams.length, sub: 'linked' },
            { label: 'Stages', value: stages.length, sub: 'configured' },
            { label: 'Matches', value: matches.length, sub: 'scheduled' },
            { label: 'Players', value: players.length, sub: 'tracked' },
          ].map((s, i) => (
            <div key={i} className="stat-box">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card">
            <div className="section-label">Teams</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {teams.map((t: any) => (
                <div key={t.id} className="table-row" style={{ gridTemplateColumns: '1fr 90px 60px' }}>
                  <span style={{ fontWeight: 700 }}>{t.name}</span>
                  <span className="mono" style={{ textAlign: 'right' }}>{t.short_name || '—'}</span>
                  <span style={{ textAlign: 'right', color: 'var(--text-faint)' }}>{t.brand_color}</span>
                </div>
              ))}
              {teams.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>No teams</div>}
            </div>
          </div>

          <div className="card">
            <div className="section-label">Stages & Matches</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {stages.map((s: any) => (
                <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                  <div className="flex items-center" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{s.stage_type}</div>
                  </div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {(s.matches ?? []).map((m: any) => (
                      <div key={m.id} className="table-row" style={{ gridTemplateColumns: '1fr 90px 90px' }}>
                        <span>{m.name}</span>
                        <span style={{ textAlign: 'center', color: 'var(--text-faint)' }}>{m.status}</span>
                        <span className="mono" style={{ textAlign: 'right' }}>{m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : '—'}</span>
                      </div>
                    ))}
                    {(s.matches ?? []).length === 0 && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>No matches</div>}
                  </div>
                </div>
              ))}
              {stages.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>No stages</div>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-label">Players</div>
          <div className="table-header" style={{ gridTemplateColumns: '1fr 120px 120px 80px 80px' }}>
            <span>Player</span>
            <span style={{ textAlign: 'right' }}>Team</span>
            <span style={{ textAlign: 'right' }}>Kills</span>
            <span style={{ textAlign: 'right' }}>Damage</span>
            <span style={{ textAlign: 'right' }}>Matches</span>
          </div>
          {(players ?? []).map((p: any) => (
            <div key={p.player_open_id} className="table-row" style={{ gridTemplateColumns: '1fr 120px 120px 80px 80px' }}>
              <span style={{ fontWeight: 700 }}>{p.player?.display_name || p.player_open_id}</span>
              <span style={{ textAlign: 'right', color: 'var(--text-faint)' }}>{p.team?.short_name || p.team?.name || '—'}</span>
              <span style={{ textAlign: 'right' }}>{p.total_kills}</span>
              <span style={{ textAlign: 'right' }}>{p.total_damage}</span>
              <span style={{ textAlign: 'right' }}>{p.matches_played}</span>
            </div>
          ))}
          {players.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-faint)', paddingTop: 10 }}>No players</div>}
        </div>
      </div>
    </div>
  );
}
