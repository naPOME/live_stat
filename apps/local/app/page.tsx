'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  SignIn,
  Target,
  ArrowsClockwise,
  GameController,
  Cloud,
  Trophy,
  Broadcast,
  CircleNotch,
} from '@phosphor-icons/react';

/* ── Types ────────────────────────────────────────── */
type LifecyclePhase = 'idle' | 'ready' | 'warmup' | 'live' | 'finished' | 'synced';

interface Notification { id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; timestamp: number; dismissed: boolean; }
interface Lifecycle { phase: LifecyclePhase; rosterLoaded: boolean; gameClientConnected: boolean; lastTelemetryAt: number | null; syncResult: 'pending' | 'success' | 'failed' | null; syncError: string | null; notifications: Notification[]; matchNumber: number; matchId: string | null; }

interface OrgInfo { id: string; name: string; brand_color: string; logo_path: string | null; }
interface TeamInfo { slot_number: number; team_id: string; name: string; short_name: string; brand_color: string; logo_path: string | null; player_count: number; }
interface PointSystemInfo { kill_points: number; placement_points: Record<string, number>; }
interface RosterInfo { roster_loaded: boolean; team_count: number; player_count: number; tournament_id?: string | null; stage_name?: string | null; group_name?: string | null; match_id?: string | null; org: OrgInfo | null; point_system: PointSystemInfo | null; teams: TeamInfo[]; has_cloud_config?: boolean; error?: string | null; roster_source?: string | null; }
interface LiveTeam { teamName: string; displayName?: string; shortName?: string; brandColor?: string; kills: number; totalPoints: number; liveMemberNum: number; alive: boolean; placement?: number; }
interface GameData { phase?: string; teams: LiveTeam[]; spotlight?: { playerName: string; displayName?: string; teamName: string; kills: number }; players?: { playerName: string; displayName?: string; teamName: string; kills: number; damage: number; headshots: number; }[]; }
interface SyncStatus { role: string; connected: boolean; peerCount: number; syncCode: string | null; }
interface WatcherStatus {
  watcher?: { running: boolean; activeCount: number; active: string[] };
  parser?: { lastEventAt: number | null; eventsTotal: number; errorsTotal: number; lastError: string | null };
}
interface DemoModeStatus { enabled: boolean; }

interface AuthInfo { configured: boolean; logged_in: boolean; user: { id: string; email: string } | null; org: { id: string; name: string } | null; }
interface TournamentInfo { id: string; name: string; status: string; format: string; stages?: StageInfo[]; }
interface StageInfo { id: string; name: string; stage_order: number; status: string; matches?: MatchInfo[]; }
interface MatchInfo { id: string; name: string; map: string | null; status: string; }
interface MatchSelection { selected: boolean; tournament_name?: string; stage_name?: string; match_name?: string; match_map?: string; team_count?: number; player_count?: number; }

