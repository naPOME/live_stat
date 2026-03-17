'use client';

import { useEffect, useState } from 'react';

/* ── Types ────────────────────────────────────────── */
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

/* ── Dashboard ────────────────────────────────────── */
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

  const [sync, setSync] = useState<SyncStatus>({ role: 'standalone', connected: false, matchId: null, peerCount: 0, lastSyncAt: null, error: null, syncCode: null });
  const [joinCode, setJoinCode] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncErr, setSyncErr] = useState('');

  /* ── Data fetching ───────────────────────────── */
  useEffect(() => {
    fetch('/api/roster').then(r => r.json()).then((d: RosterInfo) => setRoster(d)).catch(() => {});
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

  /* ── Actions ─────────────────────────────────── */
  async function refreshTournaments() {
    try {
      const res = await fetch('/api/cloud/tournaments');
      const d = await res.json();
      if (d.ok) {
        setTournaments(d.tournaments ?? []);
        if (!selectedTournament && d.tournaments?.length) setSelectedTournament(d.tournaments[0].id);
      }
    } catch {}
  }

  async function requestDeviceCode() {
    setCloudBusy(true); setCloudErr('');
    try {
      const res = await fetch('/api/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'device-code', cloud_url: cloudUrl }) });
      const d = await res.json();
      if (!d.ok) { setCloudErr(d.error || 'Failed to generate code'); return; }
      setDeviceCode(d.code || ''); setDeviceStatus('waiting');
    } catch { setCloudErr('Network error'); }
    finally { setCloudBusy(false); }
  }

  async function pollDeviceStatus(code: string) {
    try {
      const res = await fetch('/api/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'device-status', cloud_url: cloudUrl, code }) });
      const d = await res.json();
      if (d.ok && d.approved) {
        setDeviceStatus('approved'); setRosterMsg('Organization linked');
        const statusRes = await fetch('/api/cloud');
        const statusData = await statusRes.json();
        if (statusData?.ok) setCloud(statusData);
        refreshTournaments();
      }
    } catch {}
  }

  async function selectTournament() {
    if (!selectedTournament) return;
    setCloudBusy(true); setCloudErr('');
    try {
      const res = await fetch('/api/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'select-tournament', tournament_id: selectedTournament }) });
      const d = await res.json();
      if (d.ok) {
        setRosterMsg('Tournament linked');
        const [rosterRes, statusRes] = await Promise.all([fetch('/api/roster'), fetch('/api/cloud')]);
        setRoster(await rosterRes.json());
        const statusData = await statusRes.json();
        if (statusData?.ok) setCloud(statusData);
      } else { setCloudErr(d.error || 'Failed to link tournament'); }
    } catch { setCloudErr('Network error'); }
    finally { setCloudBusy(false); setTimeout(() => setRosterMsg(''), 3000); }
  }

  const startLeader = async () => {
    setSyncBusy(true); setSyncErr('');
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start-leader' }) });
      const d = await res.json();
      if (d.ok && d.status) setSync(d.status); else setSyncErr(d.error || 'Failed');
    } catch { setSyncErr('Network error'); }
    finally { setSyncBusy(false); }
  };

  const joinFollower = async () => {
    if (joinCode.length !== 6) return;
    setSyncBusy(true); setSyncErr('');
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', code: joinCode }) });
      const d = await res.json();
      if (d.ok && d.status) setSync(d.status); else setSyncErr(d.error || 'Failed');
    } catch { setSyncErr('Network error'); }
    finally { setSyncBusy(false); }
  };

  const stopSync = async () => {
    await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop' }) });
    setSyncErr('');
  };

  /* ── Derived ─────────────────────────────────── */
  const phase = game?.phase || 'lobby';
  const teams = game?.teams ?? [];
  const alive = teams.filter(t => t.liveMemberNum > 0).length;
  const kills = teams.reduce((s, t) => s + t.kills, 0);
  const widgetCount = Object.values(widgets).filter(Boolean).length;
  const phaseColor = phase === 'ingame' ? 'var(--red)' : phase === 'finished' ? 'var(--accent)' : 'var(--text-faint)';
  const phaseLabel = phase === 'ingame' ? 'LIVE' : phase.toUpperCase();

  return (
    <div className="animate-in">
      {/* ── Page header ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</h1>
        <div className="flex items-center gap-8">
          <div className="pill" style={{ color: phaseColor, borderColor: `color-mix(in srgb, ${phaseColor} 25%, transparent)`, background: `color-mix(in srgb, ${phaseColor} 8%, transparent)` }}>
            {phase === 'ingame' && <div className="live-dot" style={{ width: 6, height: 6 }} />}
            {phase !== 'ingame' && <div className="pill-dot" style={{ background: phaseColor }} />}
            {phaseLabel}
          </div>
          {sync.connected && (
            <div className="pill" style={{ color: 'var(--purple)', borderColor: 'rgba(124,106,252,0.25)', background: 'rgba(124,106,252,0.08)' }}>
              <div className="pill-dot" style={{ background: 'var(--purple)' }} />
              {sync.role.toUpperCase()}
            </div>
          )}
          <div className="pill" style={{ color: widgetCount > 0 ? 'var(--accent)' : 'var(--text-faint)', borderColor: widgetCount > 0 ? 'rgba(0,255,195,0.2)' : 'var(--border)', background: widgetCount > 0 ? 'rgba(0,255,195,0.06)' : 'transparent' }}>
            {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Teams', value: teams.length || '—', sub: roster?.roster_loaded ? 'rostered' : 'no roster', color: 'var(--purple)' },
          { label: 'Alive', value: phase === 'lobby' ? '—' : `${alive}/${teams.length}`, sub: phase === 'ingame' ? 'in battle' : phase, color: 'var(--accent)' },
          { label: 'Kills', value: kills, sub: 'this match', color: 'var(--red)' },
          { label: 'Roster', value: roster?.roster_loaded ? 'OK' : '—', sub: roster?.tournament_id ? `T:${roster.tournament_id.slice(0, 8)}` : 'not linked', color: roster?.roster_loaded ? 'var(--accent)' : 'var(--amber)' },
        ].map((s, i) => (
          <div key={i} className="stat-box">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main content (2 columns) ────────────── */}
      <div className="tile-grid tile-grid-2" style={{ marginBottom: 20 }}>

        {/* ── Left: Live Match ──────────────────── */}
        <div className="card">
          <div className="tile-header">
            <div className="flex items-center gap-8">
              <span className="tile-title">Live Match</span>
              {phase === 'ingame' && <div className="live-dot" />}
            </div>
            {teams.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{teams.length} teams</span>
            )}
          </div>

          {teams.length > 0 && phase !== 'lobby' ? (
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div className="table-header" style={{ gridTemplateColumns: '32px 1fr 60px 60px 70px' }}>
                <span>#</span><span>Team</span><span style={{ textAlign: 'center' }}>Alive</span><span style={{ textAlign: 'center' }}>Kills</span><span style={{ textAlign: 'right' }}>Pts</span>
              </div>
              {teams.slice(0, 8).map((t, i) => (
                <div key={t.teamName} className="table-row" style={{ gridTemplateColumns: '32px 1fr 60px 60px 70px' }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--purple)' : i === 2 ? 'var(--amber)' : 'var(--text-faint)' }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{t.displayName || t.shortName || t.teamName}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: t.liveMemberNum > 0 ? 'var(--accent)' : 'var(--red)' }}>{t.liveMemberNum}/4</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12 }}>{t.kills}</span>
                  <span style={{ textAlign: 'right', fontWeight: 800, fontSize: 12 }}>{t.totalPoints}</span>
                </div>
              ))}
              {teams.length > 8 && (
                <div style={{ padding: '6px 14px', fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>+{teams.length - 8} more</div>
              )}
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>
              {phase === 'lobby' ? 'Waiting for match to start…' : 'No team data yet'}
            </div>
          )}

          {/* MVP */}
          {game?.spotlight && game.spotlight.kills > 0 && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(124,106,252,0.05)', border: '1px solid rgba(124,106,252,0.1)' }}>
              <div className="flex items-center gap-10">
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, rgba(0,255,195,0.1), rgba(124,106,252,0.1))',
                  border: '1px solid rgba(0,255,195,0.12)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 18, fontWeight: 900, color: 'var(--accent)',
                }}>
                  {game.spotlight.kills}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{game.spotlight.playerName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{game.spotlight.teamName}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: 'rgba(124,106,252,0.12)', color: 'var(--purple)' }}>MVP</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Widgets + OBS ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Widgets */}
          <div className="card">
            <div className="tile-header">
              <span className="tile-title">Widgets</span>
              <a href="/controller" className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>Controller</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {[
                { key: 'leaderboard', label: 'Ranking' },
                { key: 'killfeed', label: 'Kill Feed' },
                { key: 'playercard', label: 'Player Card' },
                { key: 'results', label: 'Results' },
                { key: 'mvp', label: 'MVP' },
                { key: 'fraggers', label: 'Fraggers' },
              ].map(w => {
                const on = widgets[w.key] ?? false;
                return (
                  <div key={w.key} style={{
                    padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                    background: on ? 'rgba(0,255,195,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${on ? 'rgba(0,255,195,0.15)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: on ? 'var(--accent)' : 'var(--text-faint)', boxShadow: on ? '0 0 6px rgba(0,255,195,0.5)' : 'none' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: on ? 'var(--text)' : 'var(--text-faint)' }}>{w.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OBS URLs */}
          <div className="card">
            <div className="tile-header">
              <span className="tile-title">OBS Setup</span>
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {[
                { label: 'Master Overlay', url: 'localhost:3001/overlay/master' },
                { label: 'Controller', url: 'localhost:3001/controller' },
              ].map(r => (
                <div key={r.label} className="flex items-center" style={{ justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{r.label}</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>{r.url}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cloud + Sync row ────────────────────── */}
      <div className="tile-grid tile-grid-2" style={{ marginBottom: 20 }}>
        {/* Cloud Link */}
        <div className="card">
          <div className="tile-header">
            <div className="flex items-center gap-8">
              <span className="tile-title">Cloud</span>
              <span className="pill" style={{
                color: roster?.roster_loaded ? 'var(--accent)' : 'var(--text-faint)',
                background: roster?.roster_loaded ? 'rgba(0,255,195,0.1)' : 'rgba(255,255,255,0.04)',
                fontSize: 9, fontWeight: 800, padding: '2px 8px',
              }}>
                {roster?.roster_loaded ? 'LINKED' : 'NOT LINKED'}
              </span>
            </div>
            {cloud?.bound && (
              <button className="btn" onClick={async () => {
                try { await fetch('/api/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) }); } catch {}
                setCloud(null); setDeviceCode(''); setDeviceStatus('idle');
              }} style={{ fontSize: 11, padding: '4px 10px' }}>Re-link</button>
            )}
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {/* Step 1: Connect org */}
            {!cloud?.bound && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>1. Connect Organization</div>
                <div className="flex gap-6">
                  <input className="input" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="Cloud URL (https://...)" style={{ flex: 1 }} />
                  <button className="btn btn-accent" onClick={requestDeviceCode} disabled={cloudBusy || !cloudUrl.trim()} style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                    {cloudBusy ? 'Wait…' : 'Get Code'}
                  </button>
                </div>
                {deviceCode && (
                  <div className="flex items-center gap-8" style={{ marginTop: 8 }}>
                    <div className="mono glow-cyan" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.18em' }}>{deviceCode}</div>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                      {deviceStatus === 'waiting' ? 'Enter this code on the cloud dashboard' : deviceStatus === 'approved' ? 'Approved' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {cloud?.bound && (
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                <strong style={{ color: 'var(--text)' }}>{cloud.org?.name}</strong>
                {cloud.tournament?.name && <span style={{ color: 'var(--text-faint)' }}> / {cloud.tournament.name}</span>}
              </div>
            )}

            {/* Step 2: Select tournament */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {!cloud?.bound ? '2. ' : ''}Select Tournament
              </div>
              <div className="flex gap-6">
                <select className="input" value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)} style={{ flex: 1 }}>
                  {(tournaments.length ? tournaments : [{ id: '', name: 'No tournaments', status: '' }]).map(t => (
                    <option key={t.id || 'none'} value={t.id}>{t.name || 'No tournaments'}</option>
                  ))}
                </select>
                <button className="btn" onClick={refreshTournaments} disabled={cloudBusy || !cloud?.bound} style={{ fontSize: 11, padding: '4px 10px' }}>Refresh</button>
                <button className="btn btn-accent" onClick={selectTournament} disabled={cloudBusy || !cloud?.bound || !selectedTournament} style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                  {cloudBusy ? 'Linking…' : 'Link'}
                </button>
              </div>
            </div>

            {rosterMsg && (
              <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,255,195,0.08)', color: 'var(--accent)', border: '1px solid rgba(0,255,195,0.12)' }}>
                {rosterMsg}
              </div>
            )}
            {cloudErr && <div style={{ fontSize: 11, color: 'var(--red)' }}>{cloudErr}</div>}

            {/* Roster preview */}
            {roster?.roster_loaded && (
              <div style={{ background: 'rgba(5,8,16,0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: 10 }}>
                <div className="flex gap-10" style={{ fontSize: 11, marginBottom: 6 }}>
                  <span><span style={{ color: 'var(--text-faint)' }}>Teams</span> <strong>{roster.team_count}</strong></span>
                  <span><span style={{ color: 'var(--text-faint)' }}>Players</span> <strong>{roster.player_count}</strong></span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(roster.teams_preview ?? []).slice(0, 16).map(t => (
                    <span key={t.slot_number} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
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
          </div>
        </div>

        {/* Multi-PC Sync — code only */}
        <div className="card" style={{ borderColor: sync.connected ? 'rgba(124,106,252,0.15)' : undefined }}>
          <div className="tile-header">
            <div className="flex items-center gap-8">
              <span className="tile-title">Multi-PC Sync</span>
              {sync.connected && <div className="pill-dot" style={{ background: 'var(--purple)', boxShadow: '0 0 6px rgba(124,106,252,0.5)' }} />}
            </div>
            {sync.connected && <button className="btn btn-red" onClick={stopSync} style={{ fontSize: 11, padding: '4px 10px' }}>Disconnect</button>}
          </div>

          {!sync.connected ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.5 }}>
                Sync game state between multiple PCs. The <strong style={{ color: 'var(--text-dim)' }}>leader</strong> receives game data and broadcasts it. <strong style={{ color: 'var(--text-dim)' }}>Followers</strong> join with the 6-digit code.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Leader */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Leader</div>
                  <button className="btn" onClick={startLeader} disabled={syncBusy || !roster?.has_cloud_config} style={{
                    width: '100%', borderColor: 'rgba(255,78,78,0.2)', color: roster?.has_cloud_config ? 'var(--red)' : 'var(--text-faint)', fontSize: 12,
                  }}>
                    {syncBusy ? 'Connecting…' : !roster?.has_cloud_config ? 'Link tournament first' : 'Start Broadcasting'}
                  </button>
                </div>

                {/* Follower */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Follower</div>
                  <div className="flex gap-6">
                    <input
                      className="input"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      maxLength={6}
                      style={{ flex: 1, textAlign: 'center', fontWeight: 800, letterSpacing: '0.15em', fontSize: 14, color: 'var(--accent)' }}
                    />
                    <button className="btn btn-accent" onClick={joinFollower} disabled={syncBusy || joinCode.length !== 6} style={{ fontSize: 12 }}>Join</button>
                  </div>
                </div>
              </div>
              {syncErr && <div style={{ fontSize: 11, color: 'var(--red)' }}>{syncErr}</div>}
            </div>
          ) : (
            <div className="animate-in">
              <div className="flex items-center gap-10" style={{ marginBottom: 14 }}>
                <span className={sync.role === 'leader' ? 'glow-red' : 'glow-cyan'} style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase' }}>{sync.role}</span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  {sync.role === 'leader' ? 'Broadcasting to followers' : 'Receiving from leader'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div className="stat-box">
                  <div className="stat-label">Sync Code</div>
                  <div className={`mono ${sync.role === 'leader' ? 'glow-red' : 'glow-cyan'}`} style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.15em' }}>{sync.syncCode || '—'}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Connected PCs</div>
                  <div className="glow-violet" style={{ fontSize: 20, fontWeight: 800 }}>{sync.peerCount}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Last Sync</div>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleTimeString() : '—'}</div>
                </div>
              </div>
              {sync.role === 'leader' && sync.syncCode && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,78,78,0.05)', border: '1px solid rgba(255,78,78,0.1)', fontSize: 11, color: 'var(--text-dim)' }}>
                  Share code <span className="glow-red" style={{ fontWeight: 800, letterSpacing: '0.1em' }}>{sync.syncCode}</span> with other PCs
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <div className="flex items-center" style={{ justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-faint)' }}>
        <span>Live Stat Local Engine · Port 3001</span>
      </div>
    </div>
  );
}
