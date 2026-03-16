'use client';

import { useEffect, useState } from 'react';

interface RosterInfo {
  roster_loaded: boolean;
  roster_path?: string | null;
  roster_source?: 'file' | 'cloud' | 'none' | null;
  team_count: number;
  player_count: number;
  tournament_id?: string | null;
  match_id?: string | null;
  teams_preview?: { slot_number: number; name: string; short_name: string }[];
  has_cloud_config?: boolean;
  error?: string | null;
}

interface CloudStatus {
  bound: boolean;
  cloud_url?: string | null;
  org?: { id: string; name: string } | null;
  tournament?: { id: string; name: string } | null;
  match_id?: string | null;
}

interface GameData {
  phase?: string;
  teams: {
    teamName: string;
    displayName?: string;
    shortName?: string;
    brandColor?: string;
    kills: number;
    totalPoints: number;
    liveMemberNum: number;
    alive: boolean;
  }[];
  spotlight?: { playerName: string; teamName: string; kills: number };
}

interface SyncStatus {
  role: 'leader' | 'follower' | 'standalone';
  connected: boolean;
  matchId: string | null;
  peerCount: number;
  lastSyncAt: number | null;
  error: string | null;
  syncCode: string | null;
}

const LINKS = [
  { title: 'Widget Controller', href: '/controller', tag: 'OPERATOR', color: 'var(--red)', desc: 'Toggle overlays with hotkeys during broadcast' },
  { title: 'Overlay Gallery', href: '/overlay/gallery', tag: 'SETUP', color: 'var(--accent)', desc: 'Browse widgets, copy OBS URLs, preview' },
  { title: 'Master Overlay', href: '/overlay/master', tag: 'OBS', color: 'var(--purple)', desc: 'Single browser source for all widgets' },
  { title: 'Cloud Details', href: '/cloud', tag: 'SYNC', color: 'var(--amber)', desc: 'Full cloud data: teams, matches, players' },
];