/* ── Dashboard ────────────────────────────────────── */
export default function Dashboard() {
  const [lc, setLc] = useState<Lifecycle>({ phase: 'idle', rosterLoaded: false, gameClientConnected: false, lastTelemetryAt: null, syncResult: null, syncError: null, notifications: [], matchNumber: 1, matchId: null });
  const [game, setGame] = useState<GameData | null>(null);
  const [roster, setRoster] = useState<RosterInfo | null>(null);
  const [widgets, setWidgets] = useState<Record<string, boolean>>({});
  const [sync, setSync] = useState<SyncStatus>({ role: 'standalone', connected: false, peerCount: 0, syncCode: null });
  const [watcher, setWatcher] = useState<WatcherStatus | null>(null);
  const [demoMode, setDemoMode] = useState<DemoModeStatus>({ enabled: false });
  const [demoModeBusy, setDemoModeBusy] = useState(false);
  const [demoModeErr, setDemoModeErr] = useState('');

  // Auth
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginErr, setLoginErr] = useState('');

  // Match picker
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentInfo | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageInfo | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchInfo | null>(null);
  const [matchSelection, setMatchSelection] = useState<MatchSelection | null>(null);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerErr, setPickerErr] = useState('');

  // Sync & Export
  const [joinCode, setJoinCode] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncErr, setSyncErr] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportErr, setExportErr] = useState('');
  const [visibleToasts, setVisibleToasts] = useState<Notification[]>([]);
  const toastTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /* ── SSE: Lifecycle ────────────────────────────── */
  useEffect(() => {
    const es = new EventSource('/api/lifecycle?stream=1');
    es.onmessage = e => {
      try {
        const data = JSON.parse(e.data) as Lifecycle;
        setLc(prev => {
          const prevIds = new Set(prev.notifications.map(n => n.id));
          const newNotifs = data.notifications.filter(n => !n.dismissed && !prevIds.has(n.id));
          if (newNotifs.length > 0) {
            setVisibleToasts(t => [...t, ...newNotifs].slice(-4));
            for (const n of newNotifs) {
              const timer = setTimeout(() => { setVisibleToasts(t => t.filter(x => x.id !== n.id)); toastTimers.current.delete(n.id); }, 5000);
              toastTimers.current.set(n.id, timer);
            }
          }
          return data;
        });
      } catch {}
    };
    return () => es.close();
  }, []);

  /* ── Data fetching ─────────────────────────────── */
  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then(d => {
      const data = d?.data ?? d;
      if (data?.teams) setGame({ phase: data.phase, teams: data.teams, spotlight: data.spotlight, players: data.players });
    }).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Check auth status
    fetch('/api/auth').then(r => r.json()).then(d => {
      setAuth(d);
      if (d.logged_in) loadTournaments();
    }).catch(() => {});
    // Check match selection
    fetch('/api/match-select').then(r => r.json()).then(d => {
      if (d?.selected) setMatchSelection(d);
    }).catch(() => {});
    fetch('/api/roster').then(r => r.json()).then(d => setRoster(d?.data ?? d)).catch(() => {});
    fetch('/api/widgets').then(r => r.json()).then(setWidgets).catch(() => {});
    const wes = new EventSource('/api/widgets?stream=1');
    wes.onmessage = e => { try { setWidgets(JSON.parse(e.data)); } catch {} };
    fetch('/api/sync').then(r => r.json()).then(setSync).catch(() => {});
    const ses = new EventSource('/api/sync?stream=1');
    ses.onmessage = e => { try { setSync(JSON.parse(e.data)); } catch {} };
    return () => { wes.close(); ses.close(); };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadStatus = () => {
      fetch('/api/watcher')
        .then(r => r.json())
        .then(d => {
          if (!alive) return;
          setWatcher(d);
        })
        .catch(() => {});
      fetch('/api/demo-mode')
        .then(r => r.json())
        .then(d => {
          if (!alive) return;
          if (typeof d?.enabled === 'boolean') setDemoMode({ enabled: d.enabled });
        })
        .catch(() => {});
    };

    loadStatus();
    const id = setInterval(loadStatus, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  /* ── Actions ───────────────────────────────────── */
  async function doLogin() {
    setLoginBusy(true); setLoginErr('');
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email, password }) });
      const d = await res.json();
      if (!d.ok) { setLoginErr(d.error || 'Login failed'); return; }
      setAuth({ configured: true, logged_in: true, user: d.user, org: d.org });
      loadTournaments();
    } catch { setLoginErr('Network error'); } finally { setLoginBusy(false); }
  }
  async function doLogout() {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    setAuth({ configured: true, logged_in: false, user: null, org: null });
    setTournaments([]); setSelectedTournament(null); setSelectedStage(null); setSelectedMatch(null); setMatchSelection(null);
  }
  async function loadTournaments() {
    try { const res = await fetch('/api/tournaments'); const d = await res.json(); if (d.ok) setTournaments(d.tournaments ?? []); } catch {}
  }
  async function loadTournamentDetail(id: string) {
    setPickerBusy(true); setPickerErr('');
    try {
      const res = await fetch(`/api/tournaments?id=${id}`);
      const d = await res.json();
      if (d.ok && d.tournament) {
        const t = d.tournament as TournamentInfo;
        setSelectedTournament(t);
        // Auto-select first active stage
        const stages = (t.stages ?? []).sort((a: StageInfo, b: StageInfo) => a.stage_order - b.stage_order);
        const active = stages.find((s: StageInfo) => s.status === 'active') ?? stages[0];
        if (active) { setSelectedStage(active); setSelectedMatch(active.matches?.[0] ?? null); }
      }
    } catch { setPickerErr('Failed to load tournament'); } finally { setPickerBusy(false); }
  }
  async function doSelectMatch() {
    if (!selectedTournament || !selectedMatch) return;
    setPickerBusy(true); setPickerErr('');
    try {
      const res = await fetch('/api/match-select', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: selectedTournament.id,
          stage_id: selectedStage?.id,
          match_id: selectedMatch.id,
        }),
      });
      const d = await res.json();
      if (!d.ok) { setPickerErr(d.error || 'Failed'); return; }
      setMatchSelection({ selected: true, tournament_name: d.tournament_name, stage_name: d.stage_name, match_name: d.match_name, match_map: d.match_map, team_count: d.team_count, player_count: d.player_count });
      // Reload roster
      const r = await fetch('/api/roster'); const rd = await r.json(); setRoster(rd?.data ?? rd);
    } catch { setPickerErr('Network error'); } finally { setPickerBusy(false); }
  }
  const startLeader = async () => { setSyncBusy(true); setSyncErr(''); try { const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start-leader' }) }); const d = await res.json(); if (d.ok && d.status) setSync(d.status); else setSyncErr(d.error || 'Failed'); } catch { setSyncErr('Network error'); } finally { setSyncBusy(false); } };
  const joinFollower = async () => { if (joinCode.length !== 6) return; setSyncBusy(true); setSyncErr(''); try { const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', code: joinCode }) }); const d = await res.json(); if (d.ok && d.status) setSync(d.status); else setSyncErr(d.error || 'Failed'); } catch { setSyncErr('Network error'); } finally { setSyncBusy(false); } };
  const stopSync = () => fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop' }) });
  const resetMatch = () => fetch('/api/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }) });
  const retrySync = () => fetch('/api/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'retry-sync' }) });
  async function runExport() { setExportBusy(true); setExportErr(''); try { const res = await fetch('/api/cloud/sync-export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); const d = await res.json(); if (d.ok) { setExportDone(true); setTimeout(() => setExportDone(false), 5000); } else { setExportErr(d.error || 'Export failed'); } } catch { setExportErr('Network error'); } finally { setExportBusy(false); } }
  async function toggleDemoMode() {
    setDemoModeBusy(true);
    setDemoModeErr('');
    try {
      const res = await fetch('/api/demo-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !demoMode.enabled }),
      });
      const d = await res.json();
      if (!d.ok || typeof d.enabled !== 'boolean') {
        setDemoModeErr(d?.error || 'Toggle failed');
        return;
      }
      setDemoMode({ enabled: d.enabled });
    } catch {
      setDemoModeErr('Network error');
    } finally {
      setDemoModeBusy(false);
    }
  }

  /* ── Derived ───────────────────────────────────── */
  const phase = lc.phase;
  const teams = game?.teams ?? [];
  const alive = teams.filter(t => t.liveMemberNum > 0).length;
  const kills = teams.reduce((s, t) => s + t.kills, 0);
  const widgetCount = Object.values(widgets).filter(Boolean).length;
  const connAge = lc.lastTelemetryAt ? (Date.now() - lc.lastTelemetryAt) / 1000 : Infinity;
  const connColor = connAge < 5 ? 'var(--green)' : connAge < 15 ? 'var(--amber)' : 'var(--red)';
  const watcherRunning = watcher?.watcher?.running ?? false;
  const watcherActiveCount = watcher?.watcher?.activeCount ?? 0;
  const watcherLastEventAt = watcher?.parser?.lastEventAt ?? null;
  const watcherLastEventAge = watcherLastEventAt ? (Date.now() - watcherLastEventAt) / 1000 : Infinity;
  const watcherColor = watcherRunning
    ? watcherLastEventAge < 5
      ? 'var(--green)'
      : watcherLastEventAge < 15
        ? 'var(--amber)'
        : 'var(--red)'
    : 'var(--text-faint)';
  const watcherStatus = !watcherRunning
    ? 'OFF'
    : watcherLastEventAge < 5
      ? 'LIVE'
      : watcherLastEventAge < 15
        ? 'SLOW'
        : 'STALE';
  const org = roster?.org ?? (auth?.org ? { id: auth.org.id, name: auth.org.name, brand_color: '#2F6B3F', logo_path: null } : null);
  const orgAccent = org?.brand_color || 'var(--accent)';
  const hasOrg = !!auth?.logged_in && !!matchSelection?.selected;

  const topFraggers = [...(game?.players ?? [])].sort((a, b) => b.kills - a.kills || b.damage - a.damage).slice(0, 5);

  const phaseMeta: Record<LifecyclePhase, { label: string; color: string; bg: string }> = {
    idle:     { label: 'SETUP',    color: 'var(--text-faint)', bg: 'rgba(85,85,85,0.08)' },
    ready:    { label: 'READY',    color: 'var(--purple)',     bg: 'var(--purple-soft)' },
    warmup:   { label: 'WARMUP',   color: 'var(--amber)',      bg: 'var(--amber-soft)' },
    live:     { label: 'LIVE',     color: 'var(--red)',        bg: 'var(--red-soft)' },
    finished: { label: 'FINISHED', color: 'var(--green)',      bg: 'var(--green-soft)' },
    synced:   { label: 'SYNCED',   color: 'var(--accent)',     bg: 'var(--accent-soft)' },
  };
  const { label: phaseLabel, color: phaseColor, bg: phaseBg } = phaseMeta[phase];

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Toasts ──────────────────────────────────── */}
      <div style={{ position: 'fixed', top: 56, right: 24, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {visibleToasts.map(n => (
          <div key={n.id} className="animate-in" style={{
            padding: '10px 16px', borderRadius: 'var(--radius)',
            background: n.type === 'error' ? 'var(--red-soft)' : n.type === 'warning' ? 'var(--amber-soft)' : n.type === 'success' ? 'var(--green-soft)' : 'var(--bg-raised)',
            border: `1px solid ${n.type === 'error' ? 'rgba(239,68,68,0.15)' : n.type === 'warning' ? 'rgba(245,158,11,0.15)' : n.type === 'success' ? 'rgba(34,197,94,0.15)' : 'var(--border)'}`,
            fontSize: 12, fontWeight: 600,
            color: n.type === 'error' ? 'var(--red)' : n.type === 'warning' ? 'var(--amber)' : n.type === 'success' ? 'var(--green)' : 'var(--text)',
            pointerEvents: 'auto', maxWidth: 320,
          }}>{n.message}</div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── Header row ────────────────────────────────  */}
      {/* ═══════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {hasOrg ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius)', overflow: 'hidden',
                background: `${orgAccent}12`, border: `1px solid ${orgAccent}18`,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                {org?.logo_path ? (
                  <img src={org.logo_path} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 900, color: orgAccent }}>{org?.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{org?.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 12, color: 'var(--text-faint)' }}>
                  {matchSelection?.tournament_name && <span>{matchSelection.tournament_name}</span>}
                  {matchSelection?.stage_name && <><span style={{ opacity: 0.3 }}>/</span><span>{matchSelection.stage_name}</span></>}
                  {matchSelection?.match_name && <><span style={{ opacity: 0.3 }}>/</span><span>{matchSelection.match_name}</span></>}
                </div>
              </div>
            </div>
          ) : (
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</h1>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lc.gameClientConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: connColor, fontWeight: 600 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: connColor }} />
              {connAge < 5 ? 'Connected' : connAge < 15 ? 'Slow' : 'Lost'}
            </div>
          )}
          <div className="pill" style={{ color: phaseColor, borderColor: `color-mix(in srgb, ${phaseColor} 15%, transparent)`, background: phaseBg }}>
            {phase === 'live' && <div className="live-dot" style={{ width: 6, height: 6 }} />}
            {phase !== 'live' && <div className="pill-dot" style={{ background: phaseColor }} />}
            {phaseLabel}
          </div>
          {sync.connected && (
            <div className="pill" style={{ color: 'var(--purple)', borderColor: 'rgba(168,85,247,0.15)', background: 'var(--purple-soft)' }}>
              <div className="pill-dot" style={{ background: 'var(--purple)' }} />
              {sync.role.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── IDLE: Setup ───────────────────────────────  */}
      {/* ═══════════════════════════════════════════════ */}
      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Step indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { n: '1', title: 'Login', desc: 'Sign in to cloud', done: !!auth?.logged_in, icon: <SignIn size={14} /> },
              { n: '2', title: 'Select Match', desc: 'Pick tournament & match', done: !!matchSelection?.selected, icon: <Target size={14} /> },
              { n: '3', title: 'Sync PCOB', desc: 'Logos to C:/logo', done: exportDone, icon: <ArrowsClockwise size={14} /> },
              { n: '4', title: 'Start Game', desc: 'Begin spectating', done: lc.gameClientConnected, icon: <GameController size={14} /> },
            ].map(s => (
              <div key={s.n} className="metric-card" style={{
                borderColor: s.done ? 'rgba(34,197,94,0.12)' : 'var(--border)',
                padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 800,
                    background: s.done ? 'var(--green-soft)' : 'var(--bg-hover)',
                    color: s.done ? 'var(--green)' : 'var(--text-faint)',
                    border: `1px solid ${s.done ? 'rgba(34,197,94,0.15)' : 'var(--border)'}`,
                  }}>
                    {s.done ? <Check size={14} weight="bold" /> : s.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.done ? 'var(--green)' : 'var(--text)' }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Step 1: Login ───────────────────────────── */}
          {!auth?.logged_in && (
            <div className="card">
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sign In</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={{ fontFamily: 'var(--sans)' }} onKeyDown={e => e.key === 'Enter' && doLogin()} />
                <input className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={{ fontFamily: 'var(--sans)' }} onKeyDown={e => e.key === 'Enter' && doLogin()} />
                <button className="btn btn-accent" onClick={doLogin} disabled={loginBusy || !email.trim() || !password} style={{ width: '100%' }}>
                  {loginBusy ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
              {loginErr && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{loginErr}</div>}
            </div>
          )}

          {/* ── Step 2: Match Picker ────────────────────── */}
          {auth?.logged_in && !matchSelection?.selected && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Match</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                    <strong style={{ color: 'var(--text)' }}>{auth.org?.name}</strong> — {auth.user?.email}
                  </div>
                </div>
                <button className="btn" onClick={doLogout} style={{ fontSize: 10, padding: '3px 10px' }}>Logout</button>
              </div>

              {/* Tournament selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select className="input" value={selectedTournament?.id ?? ''} onChange={e => { const t = tournaments.find(x => x.id === e.target.value); if (t) loadTournamentDetail(t.id); }} style={{ flex: 1, fontFamily: 'var(--sans)' }}>
                  <option value="">Select tournament...</option>
                  {tournaments.filter(t => t.status === 'active').map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Stage selector */}
              {selectedTournament?.stages && selectedTournament.stages.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <select className="input" value={selectedStage?.id ?? ''} onChange={e => { const s = selectedTournament.stages?.find(x => x.id === e.target.value); if (s) { setSelectedStage(s); setSelectedMatch(s.matches?.[0] ?? null); } }} style={{ flex: 1, fontFamily: 'var(--sans)' }}>
                    {selectedTournament.stages.sort((a, b) => a.stage_order - b.stage_order).map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.status === 'active' ? '(active)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Match selector */}
              {selectedStage?.matches && selectedStage.matches.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <select className="input" value={selectedMatch?.id ?? ''} onChange={e => { const m = selectedStage.matches?.find(x => x.id === e.target.value); if (m) setSelectedMatch(m); }} style={{ flex: 1, fontFamily: 'var(--sans)' }}>
                    {selectedStage.matches.map(m => (
                      <option key={m.id} value={m.id}>{m.name}{m.map ? ` — ${m.map}` : ''}{m.status === 'finished' ? ' (done)' : ''}</option>
                    ))}
                  </select>
                  <button className="btn btn-accent" onClick={doSelectMatch} disabled={pickerBusy || !selectedMatch} style={{ whiteSpace: 'nowrap' }}>
                    {pickerBusy ? 'Loading...' : 'Select'}
                  </button>
                </div>
              )}
              {pickerErr && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{pickerErr}</div>}
            </div>
          )}

          {/* ── Match context banner ────────────────────── */}
          {matchSelection?.selected && (
            <div style={{
              padding: '12px 18px', borderRadius: 'var(--radius)',
              background: 'var(--accent-soft)', border: '1px solid rgba(59,130,246,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                  {matchSelection.match_map && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.12)', marginRight: 8, textTransform: 'uppercase' }}>{matchSelection.match_map}</span>}
                  {matchSelection.match_name} | {matchSelection.tournament_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                  {matchSelection.stage_name} — {matchSelection.team_count} teams, {matchSelection.player_count} players
                </div>
              </div>
              <button className="btn" onClick={() => { setMatchSelection(null); setSelectedTournament(null); setSelectedStage(null); setSelectedMatch(null); }} style={{ fontSize: 10, padding: '3px 10px' }}>Change</button>
            </div>
          )}

          {/* ── Step 3: Sync PCOB ───────────────────────── */}
          {matchSelection?.selected && !lc.gameClientConnected && (
            <div className="card" style={{ borderColor: exportDone ? 'rgba(34,197,94,0.12)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sync PCOB Files</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                    Download logos and generate .ini to <span className="mono" style={{ color: 'var(--text-faint)', fontSize: 11 }}>C:/logo</span>
                  </div>
                </div>
                <button className="btn btn-accent" onClick={runExport} disabled={exportBusy} style={{ whiteSpace: 'nowrap' }}>
                  {exportBusy ? (
                    <span className="flex items-center gap-6">
                      <CircleNotch size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Syncing...
                    </span>
                  ) : exportDone ? (
                    <span className="flex items-center gap-6">
                      <Check size={14} weight="bold" style={{ color: 'var(--green)' }} />
                      Done
                    </span>
                  ) : 'Sync Files'}
                </button>
              </div>
              {exportDone && (
                <div style={{ fontSize: 11, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--green-soft)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.1)' }}>
                  Logos downloaded and PCOB .ini generated. Ready to start game client.
                </div>
              )}
              {exportErr && (
                <div style={{ fontSize: 11, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.1)' }}>
                  {exportErr}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── READY: Waiting ────────────────────────────  */}
      {/* ═══════════════════════════════════════════════ */}
      {phase === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Teams', value: roster?.team_count ?? 0, color: 'var(--accent)' },
              { label: 'Players', value: roster?.player_count ?? 0, color: 'var(--purple)' },
              { label: 'Overlays', value: widgetCount, color: 'var(--cyan)' },
              { label: 'Kill Pts', value: roster?.point_system?.kill_points ?? 1, color: 'var(--amber)' },
            ].map((s, i) => (
              <div key={i} className="metric-card">
                <div className="metric-label">{s.label}</div>
                <div className="metric-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Team cards grid */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Teams</span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{roster?.team_count ?? 0} loaded</span>
            </div>
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
              {(roster?.teams ?? []).map(t => (
                <div key={t.slot_number} style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: `${t.brand_color}12`, border: `1px solid ${t.brand_color}18`,
                    display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 900, color: t.brand_color,
                  }}>{String(t.slot_number).padStart(2, '0')}</div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.short_name || t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{t.player_count} players</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waiting indicator */}
          <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div className="pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--purple)', margin: '0 auto 14px', boxShadow: '0 0 16px rgba(168,85,247,0.3)' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4 }}>Waiting for game client</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Start spectating in the game client</div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── WARMUP ────────────────────────────────────  */}
      {/* ═══════════════════════════════════════════════ */}
      {phase === 'warmup' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="flex items-center gap-8">
              <span style={{ fontSize: 14, fontWeight: 700 }}>Lobby</span>
              <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{teams.length} teams</span>
          </div>
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
            {teams.map((t, i) => (
              <div key={t.teamName} style={{
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div className="flex items-center gap-8">
                  <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', width: 18 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.brandColor || 'var(--text)' }}>{t.displayName || t.shortName || t.teamName}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{t.liveMemberNum}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── LIVE ──────────────────────────────────────  */}
      {/* ═══════════════════════════════════════════════ */}
      {phase === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Alive', value: `${alive}/${teams.length}`, color: alive > 5 ? 'var(--green)' : alive > 1 ? 'var(--amber)' : 'var(--red)', sub: 'teams remaining' },
              { label: 'Eliminations', value: kills, color: 'var(--red)', sub: 'total kills' },
              { label: 'Overlays', value: widgetCount, color: 'var(--cyan)', sub: 'active widgets' },
              { label: 'Match', value: `#${lc.matchNumber}`, color: 'var(--purple)', sub: `game ${lc.matchNumber}` },
            ].map((s, i) => (
              <div key={i} className="metric-card">
                <div className="metric-label">{s.label}</div>
                <div className="metric-value" style={{ color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Main content: leaderboard + sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
            {/* Leaderboard */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="flex items-center gap-8">
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Leaderboard</span>
                  <div className="live-dot" />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{teams.length} teams</span>
              </div>

              <div className="table-header" style={{ gridTemplateColumns: '30px 4px 1fr 55px 55px 65px' }}>
                <span>#</span><span></span><span>Team</span><span style={{ textAlign: 'center' }}>Alive</span><span style={{ textAlign: 'center' }}>Kills</span><span style={{ textAlign: 'right' }}>Pts</span>
              </div>
              {teams.map((t, i) => (
                <div key={t.teamName} className="table-row" style={{
                  gridTemplateColumns: '30px 4px 1fr 55px 55px 65px',
                  opacity: t.liveMemberNum === 0 ? 0.35 : 1,
                }}>
                  <span style={{ fontWeight: 900, fontSize: 12, color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--purple)' : i === 2 ? 'var(--amber)' : 'var(--text-muted)' }}>{i + 1}</span>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: t.brandColor || 'var(--text-muted)', opacity: 0.7 }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{t.displayName || t.shortName || t.teamName}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: t.liveMemberNum > 0 ? 'var(--green)' : 'var(--red)' }}>{t.liveMemberNum}/4</span>
                  <span style={{ textAlign: 'center', fontWeight: 800, fontSize: 13 }}>{t.kills}</span>
                  <span style={{ textAlign: 'right', fontWeight: 900, fontSize: 14 }}>{t.totalPoints}</span>
                </div>
              ))}
            </div>

            {/* Right sidebar: MVP + Top Fraggers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {game?.spotlight && game.spotlight.kills > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--purple)' }}>Match MVP</span>
                    <Trophy size={14} weight="fill" style={{ color: 'var(--amber)' }} />
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.03em' }}>{game.spotlight.kills}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{game.spotlight.displayName || game.spotlight.playerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{game.spotlight.teamName}</div>
                  </div>
                </div>
              )}

              {topFraggers.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)' }}>Top Fraggers</span>
                  </div>
                  {topFraggers.map((p, i) => (
                    <div key={p.playerName} style={{
                      padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: i < topFraggers.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <div className="flex items-center gap-8">
                        <span style={{ fontSize: 11, fontWeight: 900, color: i === 0 ? 'var(--accent)' : 'var(--text-muted)', width: 16 }}>{i + 1}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{p.displayName || p.playerName}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.teamName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--red)' }}>{p.kills}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.damage} dmg</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── FINISHED / SYNCED ─────────────────────────  */}
      {/* ═══════════════════════════════════════════════ */}
      {(phase === 'finished' || phase === 'synced') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Next match banner */}
          {phase === 'synced' && (
            <div style={{
              padding: '16px 20px', borderRadius: 'var(--radius-lg)',
              background: 'var(--accent-soft)', border: '1px solid rgba(59,130,246,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>Results synced to cloud</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>Ready for the next match</div>
              </div>
              <button className="btn btn-accent" onClick={resetMatch}>Next Match</button>
            </div>
          )}

          {/* Winner card */}
          {teams[0] && (
            <div style={{
              padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'center',
              background: 'var(--bg-card)',
              border: `1px solid ${teams[0].brandColor || orgAccent}18`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--amber)', marginBottom: 8 }}>Winner Winner Chicken Dinner</div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>{teams[0].displayName || teams[0].shortName || teams[0].teamName}</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 6 }}>
                {teams[0].kills} kills · {teams[0].totalPoints} points
              </div>
            </div>
          )}

          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Kills', value: kills, color: 'var(--red)' },
              { label: 'Teams', value: teams.length, color: 'var(--purple)' },
              { label: 'Sync Status', value: lc.syncResult === 'success' ? 'DONE' : lc.syncResult === 'pending' ? '...' : lc.syncResult === 'failed' ? 'FAIL' : 'WAIT', color: lc.syncResult === 'success' ? 'var(--green)' : lc.syncResult === 'failed' ? 'var(--red)' : 'var(--amber)' },
              { label: 'Match', value: `#${lc.matchNumber}`, color: 'var(--accent)' },
            ].map((s, i) => (
              <div key={i} className="metric-card">
                <div className="metric-label">{s.label}</div>
                <div className="metric-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Final standings + top fraggers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Final Standings</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'var(--green-soft)', color: 'var(--green)' }}>COMPLETE</span>
              </div>
              <div className="table-header" style={{ gridTemplateColumns: '30px 4px 1fr 55px 65px' }}>
                <span>#</span><span></span><span>Team</span><span style={{ textAlign: 'center' }}>Kills</span><span style={{ textAlign: 'right' }}>Total</span>
              </div>
              {teams.map((t, i) => (
                <div key={t.teamName} className="table-row" style={{ gridTemplateColumns: '30px 4px 1fr 55px 65px' }}>
                  <span style={{ fontWeight: 900, fontSize: 12, color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--purple)' : i === 2 ? 'var(--amber)' : 'var(--text-muted)' }}>{i + 1}</span>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: t.brandColor || 'var(--text-muted)', opacity: 0.7 }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{t.displayName || t.shortName || t.teamName}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--red)' }}>{t.kills}</span>
                  <span style={{ textAlign: 'right', fontWeight: 900, fontSize: 14, color: i === 0 ? 'var(--accent)' : 'var(--text)' }}>{t.totalPoints}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {game?.spotlight && game.spotlight.kills > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--purple)' }}>Match MVP</span>
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.03em' }}>{game.spotlight.kills}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{game.spotlight.displayName || game.spotlight.playerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{game.spotlight.teamName}</div>
                  </div>
                </div>
              )}

              {topFraggers.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)' }}>Top Fraggers</span>
                  </div>
                  {topFraggers.map((p, i) => (
                    <div key={p.playerName} style={{
                      padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: i < topFraggers.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <div className="flex items-center gap-8">
                        <span style={{ fontSize: 11, fontWeight: 900, color: i === 0 ? 'var(--accent)' : 'var(--text-muted)', width: 16 }}>{i + 1}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{p.displayName || p.playerName}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.teamName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--red)' }}>{p.kills}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.damage} dmg</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {lc.syncResult === 'failed' && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--red-soft)', border: '1px solid rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--red)' }}>Sync failed</span>
                  <button className="btn btn-red" onClick={retrySync} style={{ fontSize: 10, padding: '3px 8px' }}>Retry</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── Bottom bar: Overlays + Sync ───────────────  */}
      {/* ═══════════════════════════════════════════════ */}
      {phase !== 'idle' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Overlays */}
          <div className="card">
            <div className="tile-header">
              <span className="tile-title">Overlays</span>
              <a href="/controller" className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>Controller</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {[
                { key: 'leaderboard', label: 'Ranking' }, { key: 'killfeed', label: 'Kill Feed' }, { key: 'playercard', label: 'Player' },
                { key: 'elimination', label: 'Elim' }, { key: 'results', label: 'Results' }, { key: 'mvp', label: 'MVP' },
                { key: 'fraggers', label: 'Fraggers' }, { key: 'wwcd', label: 'WWCD' }, { key: 'teamlist', label: 'Teams' },
              ].map(w => {
                const on = widgets[w.key] ?? false;
                return (
                  <div key={w.key} style={{
                    padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                    background: on ? 'var(--accent-glow)' : 'var(--bg-inset)',
                    border: `1px solid ${on ? 'rgba(59,130,246,0.1)' : 'var(--border-subtle)'}`,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: on ? 'var(--green)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: on ? 'var(--text)' : 'var(--text-faint)' }}>{w.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-faint)' }}>
              OBS: <span className="mono" style={{ color: 'var(--text-dim)' }}>localhost:3001/overlay/master</span>
            </div>
          </div>

          {/* Cloud + Sync */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="card" style={{ flex: 1, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="flex items-center gap-8">
                  <Broadcast size={14} weight="duotone" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Ingest</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: `${watcherColor}20`, color: watcherColor }}>
                  {watcherStatus}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>
                <span>Watchers: {watcherActiveCount}</span>
                <span>Events: {watcher?.parser?.eventsTotal ?? 0}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>
                {watcherRunning ? (Number.isFinite(watcherLastEventAge) ? `Last event ${Math.round(watcherLastEventAge)}s ago` : 'Waiting for first event') : 'Watcher is not running'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: demoMode.enabled ? 'var(--amber)' : 'var(--text-faint)' }}>
                  Demo mode {demoMode.enabled ? 'ON' : 'OFF'}
                </span>
                <button className={demoMode.enabled ? 'btn btn-red' : 'btn'} onClick={toggleDemoMode} disabled={demoModeBusy} style={{ fontSize: 10, padding: '3px 10px' }}>
                  {demoModeBusy ? '...' : demoMode.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
              {demoModeErr && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 6 }}>{demoModeErr}</div>}
            </div>

            <div className="card" style={{ flex: 1, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div className="flex items-center gap-8">
                  <Cloud size={14} weight="duotone" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Cloud</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: auth?.logged_in ? 'var(--green-soft)' : 'var(--bg-hover)', color: auth?.logged_in ? 'var(--green)' : 'var(--text-faint)' }}>
                  {auth?.logged_in ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
              {auth?.logged_in && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  {auth.org?.name}{matchSelection?.tournament_name ? ` / ${matchSelection.tournament_name}` : ''}
                </div>
              )}
            </div>

            <div className="card" style={{ flex: 1, padding: '14px 16px', borderColor: sync.connected ? 'rgba(168,85,247,0.1)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div className="flex items-center gap-8">
                  <ArrowsClockwise size={12} weight="bold" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Sync</span>
                  {sync.connected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--purple)' }} />}
                </div>
                {sync.connected && <button className="btn btn-red" onClick={stopSync} style={{ fontSize: 10, padding: '3px 8px' }}>Stop</button>}
              </div>
              {sync.connected ? (
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  <span style={{ fontWeight: 800, textTransform: 'uppercase', color: sync.role === 'leader' ? 'var(--red)' : 'var(--accent)' }}>{sync.role}</span>
                  {' '}{sync.peerCount} peers
                  {sync.syncCode && <span className="mono" style={{ marginLeft: 8, fontWeight: 800, letterSpacing: '0.1em' }}>{sync.syncCode}</span>}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="btn" onClick={startLeader} disabled={syncBusy || !matchSelection?.selected} style={{ width: '100%', fontSize: 11 }}>
                    {!matchSelection?.selected ? 'Select match' : 'Leader'}
                  </button>
                  <div className="flex gap-4">
                    <input className="input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="Code" maxLength={6} style={{ flex: 1, textAlign: 'center', fontWeight: 800, letterSpacing: '0.12em', fontSize: 11 }} />
                    <button className="btn btn-accent" onClick={joinFollower} disabled={syncBusy || joinCode.length !== 6} style={{ fontSize: 11 }}>Join</button>
                  </div>
                </div>
              )}
              {syncErr && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{syncErr}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────── */}
      <div className="flex items-center" style={{ justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 10, color: 'var(--text-muted)' }}>
        <span>Live Stat Engine</span>
        <span className="mono">:3001</span>
      </div>
    </div>
  );
}
