'use client';

import { useEffect, useMemo, useState } from 'react';

/* ── Types ────────────────────────────────────────── */
interface CloudInfo {
  bound: boolean;
  cloud_url: string | null;
  org: { id: string; name: string } | null;
  tournament: { id: string; name: string } | null;
  match_id: string | null;
  roster_source: string | null;
}

interface TournamentTeam {
  id: string;
  name: string;
  short_name: string;
  brand_color: string;
  logo_url: string | null;
}

interface TournamentMatch {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  map: string | null;
}

interface TournamentStage {
  id: string;
  name: string;
  stage_type: string;
  matches: TournamentMatch[];
}

interface PlayerStat {
  player_open_id: string;
  total_kills: number;
  total_damage: number;
  matches_played: number;
  player?: { display_name: string };
  team?: { name: string; short_name: string };
}

interface SyncResult {
  ok: boolean;
  roster_path?: string;
  ini_path?: string;
  logo_dir?: string;
  downloaded?: number;
  errors?: string[];
  teams?: number;
  error?: string;
}

/* ── Component ────────────────────────────────────── */
export default function CloudDetailPage() {
  const [cloud, setCloud] = useState<CloudInfo | null>(null);
  const [data, setData] = useState<{ stages: TournamentStage[]; teams: TournamentTeam[]; playerStats: PlayerStat[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'teams' | 'schedule' | 'players'>('overview');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  async function loadCloud() {
    try {
      const res = await fetch('/api/cloud');
      const d = await res.json();
      if (d?.ok || d?.bound) setCloud(d);
    } catch {}
  }

  async function loadTournament() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cloud/tournament');
      const d = await res.json();
      if (d.ok) setData(d.data);
      else setError(d.error || 'Failed to load');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    await fetch('/api/cloud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    });
    setCloud(null);
    setData(null);
    setSyncResult(null);
  }

  async function syncExport() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/cloud/sync-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d: SyncResult = await res.json();
      setSyncResult(d);
    } catch {
      setSyncResult({ ok: false, error: 'Network error — is the server running?' });
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadCloud();
    loadTournament();
  }, []);

  const stages = data?.stages ?? [];
  const teams = data?.teams ?? [];
  const matches = useMemo(() => stages.flatMap(s => s.matches), [stages]);
  const players = data?.playerStats ?? [];
  const topPlayers = [...players].sort((a, b) => b.total_kills - a.total_kills).slice(0, 10);

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'teams' as const, label: `Teams (${teams.length})` },
    { key: 'schedule' as const, label: `Schedule (${matches.length})` },
    { key: 'players' as const, label: `Players (${players.length})` },
  ];

  const statusColor = cloud?.bound ? 'var(--green)' : 'var(--text-faint)';

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Cloud</h1>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
            {cloud?.bound ? 'Connected to cloud platform' : 'Not connected'}
          </div>
        </div>
        <div className="flex gap-8">
          <button className="btn" onClick={() => { loadCloud(); loadTournament(); }} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          {cloud?.bound && (
            <button className="btn btn-red" onClick={disconnect}>Disconnect</button>
          )}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────── */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius)', background: 'var(--red-soft)', border: '1px solid rgba(239,68,68,0.1)', fontSize: 12, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {/* ── Connection card ─────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-10">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Connection</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: cloud?.bound ? 'var(--green-soft)' : 'var(--bg-hover)', color: cloud?.bound ? 'var(--green)' : 'var(--text-faint)' }}>
            {cloud?.bound ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Organization', value: cloud?.org?.name || '—' },
            { label: 'Tournament', value: cloud?.tournament?.name || '—' },
            { label: 'Cloud URL', value: cloud?.cloud_url ? new URL(cloud.cloud_url).hostname : '—', mono: true },
            { label: 'Roster Source', value: cloud?.roster_source || '—' },
          ].map((item, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: item.mono ? 'var(--mono)' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Metric cards ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Teams', value: teams.length, color: 'var(--accent)', sub: 'registered' },
          { label: 'Stages', value: stages.length, color: 'var(--purple)', sub: 'configured' },
          { label: 'Matches', value: matches.length, color: 'var(--cyan)', sub: 'scheduled' },
          { label: 'Players', value: players.length, color: 'var(--amber)', sub: 'tracked' },
        ].map((s, i) => (
          <div key={i} className="metric-card">
            <div className="metric-label">{s.label}</div>
            <div className="metric-value" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Sync & Export ─────────────────────────── */}
      {cloud?.bound && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="flex items-center gap-10">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--accent)' }}>
                <path d="M8 1v10M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Sync & Export</span>
            </div>
            <button
              className="btn btn-accent"
              onClick={syncExport}
              disabled={syncing}
              style={{ fontSize: 12, padding: '6px 16px' }}
            >
              {syncing ? (
                <span className="flex items-center gap-6">
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="20 12" />
                  </svg>
                  Syncing...
                </span>
              ) : 'Sync Logos & Generate Files'}
            </button>
          </div>
          <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Downloads team logos from cloud, generates <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 11 }}>TeamLogoAndColor.ini</span> and <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 11 }}>roster_mapping.json</span> to <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 11 }}>C:/logo</span>
          </div>

          {/* Sync result */}
          {syncResult && (
            <div style={{ padding: '0 20px 16px' }}>
              {syncResult.ok ? (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius)', background: 'var(--green-soft)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <div className="flex items-center gap-8" style={{ marginBottom: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--green)' }}>
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4.5 7l1.8 1.8L9.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Export complete</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 11 }}>
                    <div>
                      <div style={{ color: 'var(--text-faint)', marginBottom: 2 }}>Logos downloaded</div>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{syncResult.downloaded}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-faint)', marginBottom: 2 }}>Teams</div>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{syncResult.teams}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-faint)', marginBottom: 2 }}>Output</div>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 10 }}>{syncResult.logo_dir}</div>
                    </div>
                  </div>
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius)', background: 'rgba(251,191,36,0.08)', fontSize: 11, color: 'var(--amber)' }}>
                      {syncResult.errors.length} warning{syncResult.errors.length > 1 ? 's' : ''}: {syncResult.errors.join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius)', background: 'var(--red-soft)', border: '1px solid rgba(239,68,68,0.1)', fontSize: 12, color: 'var(--red)' }}>
                  {syncResult.error || 'Sync failed'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none', fontFamily: 'var(--sans)',
              color: tab === t.key ? 'var(--text)' : 'var(--text-faint)',
              borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
              transition: 'all 150ms ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ───────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Top players */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Top Players</span>
            </div>
            {topPlayers.length > 0 ? topPlayers.map((p, i) => (
              <div key={p.player_open_id} style={{
                padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: i < topPlayers.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <div className="flex items-center gap-10">
                  <span style={{ fontSize: 11, fontWeight: 900, color: i < 3 ? 'var(--accent)' : 'var(--text-muted)', width: 18 }}>{i + 1}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{p.player?.display_name || p.player_open_id}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.team?.short_name || p.team?.name || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-16" style={{ fontSize: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--red)' }}>{p.total_kills}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>kills</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{p.total_damage}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>dmg</div>
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--text-faint)' }}>No player data yet</div>
            )}
          </div>

          {/* Recent matches */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Matches</span>
            </div>
            {matches.length > 0 ? matches.slice(0, 10).map((m, i) => (
              <div key={m.id} style={{
                padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: i < Math.min(matches.length, 10) - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{m.map || 'TBD'}</div>
                </div>
                <div className="flex items-center gap-10">
                  {m.scheduled_at && (
                    <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
                      {new Date(m.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase',
                    background: m.status === 'live' ? 'var(--red-soft)' : m.status === 'finished' ? 'var(--green-soft)' : 'var(--bg-hover)',
                    color: m.status === 'live' ? 'var(--red)' : m.status === 'finished' ? 'var(--green)' : 'var(--text-faint)',
                  }}>{m.status}</span>
                </div>
              </div>
            )) : (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--text-faint)' }}>No matches scheduled</div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Teams ──────────────────────────────── */}
      {tab === 'teams' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-header" style={{ gridTemplateColumns: '40px 1fr 100px 90px' }}>
            <span>#</span><span>Team</span><span>Short Name</span><span style={{ textAlign: 'right' }}>Color</span>
          </div>
          {teams.length > 0 ? teams.map((t, i) => (
            <div key={t.id} className="table-row" style={{ gridTemplateColumns: '40px 1fr 100px 90px' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)' }}>{i + 1}</span>
              <div className="flex items-center gap-10">
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: `${t.brand_color}12`, border: `1px solid ${t.brand_color}18`,
                  display: 'grid', placeItems: 'center',
                }}>
                  {t.logo_url ? (
                    <img src={t.logo_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 900, color: t.brand_color }}>{t.name.charAt(0)}</span>
                  )}
                </div>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{t.short_name || '—'}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: t.brand_color, border: '1px solid var(--border)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>{t.brand_color}</span>
              </div>
            </div>
          )) : (
            <div style={{ padding: 20, fontSize: 12, color: 'var(--text-faint)' }}>No teams</div>
          )}
        </div>
      )}

      {/* ── Tab: Schedule ───────────────────────────── */}
      {tab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stages.length > 0 ? stages.map(s => (
            <div key={s.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'var(--purple-soft)', color: 'var(--purple)' }}>{s.stage_type}</span>
              </div>
              {s.matches.length > 0 ? (
                <>
                  <div className="table-header" style={{ gridTemplateColumns: '1fr 100px 140px 80px' }}>
                    <span>Match</span><span>Map</span><span style={{ textAlign: 'right' }}>Scheduled</span><span style={{ textAlign: 'right' }}>Status</span>
                  </div>
                  {s.matches.map(m => (
                    <div key={m.id} className="table-row" style={{ gridTemplateColumns: '1fr 100px 140px 80px' }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{m.map || '—'}</span>
                      <span style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
                        {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase',
                          background: m.status === 'live' ? 'var(--red-soft)' : m.status === 'finished' ? 'var(--green-soft)' : 'var(--bg-hover)',
                          color: m.status === 'live' ? 'var(--red)' : m.status === 'finished' ? 'var(--green)' : 'var(--text-faint)',
                        }}>{m.status}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ padding: 20, fontSize: 12, color: 'var(--text-faint)' }}>No matches in this stage</div>
              )}
            </div>
          )) : (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)', fontSize: 12 }}>No stages configured</div>
          )}
        </div>
      )}

      {/* ── Tab: Players ────────────────────────────── */}
      {tab === 'players' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-header" style={{ gridTemplateColumns: '40px 1fr 120px 80px 80px 80px' }}>
            <span>#</span><span>Player</span><span>Team</span><span style={{ textAlign: 'right' }}>Kills</span><span style={{ textAlign: 'right' }}>Damage</span><span style={{ textAlign: 'right' }}>Matches</span>
          </div>
          {players.length > 0 ? [...players].sort((a, b) => b.total_kills - a.total_kills).map((p, i) => (
            <div key={p.player_open_id} className="table-row" style={{ gridTemplateColumns: '40px 1fr 120px 80px 80px 80px' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: i < 3 ? 'var(--accent)' : 'var(--text-muted)' }}>{i + 1}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{p.player?.display_name || p.player_open_id}</span>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{p.team?.short_name || p.team?.name || '—'}</span>
              <span style={{ textAlign: 'right', fontWeight: 800, color: 'var(--red)' }}>{p.total_kills}</span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>{p.total_damage}</span>
              <span style={{ textAlign: 'right', color: 'var(--text-dim)' }}>{p.matches_played}</span>
            </div>
          )) : (
            <div style={{ padding: 20, fontSize: 12, color: 'var(--text-faint)' }}>No player data yet</div>
          )}
        </div>
      )}
    </div>
  );
}
