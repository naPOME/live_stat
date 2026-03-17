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

  // Expanded sections
  const [showCloud, setShowCloud] = useState(false);
  const [showSync, setShowSync] = useState(false);

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

  // Match lifecycle state
  const matchState: 'setup' | 'ready' | 'live' | 'finished' =
    !roster?.roster_loaded ? 'setup'
    : phase === 'ingame' ? 'live'
    : phase === 'finished' ? 'finished'
    : 'ready';

  const phaseColor =
    matchState === 'live' ? 'var(--red)'
    : matchState === 'finished' ? 'var(--accent)'
    : matchState === 'ready' ? 'var(--purple)'
    : 'var(--text-faint)';

  const phaseLabel =
    matchState === 'live' ? 'LIVE'
    : matchState === 'finished' ? 'FINISHED'
    : matchState === 'ready' ? 'READY'
    : 'SETUP';

  return (
    <div className="animate-in">
      {/* ── Header ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</h1>
        <div className="flex items-center gap-8">
          <div className="pill" style={{ color: phaseColor, borderColor: `color-mix(in srgb, ${phaseColor} 25%, transparent)`, background: `color-mix(in srgb, ${phaseColor} 8%, transparent)` }}>
            {matchState === 'live' && <div className="live-dot" style={{ width: 6, height: 6 }} />}
            {matchState !== 'live' && <div className="pill-dot" style={{ background: phaseColor }} />}
            {phaseLabel}
          </div>
          {sync.connected && (
            <div className="pill" style={{ color: 'var(--purple)', borderColor: 'rgba(124,106,252,0.25)', background: 'rgba(124,106,252,0.08)' }}>
              <div className="pill-dot" style={{ background: 'var(--purple)' }} />
              {sync.role.toUpperCase()} {sync.peerCount > 0 && `(${sync.peerCount})`}
            </div>
          )}
        </div>
      </div>

      {/* ── SETUP: No roster — Getting Started ── */}
      {matchState === 'setup' && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(255,184,0,0.12)' }}>
          <div style={{ padding: '4px 0 12px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Getting Started</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.5 }}>Connect to your cloud organization and select a tournament to load the roster.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { n: '1', title: 'Link Organization', desc: 'Enter cloud URL and get a device code', done: !!cloud?.bound },
              { n: '2', title: 'Select Tournament', desc: 'Pick the active tournament to load', done: !!roster?.roster_loaded },
              { n: '3', title: 'Start Match', desc: 'Launch game client to begin', done: phase !== 'lobby' || teams.length > 0 },
            ].map(s => (
              <div key={s.n} style={{
                padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                background: s.done ? 'rgba(96,165,250,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${s.done ? 'rgba(0,255,195,0.12)' : 'var(--border)'}`,
              }}>
                <div className="flex items-center gap-6" style={{ marginBottom: 4 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    fontSize: 10, fontWeight: 800,
                    background: s.done ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                    color: s.done ? '#050810' : 'var(--text-faint)',
                  }}>{s.done ? '\u2713' : s.n}</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.done ? 'var(--accent)' : 'var(--text)' }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', lineHeight: 1.4, paddingLeft: 26 }}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Inline cloud linking */}
          {!cloud?.bound ? (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connect Organization</div>
              <div className="flex gap-6">
                <input className="input" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="Cloud URL (https://...)" style={{ flex: 1 }} />
                <button className="btn btn-accent" onClick={requestDeviceCode} disabled={cloudBusy || !cloudUrl.trim()} style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                  {cloudBusy ? 'Wait...' : 'Get Code'}
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
              {cloudErr && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{cloudErr}</div>}
            </div>
          ) : !roster?.roster_loaded ? (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Tournament</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                <strong style={{ color: 'var(--text)' }}>{cloud.org?.name}</strong> linked
              </div>
              <div className="flex gap-6">
                <select className="input" value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)} style={{ flex: 1 }}>
                  {(tournaments.length ? tournaments : [{ id: '', name: 'No tournaments', status: '' }]).map(t => (
                    <option key={t.id || 'none'} value={t.id}>{t.name || 'No tournaments'}</option>
                  ))}
                </select>
                <button className="btn btn-accent" onClick={selectTournament} disabled={cloudBusy || !selectedTournament} style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                  {cloudBusy ? 'Linking...' : 'Link'}
                </button>
              </div>
            </div>
          ) : null}

          {rosterMsg && (
            <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,255,195,0.08)', color: 'var(--accent)', border: '1px solid rgba(0,255,195,0.12)', marginTop: 8 }}>
              {rosterMsg}
            </div>
          )}
        </div>
      )}

      {/* ── READY: Roster loaded, waiting for game ── */}
      {matchState === 'ready' && (
        <>
          {/* Stats */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            {[
              { label: 'Teams', value: roster?.team_count ?? 0, color: 'var(--purple)' },
              { label: 'Players', value: roster?.player_count ?? 0, color: 'var(--accent)' },
              { label: 'Source', value: roster?.roster_source === 'cloud' ? 'Cloud' : 'File', color: 'var(--amber)' },
              { label: 'Widgets', value: widgetCount, color: widgetCount > 0 ? 'var(--accent)' : 'var(--text-faint)' },
            ].map((s, i) => (
              <div key={i} className="stat-box">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Roster preview + waiting state */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="tile-header">
              <span className="tile-title">Roster</span>
              {cloud?.tournament?.name && (
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{cloud.tournament.name}</span>
              )}
            </div>

            {/* Team chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
              {(roster?.teams_preview ?? []).map(t => (
                <span key={t.slot_number} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-faint)', fontWeight: 800, fontSize: 9 }}>{String(t.slot_number).padStart(2, '0')}</span>{' '}
                  {t.short_name || t.name}
                </span>
              ))}
            </div>

            {/* Waiting indicator */}
            {teams.length === 0 && (
              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>
                <div style={{ marginBottom: 4 }}>Waiting for game client data...</div>
                <div style={{ fontSize: 10 }}>Game telemetry will appear here once the match starts</div>
              </div>
            )}

            {/* If we have team data in lobby, show preview */}
            {teams.length > 0 && (
              <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="table-header" style={{ gridTemplateColumns: '32px 1fr 60px' }}>
                  <span>#</span><span>Team</span><span style={{ textAlign: 'center' }}>Players</span>
                </div>
                {teams.slice(0, 10).map((t, i) => (
                  <div key={t.teamName} className="table-row" style={{ gridTemplateColumns: '32px 1fr 60px' }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-faint)' }}>{i + 1}</span>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{t.displayName || t.shortName || t.teamName}</span>
                    <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>{t.liveMemberNum}/4</span>
                  </div>
                ))}
                {teams.length > 10 && (
                  <div style={{ padding: '6px 14px', fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>+{teams.length - 10} more</div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── LIVE: Match in progress ────────────── */}
      {matchState === 'live' && (
        <>
          {/* Live stats */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            {[
              { label: 'Teams Alive', value: `${alive}/${teams.length}`, color: alive > 5 ? 'var(--accent)' : alive > 1 ? 'var(--amber)' : 'var(--red)' },
              { label: 'Total Kills', value: kills, color: 'var(--red)' },
              { label: 'Widgets', value: widgetCount, color: widgetCount > 0 ? 'var(--accent)' : 'var(--text-faint)' },
              { label: 'Phase', value: 'IN GAME', color: 'var(--red)' },
            ].map((s, i) => (
              <div key={i} className="stat-box">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Live leaderboard */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="tile-header">
              <div className="flex items-center gap-8">
                <span className="tile-title">Leaderboard</span>
                <div className="live-dot" />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{teams.length} teams</span>
            </div>

            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div className="table-header" style={{ gridTemplateColumns: '32px 1fr 60px 60px 70px' }}>
                <span>#</span><span>Team</span><span style={{ textAlign: 'center' }}>Alive</span><span style={{ textAlign: 'center' }}>Kills</span><span style={{ textAlign: 'right' }}>Pts</span>
              </div>
              {teams.map((t, i) => (
                <div key={t.teamName} className="table-row" style={{
                  gridTemplateColumns: '32px 1fr 60px 60px 70px',
                  opacity: t.liveMemberNum === 0 ? 0.5 : 1,
                }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--purple)' : i === 2 ? 'var(--amber)' : 'var(--text-faint)' }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{t.displayName || t.shortName || t.teamName}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: t.liveMemberNum > 0 ? 'var(--accent)' : 'var(--red)' }}>{t.liveMemberNum}/4</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12 }}>{t.kills}</span>
                  <span style={{ textAlign: 'right', fontWeight: 800, fontSize: 12 }}>{t.totalPoints}</span>
                </div>
              ))}
            </div>

            {/* MVP */}
            {game?.spotlight && game.spotlight.kills > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(124,106,252,0.05)', border: '1px solid rgba(124,106,252,0.1)' }}>
                <div className="flex items-center gap-10">
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, rgba(0,255,195,0.1), rgba(124,106,252,0.1))',
                    border: '1px solid rgba(0,255,195,0.12)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 16, fontWeight: 900, color: 'var(--accent)',
                  }}>
                    {game.spotlight.kills}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{game.spotlight.playerName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{game.spotlight.teamName}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: 'rgba(124,106,252,0.12)', color: 'var(--purple)' }}>MVP</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── FINISHED: Post-match results ────────── */}
      {matchState === 'finished' && (
        <>
          {/* Final stats */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            {[
              { label: 'Winner', value: teams[0]?.displayName || teams[0]?.shortName || teams[0]?.teamName || '-', color: 'var(--accent)' },
              { label: 'Total Kills', value: kills, color: 'var(--red)' },
              { label: 'Teams', value: teams.length, color: 'var(--purple)' },
              { label: 'Status', value: 'DONE', color: 'var(--accent)' },
            ].map((s, i) => (
              <div key={i} className="stat-box">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Final standings */}
          <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(0,255,195,0.12)' }}>
            <div className="tile-header">
              <div className="flex items-center gap-8">
                <span className="tile-title">Final Standings</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: 'rgba(0,255,195,0.08)', color: 'var(--accent)' }}>MATCH COMPLETE</span>
              </div>
            </div>

            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div className="table-header" style={{ gridTemplateColumns: '32px 1fr 60px 70px' }}>
                <span>#</span><span>Team</span><span style={{ textAlign: 'center' }}>Kills</span><span style={{ textAlign: 'right' }}>Total</span>
              </div>
              {teams.map((t, i) => (
                <div key={t.teamName} className="table-row" style={{ gridTemplateColumns: '32px 1fr 60px 70px' }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--purple)' : i === 2 ? 'var(--amber)' : 'var(--text-faint)' }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{t.displayName || t.shortName || t.teamName}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--red)' }}>{t.kills}</span>
                  <span style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: i === 0 ? 'var(--accent)' : 'var(--text)' }}>{t.totalPoints}</span>
                </div>
              ))}
            </div>

            {/* MVP */}
            {game?.spotlight && game.spotlight.kills > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(124,106,252,0.05)', border: '1px solid rgba(124,106,252,0.1)' }}>
                <div className="flex items-center gap-10">
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, rgba(0,255,195,0.1), rgba(124,106,252,0.1))',
                    border: '1px solid rgba(0,255,195,0.12)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 16, fontWeight: 900, color: 'var(--accent)',
                  }}>
                    {game.spotlight.kills}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{game.spotlight.playerName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{game.spotlight.teamName} - Match MVP</div>
                  </div>
                </div>
              </div>
            )}

            {/* Cloud sync indicator */}
            <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(0,255,195,0.08)', fontSize: 11, color: 'var(--text-dim)' }}>
              Results auto-synced to cloud
            </div>
          </div>
        </>
      )}

      {/* ── Bottom row: Quick actions ────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: matchState === 'setup' ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* Widgets card — always visible when roster loaded */}
        {matchState !== 'setup' && (
          <div className="card">
            <div className="tile-header">
              <span className="tile-title">Overlays</span>
              <a href="/controller" className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>Controller</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {[
                { key: 'leaderboard', label: 'Ranking' },
                { key: 'killfeed', label: 'Kill Feed' },
                { key: 'playercard', label: 'Player' },
                { key: 'elimination', label: 'Elim' },
                { key: 'results', label: 'Results' },
                { key: 'mvp', label: 'MVP' },
                { key: 'fraggers', label: 'Fraggers' },
                { key: 'wwcd', label: 'WWCD' },
                { key: 'teamlist', label: 'Teams' },
              ].map(w => {
                const on = widgets[w.key] ?? false;
                return (
                  <div key={w.key} style={{
                    padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                    background: on ? 'rgba(0,255,195,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${on ? 'rgba(0,255,195,0.15)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: on ? 'var(--accent)' : 'var(--text-faint)', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: on ? 'var(--text)' : 'var(--text-faint)' }}>{w.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-faint)' }}>
              OBS: <span className="mono">localhost:3001/overlay/master</span>
            </div>
          </div>
        )}

        {/* Cloud / Sync — collapsible when not in setup */}
        {matchState !== 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Cloud status */}
            <div className="card" style={{ flex: 1 }}>
              <div className="tile-header" onClick={() => setShowCloud(!showCloud)} style={{ cursor: 'pointer' }}>
                <div className="flex items-center gap-8">
                  <span className="tile-title">Cloud</span>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                    background: cloud?.bound ? 'rgba(0,255,195,0.08)' : 'rgba(255,255,255,0.04)',
                    color: cloud?.bound ? 'var(--accent)' : 'var(--text-faint)',
                  }}>
                    {cloud?.bound ? 'LINKED' : 'NOT LINKED'}
                  </span>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-faint)', transform: showCloud ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M3 4.5L6 7.5L9 4.5" />
                </svg>
              </div>

              {cloud?.bound && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  <strong style={{ color: 'var(--text)' }}>{cloud.org?.name}</strong>
                  {cloud.tournament?.name && <span style={{ color: 'var(--text-faint)' }}> / {cloud.tournament.name}</span>}
                </div>
              )}

              {showCloud && (
                <div className="animate-in" style={{ marginTop: 10 }}>
                  {!cloud?.bound ? (
                    <div>
                      <div className="flex gap-6" style={{ marginBottom: 6 }}>
                        <input className="input" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="Cloud URL" style={{ flex: 1 }} />
                        <button className="btn btn-accent" onClick={requestDeviceCode} disabled={cloudBusy || !cloudUrl.trim()} style={{ fontSize: 11 }}>
                          {cloudBusy ? 'Wait...' : 'Get Code'}
                        </button>
                      </div>
                      {deviceCode && (
                        <div className="flex items-center gap-6" style={{ marginTop: 6 }}>
                          <span className="mono glow-cyan" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.15em' }}>{deviceCode}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                            {deviceStatus === 'waiting' ? 'Enter on cloud dashboard' : deviceStatus === 'approved' ? 'Approved' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-6">
                        <select className="input" value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)} style={{ flex: 1 }}>
                          {(tournaments.length ? tournaments : [{ id: '', name: 'No tournaments', status: '' }]).map(t => (
                            <option key={t.id || 'none'} value={t.id}>{t.name || 'No tournaments'}</option>
                          ))}
                        </select>
                        <button className="btn" onClick={refreshTournaments} disabled={cloudBusy} style={{ fontSize: 11 }}>Refresh</button>
                        <button className="btn btn-accent" onClick={selectTournament} disabled={cloudBusy || !selectedTournament} style={{ fontSize: 11 }}>Link</button>
                      </div>
                      <div style={{ marginTop: 8, textAlign: 'right' }}>
                        <button className="btn" onClick={async () => {
                          try { await fetch('/api/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) }); } catch {}
                          setCloud(null); setDeviceCode(''); setDeviceStatus('idle');
                        }} style={{ fontSize: 10, padding: '3px 8px', color: 'var(--text-faint)' }}>Re-link</button>
                      </div>
                    </div>
                  )}
                  {cloudErr && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{cloudErr}</div>}
                  {rosterMsg && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>{rosterMsg}</div>}
                </div>
              )}
            </div>

            {/* Sync */}
            <div className="card" style={{ flex: 1, borderColor: sync.connected ? 'rgba(124,106,252,0.12)' : undefined }}>
              <div className="tile-header" onClick={() => !sync.connected && setShowSync(!showSync)} style={{ cursor: sync.connected ? 'default' : 'pointer' }}>
                <div className="flex items-center gap-8">
                  <span className="tile-title">Sync</span>
                  {sync.connected && <div className="pill-dot" style={{ background: 'var(--purple)', boxShadow: '0 0 6px rgba(124,106,252,0.5)' }} />}
                </div>
                {sync.connected ? (
                  <button className="btn btn-red" onClick={stopSync} style={{ fontSize: 10, padding: '3px 8px' }}>Stop</button>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-faint)', transform: showSync ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M3 4.5L6 7.5L9 4.5" />
                  </svg>
                )}
              </div>

              {sync.connected && (
                <div className="animate-in">
                  <div className="flex items-center gap-10" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: sync.role === 'leader' ? 'var(--red)' : 'var(--accent)' }}>{sync.role}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{sync.peerCount} peers</span>
                  </div>
                  {sync.syncCode && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Code: <span className="mono" style={{ fontWeight: 800, letterSpacing: '0.1em', color: sync.role === 'leader' ? 'var(--red)' : 'var(--accent)' }}>{sync.syncCode}</span>
                    </div>
                  )}
                </div>
              )}

              {!sync.connected && showSync && (
                <div className="animate-in" style={{ marginTop: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button className="btn" onClick={startLeader} disabled={syncBusy || !roster?.has_cloud_config} style={{
                      width: '100%', fontSize: 11, borderColor: 'rgba(255,78,78,0.15)', color: roster?.has_cloud_config ? 'var(--red)' : 'var(--text-faint)',
                    }}>
                      {syncBusy ? 'Wait...' : !roster?.has_cloud_config ? 'Link first' : 'Start Leader'}
                    </button>
                    <div className="flex gap-4">
                      <input className="input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="Code" maxLength={6} style={{ flex: 1, textAlign: 'center', fontWeight: 800, letterSpacing: '0.12em', fontSize: 12 }} />
                      <button className="btn btn-accent" onClick={joinFollower} disabled={syncBusy || joinCode.length !== 6} style={{ fontSize: 11 }}>Join</button>
                    </div>
                  </div>
                  {syncErr && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{syncErr}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sync card for setup state */}
        {matchState === 'setup' && (
          <div className="card" style={{ borderColor: sync.connected ? 'rgba(124,106,252,0.12)' : undefined }}>
            <div className="tile-header">
              <span className="tile-title">Multi-PC Sync</span>
              {sync.connected && <button className="btn btn-red" onClick={stopSync} style={{ fontSize: 10, padding: '3px 8px' }}>Stop</button>}
            </div>
            {!sync.connected ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Leader</div>
                  <button className="btn" onClick={startLeader} disabled={syncBusy || !roster?.has_cloud_config} style={{ width: '100%', fontSize: 11, color: 'var(--text-faint)' }}>
                    {!roster?.has_cloud_config ? 'Link tournament first' : 'Start Broadcasting'}
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Follower</div>
                  <div className="flex gap-4">
                    <input className="input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="Code" maxLength={6} style={{ flex: 1, textAlign: 'center', fontWeight: 800, letterSpacing: '0.12em', fontSize: 12 }} />
                    <button className="btn btn-accent" onClick={joinFollower} disabled={syncBusy || joinCode.length !== 6} style={{ fontSize: 11 }}>Join</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in">
                <div className="flex items-center gap-10">
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: sync.role === 'leader' ? 'var(--red)' : 'var(--accent)' }}>{sync.role}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{sync.peerCount} peers</span>
                  {sync.syncCode && <span className="mono" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em' }}>{sync.syncCode}</span>}
                </div>
              </div>
            )}
            {syncErr && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{syncErr}</div>}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <div className="flex items-center" style={{ justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-faint)' }}>
        <span>Live Stat Local Engine</span>
        <span className="mono">:3001</span>
      </div>
    </div>
  );
}