export default function Dashboard() {
  const [roster, setRoster] = useState<RosterInfo | null>(null);
  const [game, setGame] = useState<GameData | null>(null);
  const [widgets, setWidgets] = useState<Record<string, boolean>>({});
  const [rosterMsg, setRosterMsg] = useState('');
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  const [cloudUrl, setCloudUrl] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<'idle' | 'waiting' | 'approved' | 'expired'>('idle');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudErr, setCloudErr] = useState('');
  const [tournaments, setTournaments] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [cloudDetail, setCloudDetail] = useState<any>(null);
  const [cloudDetailErr, setCloudDetailErr] = useState('');
  const [cloudDetailLoading, setCloudDetailLoading] = useState(false);

  const [sync, setSync] = useState<SyncStatus>({ role: 'standalone', connected: false, matchId: null, peerCount: 0, lastSyncAt: null, error: null, syncCode: null });
  const [joinCode, setJoinCode] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncErr, setSyncErr] = useState('');

  // ── Data fetching ─────────────────────────────────
  useEffect(() => {
    fetch('/api/roster').then(r => r.json()).then((d: RosterInfo) => {
      setRoster(d);
    }).catch(() => {});
    fetch('/api/cloud').then(r => r.json()).then((d) => {
      if (d?.ok) {
        setCloud(d);
        if (d.cloud_url) setCloudUrl(d.cloud_url);
        if (d.tournament?.id) setSelectedTournament(d.tournament.id);
        if (d.bound) refreshTournaments();
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(setGame).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/widgets').then(r => r.json()).then(setWidgets).catch(() => {});
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = e => { try { setWidgets(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  useEffect(() => {
    fetch('/api/sync').then(r => r.json()).then(setSync).catch(() => {});
    const es = new EventSource('/api/sync?stream=1');
    es.onmessage = e => { try { setSync(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (deviceStatus !== 'waiting' || !deviceCode || !cloudUrl.trim()) return;
    const id = setInterval(() => { pollDeviceStatus(deviceCode); }, 3000);
    return () => clearInterval(id);
  }, [deviceStatus, deviceCode, cloudUrl]);

  useEffect(() => {
    const tid = cloud?.tournament?.id || selectedTournament;
    if (!tid) return;
    loadCloudDetail(tid);
  }, [cloud?.tournament?.id, selectedTournament]);

  // ── Actions ───────────────────────────────────────
  async function refreshTournaments() {
    try {
      const res = await fetch('/api/cloud/tournaments');
      const d = await res.json();
      if (d.ok) {
        setTournaments(d.tournaments ?? []);
        if (!selectedTournament && d.tournaments?.length) {
          setSelectedTournament(d.tournaments[0].id);
        }
      }
    } catch { /* ignore */ }
  }

  async function requestDeviceCode() {
    setCloudBusy(true);
    setCloudErr('');
    try {
      const res = await fetch('/api/cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'device-code', cloud_url: cloudUrl }),
      });
      const d = await res.json();
      if (!d.ok) {
        setCloudErr(d.error || 'Failed to generate code');
        return;
      }
      setDeviceCode(d.code || '');
      setDeviceStatus('waiting');
    } catch { setCloudErr('Network error'); }
    finally {
      setCloudBusy(false);
    }
  }

  async function pollDeviceStatus(code: string) {
    try {
      const res = await fetch('/api/cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'device-status', cloud_url: cloudUrl, code }),
      });
      const d = await res.json();
      if (d.ok && d.approved) {
        setDeviceStatus('approved');
        setRosterMsg('Organization linked');
        const statusRes = await fetch('/api/cloud');
        const statusData = await statusRes.json();
        if (statusData?.ok) setCloud(statusData);
        refreshTournaments();
      }
    } catch { /* ignore */ }
  }

  async function selectTournament() {
    if (!selectedTournament) return;
    setCloudBusy(true);
    setCloudErr('');
    try {
      const res = await fetch('/api/cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select-tournament', tournament_id: selectedTournament }),
      });
      const d = await res.json();
      if (d.ok) {
        setRosterMsg('Tournament linked');
        const rosterRes = await fetch('/api/roster');
        const rosterData = await rosterRes.json();
        setRoster(rosterData);
        const statusRes = await fetch('/api/cloud');
        const statusData = await statusRes.json();
        if (statusData?.ok) setCloud(statusData);
      } else {
        setCloudErr(d.error || 'Failed to link tournament');
      }
    } catch { setCloudErr('Network error'); }
    finally {
      setCloudBusy(false);
      setTimeout(() => setRosterMsg(''), 3000);
    }
  }

  async function loadCloudDetail(tournamentId: string) {
    setCloudDetailLoading(true);
    setCloudDetailErr('');
    try {
      const res = await fetch(`/api/cloud/tournament?id=${encodeURIComponent(tournamentId)}`);
      const d = await res.json();
      if (d.ok) {
        setCloudDetail(d.data);
      } else {
        setCloudDetailErr(d.error || 'Failed to load cloud detail');
      }
    } catch {
      setCloudDetailErr('Network error');
    } finally {
      setCloudDetailLoading(false);
    }
  }

  const startLeader = async () => {
    setSyncBusy(true); setSyncErr('');
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start-leader' }) });
      const d = await res.json();
      if (d.ok && d.status) setSync(d.status);
      else setSyncErr(d.error || 'Failed');
    } catch { setSyncErr('Network error'); }
    finally { setSyncBusy(false); }
  };

  const joinFollower = async () => {
    if (joinCode.length !== 6 || !joinUrl.trim()) return;
    setSyncBusy(true); setSyncErr('');
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', code: joinCode, cloudUrl: joinUrl.trim() }) });
      const d = await res.json();
      if (d.ok && d.status) setSync(d.status);
      else setSyncErr(d.error || 'Failed');
    } catch { setSyncErr('Network error'); }
    finally { setSyncBusy(false); }
  };

  const stopSync = async () => {
    await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop' }) });
    setSyncErr('');
  };

  // ── Derived ───────────────────────────────────────
  const phase = game?.phase || 'lobby';
  const teams = game?.teams ?? [];
  const alive = teams.filter(t => t.liveMemberNum > 0).length;
  const kills = teams.reduce((s, t) => s + t.kills, 0);
  const widgetCount = Object.values(widgets).filter(Boolean).length;
  const phaseColor = phase === 'ingame' ? 'var(--red)' : phase === 'finished' ? 'var(--accent)' : 'var(--text-faint)';
  const phaseLabel = phase === 'ingame' ? 'LIVE' : phase.toUpperCase();

  return (
    <div className="page">
      {/* ── Top bar ─────────────────────────────── */}
      <header className="topbar">
        <div className="flex items-center gap-8">
          <div className="topbar-brand">
            <div className="topbar-logo">LS</div>
            <div>
              <div className="topbar-title">Live Stat</div>
              <div className="topbar-sub">Local Engine</div>
            </div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="pill" style={{ color: phaseColor, borderColor: `color-mix(in srgb, ${phaseColor} 25%, transparent)`, background: `color-mix(in srgb, ${phaseColor} 8%, transparent)` }}>
            <div className={`pill-dot${phase === 'ingame' ? ' pulse' : ''}`} style={{ background: phaseColor }} />
            {phaseLabel}
          </div>
          {sync.connected && (
            <div className="pill" style={{ color: 'var(--purple)', borderColor: 'rgba(109,94,252,0.25)', background: 'rgba(109,94,252,0.08)' }}>
              <div className="pill-dot" style={{ background: 'var(--purple)' }} />
              {sync.role.toUpperCase()} {sync.peerCount > 0 && `\u00B7 ${sync.peerCount} PCs`}
            </div>
          )}
          <div className="pill" style={{
            color: widgetCount > 0 ? 'var(--accent)' : 'var(--text-faint)',
            borderColor: widgetCount > 0 ? 'rgba(0,255,195,0.2)' : 'var(--border)',
            background: widgetCount > 0 ? 'rgba(0,255,195,0.06)' : 'transparent',
          }}>
            {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px' }}>
        {/* ── Stats row ────────────────────────── */}
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Teams', value: teams.length, sub: roster?.roster_loaded ? 'rostered' : 'no roster', color: 'var(--purple)' },
            { label: 'Alive', value: phase === 'lobby' ? '\u2014' : `${alive}/${teams.length}`, sub: phase === 'ingame' ? 'in battle' : phase, color: 'var(--accent)' },
            { label: 'Kills', value: kills, sub: 'this match', color: 'var(--red)' },
            { label: 'Roster', value: roster?.roster_loaded ? 'OK' : '\u2014', sub: roster?.tournament_id ? `T:${roster.tournament_id.slice(0, 8)}` : 'not linked', color: roster?.roster_loaded ? 'var(--accent)' : 'var(--amber)' },
          ].map((s, i) => (
            <div key={i} className="stat-box">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Two-column: nav + roster ─────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Navigation */}
          <div>
            <div className="section-label">Quick Access</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LINKS.map(l => (
                <a key={l.href} href={l.href} className="nav-link">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-6" style={{ marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{l.title}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: `color-mix(in srgb, ${l.color} 15%, transparent)`, color: l.color }}>{l.tag}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{l.desc}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.2 }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </a>
              ))}
            </div>
          </div>

          {/* Roster */}
          <div>
            <div className="section-label">Roster</div>
            <div className="card">
              <div className="flex items-center" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Cloud Link</span>
                <span className="pill" style={{
                  color: roster?.roster_loaded ? 'var(--accent)' : 'var(--red)',
                  background: roster?.roster_loaded ? 'rgba(0,255,195,0.1)' : 'rgba(255,78,78,0.1)',
                  fontSize: 9, fontWeight: 800,
                }}>
                  {roster?.roster_loaded ? 'LOADED' : 'NONE'}
                </span>
              </div>

              <div style={{ display: 'grid', gap: 10, marginBottom: 10 }}>
                {!cloud?.bound && (
                  <>
                    <div className="section-label" style={{ marginBottom: 4 }}>Organization</div>
                    <div className="flex gap-6">
                      <input className="input" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="Cloud URL (https://...)" style={{ flex: 1 }} />
                      <button className="btn btn-accent" onClick={requestDeviceCode} disabled={cloudBusy || !cloudUrl.trim()} style={{ whiteSpace: 'nowrap' }}>
                        {cloudBusy ? 'Generating\u2026' : 'Get Device Code'}
                      </button>
                    </div>

                    {deviceCode && (
                      <div className="flex items-center gap-8" style={{ marginTop: 6 }}>
                        <div className="mono" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--accent)' }}>
                          {deviceCode}
                        </div>
                        <button className="btn" onClick={() => pollDeviceStatus(deviceCode)} disabled={cloudBusy || !cloudUrl.trim()} style={{ whiteSpace: 'nowrap' }}>
                          Check Approval
                        </button>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                          {deviceStatus === 'waiting' ? 'Waiting for approval' : deviceStatus === 'approved' ? 'Approved' : ''}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {cloud?.bound && (
                  <div className="flex items-center gap-6" style={{ marginBottom: 4 }}>
                    <div className="section-label">Organization</div>
                    <button
                      className="btn"
                      onClick={async () => {
                        try { await fetch('/api/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) }); } catch {}
                        setCloud(null);
                        setDeviceCode('');
                        setDeviceStatus('idle');
                      }}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Re-link Org
                    </button>
                  </div>
                )}

                <div className="section-label" style={{ marginBottom: 4 }}>Tournament</div>
                <div className="flex gap-6">
                  <select className="input" value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)} style={{ flex: 1 }}>
                    {(tournaments.length ? tournaments : [{ id: '', name: 'No tournaments available', status: '' }]).map(t => (
                      <option key={t.id || 'none'} value={t.id}>{t.name || 'No tournaments available'}</option>
                    ))}
                  </select>
                  <button className="btn" onClick={refreshTournaments} disabled={cloudBusy || !cloud?.bound} style={{ whiteSpace: 'nowrap' }}>
                    Refresh
                  </button>
                  <button className="btn btn-accent" onClick={selectTournament} disabled={cloudBusy || !cloud?.bound || !selectedTournament} style={{ whiteSpace: 'nowrap' }}>
                    {cloudBusy ? 'Linking\u2026' : 'Link Tournament'}
                  </button>
                </div>
              </div>

              {rosterMsg && (
                <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 'var(--radius-sm)', marginBottom: 10, background: 'rgba(0,255,195,0.1)', color: 'var(--accent)' }}>
                  {rosterMsg}
                </div>
              )}

              {cloudErr && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{cloudErr}</div>}

              {cloud?.bound && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>
                  Org: <strong style={{ color: 'var(--text-primary)' }}>{cloud.org?.name || 'Linked'}</strong>
                  {cloud.tournament?.name && (
                    <span> - Tournament: <strong style={{ color: 'var(--text-primary)' }}>{cloud.tournament.name}</strong></span>
                  )}
                </div>
              )}

              {roster?.roster_loaded && (
                <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: 10 }}>
                  <div className="flex gap-10" style={{ fontSize: 11, marginBottom: 8 }}>
                    <span><span style={{ color: 'var(--text-faint)' }}>Teams</span> <strong>{roster.team_count}</strong></span>
                    <span><span style={{ color: 'var(--text-faint)' }}>Players</span> <strong>{roster.player_count}</strong></span>
                    <span className="mono" style={{ color: 'var(--text-faint)', fontSize: 10 }}>{roster.match_id?.slice(0, 8) || '\u2014'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(roster.teams_preview ?? []).slice(0, 16).map(t => (
                      <span key={t.slot_number} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-faint)', fontWeight: 800, fontSize: 9 }}>{String(t.slot_number).padStart(2, '0')}</span>{' '}
                        {t.short_name || t.name}
                      </span>
                    ))}
                    {(roster.teams_preview?.length ?? 0) > 16 && (
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', padding: '2px 6px' }}>+{(roster.teams_preview?.length ?? 0) - 16}</span>
                    )}
                  </div>
                </div>
              )}

              {roster?.error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>{roster.error}</div>}
            </div>
          </div>
        </div>

        {/* ── Multi-PC Sync ────────────────────── */}
        {/* -- Cloud Detail ------------------------------------------------ */}
        {cloud?.tournament?.id && (
          <div style={{ marginBottom: 20 }}>
            <div className="section-label">Cloud Detail</div>
            <div className="card">
              <div className="flex items-center" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {cloud.tournament?.name || 'Tournament'} Details
                </div>
                <button
                  className="btn"
                  onClick={() => loadCloudDetail(cloud.tournament?.id || selectedTournament)}
                  disabled={cloudDetailLoading}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {cloudDetailLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {cloudDetailErr && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{cloudDetailErr}</div>}

              {cloudDetail && (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <div className="stat-box">
                      <div className="stat-label">Teams</div>
                      <div className="stat-value">{(cloudDetail?.teams ?? []).length}</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-label">Stages</div>
                      <div className="stat-value">{(cloudDetail?.stages ?? []).length}</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-label">Matches</div>
                      <div className="stat-value">{(cloudDetail?.stages ?? []).reduce((n: number, s: any) => n + (s.matches?.length ?? 0), 0)}</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-label">Players</div>
                      <div className="stat-value">{(cloudDetail?.playerStats ?? []).length}</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6 }}>Raw Cloud Detail</div>
                    <pre style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto' }}>
                      {JSON.stringify(cloudDetail, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div className="section-label">Multi-PC Sync</div>
          <div className="card" style={{ borderColor: sync.connected ? 'rgba(109,94,252,0.2)' : undefined }}>
            {!sync.connected ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Leader */}
                <div>
                  <div className="flex items-center gap-6" style={{ marginBottom: 8 }}>
                    <div className="pill-dot" style={{ background: 'var(--red)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700 }}>Leader</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>receives PCOB & broadcasts</span>
                  </div>
                  <button className="btn" onClick={startLeader} disabled={syncBusy || !roster?.has_cloud_config} style={{
                    width: '100%', borderColor: 'rgba(255,78,78,0.2)', color: roster?.has_cloud_config ? 'var(--red)' : 'var(--text-faint)',
                  }}>
                    {syncBusy ? 'Connecting\u2026' : !roster?.has_cloud_config ? 'Link tournament to enable' : 'Start as Leader'}
                  </button>
                </div>
                {/* Follower */}
                <div>
                  <div className="flex items-center gap-6" style={{ marginBottom: 8 }}>
                    <div className="pill-dot" style={{ background: 'var(--accent)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700 }}>Follower</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>receives state from leader</span>
                  </div>
                  <div className="flex gap-6">
                    <input className="input" value={joinUrl} onChange={e => setJoinUrl(e.target.value)} placeholder="Cloud URL" style={{ flex: 1 }} />
                    <input className="input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="CODE" maxLength={6} style={{ width: 80, textAlign: 'center', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent)' }} />
                    <button className="btn btn-accent" onClick={joinFollower} disabled={syncBusy || joinCode.length !== 6 || !joinUrl.trim()} style={{ whiteSpace: 'nowrap' }}>
                      {syncBusy ? 'Joining\u2026' : 'Join'}
                    </button>
                  </div>
                </div>
                {syncErr && <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--red)' }}>{syncErr}</div>}
              </div>
            ) : (
              <div className="animate-in">
                <div className="flex items-center" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                  <div className="flex items-center gap-10">
                    <span style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: sync.role === 'leader' ? 'var(--red)' : 'var(--accent)' }}>{sync.role}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {sync.role === 'leader' ? 'Broadcasting to followers' : 'Receiving from leader'}
                    </span>
                  </div>
                  <button className="btn btn-red" onClick={stopSync} style={{ fontSize: 11 }}>Disconnect</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div className="stat-box">
                    <div className="stat-label">Sync Code</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.15em', color: sync.role === 'leader' ? 'var(--red)' : 'var(--accent)' }}>
                      {sync.syncCode || '\u2014'}
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Connected PCs</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--purple)' }}>{sync.peerCount}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Last Sync</div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                      {sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleTimeString() : '\u2014'}
                    </div>
                  </div>
                </div>

                {sync.role === 'leader' && sync.syncCode && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,78,78,0.05)', border: '1px solid rgba(255,78,78,0.12)', fontSize: 11, color: 'var(--text-dim)' }}>
                    Share code <span style={{ color: 'var(--red)', fontWeight: 800, letterSpacing: '0.1em' }}>{sync.syncCode}</span> with other PCs
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Live match table ─────────────────── */}
        {phase !== 'lobby' && teams.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="section-label">Live Match</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-header" style={{ gridTemplateColumns: '36px 1fr 70px 70px 90px' }}>
                <span>#</span><span>Team</span><span style={{ textAlign: 'center' }}>Alive</span><span style={{ textAlign: 'center' }}>Kills</span><span style={{ textAlign: 'right' }}>Points</span>
              </div>
              {teams.slice(0, 8).map((t, i) => (
                <div key={t.teamName} className="table-row" style={{ gridTemplateColumns: '36px 1fr 70px 70px 90px' }}>
                  <span style={{ fontWeight: 800, color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--red)' : i === 2 ? 'var(--amber)' : 'var(--text-faint)' }}>{i + 1}</span>
                  <div className="flex items-center gap-8">
                    <div style={{ width: 3, height: 16, borderRadius: 1, background: t.brandColor || '#fff' }} />
                    <span style={{ fontWeight: 600 }}>{t.displayName || t.teamName}</span>
                  </div>
                  <span style={{ textAlign: 'center', fontWeight: 700, color: t.liveMemberNum > 0 ? 'var(--accent)' : 'var(--red)' }}>{t.liveMemberNum}/4</span>
                  <span style={{ textAlign: 'center', fontWeight: 700 }}>{t.kills}</span>
                  <span style={{ textAlign: 'right', fontWeight: 800 }}>{t.totalPoints}</span>
                </div>
              ))}
              {teams.length > 8 && (
                <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text-faint)', textAlign: 'center' }}>+{teams.length - 8} more</div>
              )}
            </div>
          </div>
        )}

        {/* ── Spotlight + Quick ref ────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: game?.spotlight && game.spotlight.kills > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
          {game?.spotlight && game.spotlight.kills > 0 && (
            <div className="card">
              <div className="section-label" style={{ marginBottom: 8 }}>MVP</div>
              <div className="flex items-center gap-10">
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'rgba(0,255,195,0.08)', border: '1px solid rgba(0,255,195,0.15)', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 900, color: 'var(--accent)' }}>
                  {game.spotlight.kills}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{game.spotlight.playerName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{game.spotlight.teamName}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,78,78,0.1)', color: 'var(--red)' }}>
                  {game.spotlight.kills} KILLS
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="section-label" style={{ marginBottom: 8 }}>OBS URLs</div>
            <div style={{ display: 'grid', gap: 4 }}>
              {[
                { label: 'Master Overlay', url: 'localhost:3001/overlay/master' },
                { label: 'Controller', url: 'localhost:3001/controller' },
              ].map(r => (
                <div key={r.label} className="flex items-center" style={{ justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{r.label}</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>{r.url}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────── */}
        <div className="flex items-center" style={{ justifyContent: 'space-between', marginTop: 28, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-faint)' }}>
          <span>Live Stat Local Engine \u00B7 Port 3001</span>
          <div className="flex gap-10">
            <a href="/controller" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Controller</a>
            <a href="/overlay/gallery" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Gallery</a>
          </div>
        </div>
      </div>
    </div>
  );
}
