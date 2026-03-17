//nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory for more information.
 Detected additional lockfiles: 
   * C:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\package-lock.json

▲ Next.js 16.1.0 (Turbopack)
- Local:         http://localhost:3099
- Network:       http://10.2.0.2:3099

✓ Starting...
⨯ Unable to acquire lock at C:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\.next\dev\lock, is another instance of next dev running?
  Suggestion: If you intended to restart next dev, terminate the other process, and then try again.
[?25h
instead of making th elocal dry make the ui out of this world clean and add some banner from the organization other tournament stat cards and ...
Update Todos

Design org banner header with logo, tournament name, branding

Build tournament stat cards (matches played, standings, top fraggers)

Create polished phase-aware dashboard sections

Add visual flair: gradients, team logos, rank badges
Let me check what data we have available from roster and cloud to build rich UI:

Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\lib\rosterStore.ts
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\api\cloud\route.ts
Good. Now let me check what the roster API returns (to know what data the dashboard can show):

Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\api\roster\route.ts
I need to enrich the roster API to include more data (org info, brand colors, logo, stage name, point system) so the dashboard can build a rich banner. Let me update it:

Write c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\api\roster\route.ts
65 lines
import { NextResponse } from 'next/server';
import fs from 'fs';
import { getRoster, getRosterPathValue, reloadRoster, setRosterPathOverride, getRosterError, getRosterSource } from '@/lib/rosterStore';
import { ok, err } from '@shared/api';

function rosterPayload() {
  const roster = getRoster();
  return {
    roster_loaded: Boolean(roster),
    roster_path: getRosterPathValue(),
    roster_source: getRosterSource(),
    team_count: roster?.teams?.length ?? 0,
    player_count: roster ? Object.keys(roster.player_index ?? {}).length : 0,
    tournament_id: roster?.tournament_id ?? null,
    stage_id: roster?.stage_id ?? null,
    stage_name: roster?.stage_name ?? null,
    group_name: roster?.group_name ?? null,
    match_id: roster?.match_id ?? null,
    org: roster?.org ? {
      id: roster.org.id,
      name: roster.org.name,
      brand_color: roster.org.brand_color,
      logo_path: roster.org.logo_path ?? null,
    } : null,
    point_system: roster?.point_system ?? null,
    teams: roster?.teams?.map((t) => ({
      slot_number: t.slot_number,
      team_id: t.team_id,
      name: t.name,
      short_name: t.short_name,
      brand_color: t.brand_color,
      logo_path: t.logo_path ?? null,
      player_count: t.players?.length ?? 0,
    })) ?? [],
    has_cloud_config: Boolean(roster?.cloud_endpoint && roster?.cloud_api_key),
    error: getRosterError(),
  };
}

export async function GET() {
  return NextResponse.json(ok(rosterPayload()));
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // ignore
  }
  if (body?.roster_path !== undefined) {
    const nextPath = body.roster_path;
    if (typeof nextPath === 'string' && nextPath.trim()) {
      if (!fs.existsSync(nextPath)) {
        return NextResponse.json(err('Roster file not found at provided path.'));
      }
      setRosterPathOverride(nextPath);
    } else {
      setRosterPathOverride(null);
    }
  }
  reloadRoster();
  return NextResponse.json(ok(rosterPayload()));
}
Now rewrite the dashboard with a stunning, clean UI:

Write c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\page.tsx
716 lines
'use client';

import { useEffect, useRef, useState } from 'react';

/* ── Types ────────────────────────────────────────── */
type LifecyclePhase = 'idle' | 'ready' | 'warmup' | 'live' | 'finished' | 'synced';

interface Notification { id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; timestamp: number; dismissed: boolean; }
interface Lifecycle { phase: LifecyclePhase; rosterLoaded: boolean; gameClientConnected: boolean; lastTelemetryAt: number | null; syncResult: 'pending' | 'success' | 'failed' | null; syncError: string | null; notifications: Notification[]; matchNumber: number; matchId: string | null; }

interface OrgInfo { id: string; name: string; brand_color: string; logo_path: string | null; }
interface TeamInfo { slot_number: number; team_id: string; name: string; short_name: string; brand_color: string; logo_path: string | null; player_count: number; }
interface PointSystemInfo { kill_points: number; placement_points: Record<string, number>; }
interface RosterInfo { roster_loaded: boolean; team_count: number; player_count: number; tournament_id?: string | null; stage_name?: string | null; group_name?: string | null; match_id?: string | null; org: OrgInfo | null; point_system: PointSystemInfo | null; teams: TeamInfo[]; has_cloud_config?: boolean; error?: string | null; roster_source?: string | null; }
interface CloudStatus { bound: boolean; cloud_url?: string | null; org?: { id: string; name: string } | null; tournament?: { id: string; name: string } | null; }
interface LiveTeam { teamName: string; displayName?: string; shortName?: string; brandColor?: string; kills: number; totalPoints: number; liveMemberNum: number; alive: boolean; placement?: number; }
interface GameData { phase?: string; teams: LiveTeam[]; spotlight?: { playerName: string; displayName?: string; teamName: string; kills: number }; players?: { playerName: string; displayName?: string; teamName: string; kills: number; damage: number; headshots: number; }[]; }
interface SyncStatus { role: string; connected: boolean; peerCount: number; syncCode: string | null; }

/* ── SVG Icons ────────────────────────────────────── */
const Trophy = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></svg>;
const Crosshair = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>;
const Users = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const Zap = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const Eye = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const Cloud = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>;
const Refresh = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;

/* ── Dashboard ────────────────────────────────────── */
export default function Dashboard() {
  const [lc, setLc] = useState<Lifecycle>({ phase: 'idle', rosterLoaded: false, gameClientConnected: false, lastTelemetryAt: null, syncResult: null, syncError: null, notifications: [], matchNumber: 1, matchId: null });
  const [game, setGame] = useState<GameData | null>(null);
  const [roster, setRoster] = useState<RosterInfo | null>(null);
  const [widgets, setWidgets] = useState<Record<string, boolean>>({});
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  const [sync, setSync] = useState<SyncStatus>({ role: 'standalone', connected: false, peerCount: 0, syncCode: null });

  const [cloudUrl, setCloudUrl] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<'idle' | 'waiting' | 'approved'>('idle');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudErr, setCloudErr] = useState('');
  const [tournaments, setTournaments] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [rosterMsg, setRosterMsg] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncErr, setSyncErr] = useState('');
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
    fetch('/api/roster').then(r => r.json()).then(d => setRoster(d?.data ?? d)).catch(() => {});
    fetch('/api/cloud').then(r => r.json()).then(d => {
      if (d?.ok || d?.bound) { setCloud(d); if (d.cloud_url) setCloudUrl(d.cloud_url); if (d.tournament?.id) setSelectedTournament(d.tournament.id); if (d.bound) refreshTournaments(); }
    }).catch(() => {});
    fetch('/api/widgets').then(r => r.json()).then(setWidgets).catch(() => {});
    const wes = new EventSource('/api/widgets?stream=1');
    wes.onmessage = e => { try { setWidgets(JSON.parse(e.data)); } catch {} };
    fetch('/api/sync').then(r => r.json()).then(setSync).catch(() => {});
    const ses = new EventSource('/api/sync?stream=1');
    ses.onmessage = e => { try { setSync(JSON.parse(e.data)); } catch {} };
    return () => { wes.close(); ses.close(); };
  }, []);

  useEffect(() => {
    if (deviceStatus !== 'waiting' || !deviceCode || !cloudUrl.trim()) return;
    const id = setInterval(() => pollDeviceStatus(deviceCode), 3000);
    return () => clearInterval(id);
  }, [deviceStatus, deviceCode, cloudUrl]);

  /* ── Actions ───────────────────────────────────── */
  async function refreshTournaments() { try { const res = await fetch('/api/cloud/tournaments'); const d = await res.json(); if (d.ok) { setTournaments(d.tournaments ?? []); if (!selectedTournament && d.tournaments?.length) setSelectedTournament(d.tournaments[0].id); } } catch {} }
  async function requestDeviceCode() { setCloudBusy(true); setCloudErr(''); try { const res = await fetch('/api/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'device-code', cloud_url: cloudUrl }) }); const d = await res.json(); if (!d.ok) { setCloudErr(d.error || 'Failed'); return; } setDeviceCode(d.code || ''); setDeviceStatus('waiting'); } catch { setCloudErr('Network error'); } finally { setCloudBusy(false); } }
  async function pollDeviceStatus(code: string) { try { const res = await fetch('/api/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'device-status', cloud_url: cloudUrl, code }) }); const d = await res.json(); if (d.ok && d.approved) { setDeviceStatus('approved'); setRosterMsg('Organization linked'); const r2 = await fetch('/api/cloud'); const s2 = await r2.json(); if (s2?.ok) setCloud(s2); refreshTournaments(); } } catch {} }
  async function selectTournament() { if (!selectedTournament) return; setCloudBusy(true); setCloudErr(''); try { const res = await fetch('/api/cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'select-tournament', tournament_id: selectedTournament }) }); const d = await res.json(); if (d.ok) { setRosterMsg('Tournament linked'); const [r1, r2] = await Promise.all([fetch('/api/roster'), fetch('/api/cloud')]); const rd = await r1.json(); setRoster(rd?.data ?? rd); const sd = await r2.json(); if (sd?.ok) setCloud(sd); } else { setCloudErr(d.error || 'Failed'); } } catch { setCloudErr('Network error'); } finally { setCloudBusy(false); setTimeout(() => setRosterMsg(''), 3000); } }
  const startLeader = async () => { setSyncBusy(true); setSyncErr(''); try { const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start-leader' }) }); const d = await res.json(); if (d.ok && d.status) setSync(d.status); else setSyncErr(d.error || 'Failed'); } catch { setSyncErr('Network error'); } finally { setSyncBusy(false); } };
  const joinFollower = async () => { if (joinCode.length !== 6) return; setSyncBusy(true); setSyncErr(''); try { const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', code: joinCode }) }); const d = await res.json(); if (d.ok && d.status) setSync(d.status); else setSyncErr(d.error || 'Failed'); } catch { setSyncErr('Network error'); } finally { setSyncBusy(false); } };
  const stopSync = () => fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop' }) });
  const resetMatch = () => fetch('/api/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }) });
  const retrySync = () => fetch('/api/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'retry-sync' }) });

  /* ── Derived ───────────────────────────────────── */
  const phase = lc.phase;
  const teams = game?.teams ?? [];
  const alive = teams.filter(t => t.liveMemberNum > 0).length;
  const kills = teams.reduce((s, t) => s + t.kills, 0);
  const widgetCount = Object.values(widgets).filter(Boolean).length;
  const connAge = lc.lastTelemetryAt ? (Date.now() - lc.lastTelemetryAt) / 1000 : Infinity;
  const connColor = connAge < 5 ? 'var(--accent)' : connAge < 15 ? 'var(--amber)' : 'var(--red)';
  const org = roster?.org;
  const orgAccent = org?.brand_color || 'var(--accent)';
  const hasOrg = !!org && lc.rosterLoaded;

  const topFraggers = [...(game?.players ?? [])].sort((a, b) => b.kills - a.kills || b.damage - a.damage).slice(0, 5);

  const phaseMeta: Record<LifecyclePhase, { label: string; color: string }> = {
    idle: { label: 'SETUP', color: 'var(--text-faint)' },
    ready: { label: 'READY', color: 'var(--purple)' },
    warmup: { label: 'WARMUP', color: 'var(--amber)' },
    live: { label: 'LIVE', color: 'var(--red)' },
    finished: { label: 'FINISHED', color: 'var(--accent)' },
    synced: { label: 'SYNCED', color: 'var(--accent)' },
  };
  const { label: phaseLabel, color: phaseColor } = phaseMeta[phase];

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Toasts ──────────────────────────────────── */}
      <div style={{ position: 'fixed', top: 52, right: 20, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
        {visibleToasts.map(n => (
          <div key={n.id} className="animate-in" style={{
            padding: '8px 14px', borderRadius: 'var(--radius-sm)',
            background: n.type === 'error' ? 'rgba(239,107,107,0.12)' : n.type === 'warning' ? 'rgba(240,185,64,0.12)' : n.type === 'success' ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${n.type === 'error' ? 'rgba(239,107,107,0.2)' : n.type === 'warning' ? 'rgba(240,185,64,0.2)' : n.type === 'success' ? 'rgba(96,165,250,0.2)' : 'var(--border-hi)'}`,
            backdropFilter: 'blur(12px)', fontSize: 11, fontWeight: 600,
            color: n.type === 'error' ? 'var(--red)' : n.type === 'warning' ? 'var(--amber)' : n.type === 'success' ? 'var(--accent)' : 'var(--text)',
            pointerEvents: 'auto', maxWidth: 300,
          }}>{n.message}</div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── Organization Banner ─────────────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {hasOrg && (
        <div style={{
          position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          background: `linear-gradient(135deg, ${orgAccent}12 0%, rgba(16,20,32,0.9) 60%, rgba(16,20,32,0.95) 100%)`,
          border: `1px solid ${orgAccent}18`,
          padding: '20px 24px',
        }}>
          {/* Accent line top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${orgAccent}, transparent)` }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Org logo */}
              <div style={{
                width: 48, height: 48, borderRadius: 12, overflow: 'hidden',
                background: `linear-gradient(135deg, ${orgAccent}25, ${orgAccent}08)`,
                border: `1px solid ${orgAccent}20`, display: 'grid', placeItems: 'center',
              }}>
                {org.logo_path ? (
                  <img src={org.logo_path} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 900, color: orgAccent }}>{org.name.charAt(0)}</span>
                )}
              </div>

              <div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>{org.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  {cloud?.tournament?.name && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>{cloud.tournament.name}</span>
                  )}
                  {roster?.stage_name && (
                    <>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>/</span>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{roster.stage_name}</span>
                    </>
                  )}
                  {roster?.group_name && (
                    <>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>/</span>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{roster.group_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Connection health */}
              {lc.gameClientConnected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: connColor }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: connColor }} />
                  {connAge < 5 ? 'Connected' : connAge < 15 ? 'Slow' : 'Lost'}
                </div>
              )}
              {/* Phase pill */}
              <div className="pill" style={{ color: phaseColor, borderColor: `color-mix(in srgb, ${phaseColor} 20%, transparent)`, background: `color-mix(in srgb, ${phaseColor} 6%, transparent)` }}>
                {phase === 'live' && <div className="live-dot" style={{ width: 6, height: 6 }} />}
                {phase !== 'live' && <div className="pill-dot" style={{ background: phaseColor }} />}
                {phaseLabel}
              </div>
              {sync.connected && (
                <div className="pill" style={{ color: 'var(--purple)', borderColor: 'rgba(155,138,251,0.2)', background: 'rgba(155,138,251,0.06)' }}>
                  <div className="pill-dot" style={{ background: 'var(--purple)' }} />
                  {sync.role.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Quick stats row */}
          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            {[
              { icon: <Users />, label: 'Teams', value: roster?.team_count ?? 0 },
              { icon: <Crosshair />, label: 'Players', value: roster?.player_count ?? 0 },
              { icon: <Eye />, label: 'Overlays', value: widgetCount },
              { icon: <Zap />, label: 'Kill Pts', value: roster?.point_system?.kill_points ?? 1 },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-faint)', opacity: 0.7 }}>{s.icon}</span>
                <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── No org: header only ──────────────────────── */}
      {!hasOrg && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</h1>
          <div className="pill" style={{ color: phaseColor, borderColor: `color-mix(in srgb, ${phaseColor} 20%, transparent)`, background: `color-mix(in srgb, ${phaseColor} 6%, transparent)` }}>
            {phase === 'live' ? <div className="live-dot" style={{ width: 6, height: 6 }} /> : <div className="pill-dot" style={{ background: phaseColor }} />}
            {phaseLabel}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── IDLE: Setup ─────────────────────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {phase === 'idle' && (
        <div className="card" style={{ borderColor: 'rgba(240,185,64,0.08)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Getting Started</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 14 }}>Connect to your cloud organization and select a tournament.</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              { n: '1', title: 'Link Org', done: !!cloud?.bound },
              { n: '2', title: 'Select Tournament', done: lc.rosterLoaded },
              { n: '3', title: 'Start Game', done: lc.gameClientConnected },
            ].map(s => (
              <div key={s.n} style={{
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                background: s.done ? 'rgba(96,165,250,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${s.done ? 'rgba(96,165,250,0.1)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  fontSize: 10, fontWeight: 800,
                  background: s.done ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  color: s.done ? '#0f1117' : 'var(--text-faint)',
                }}>{s.done ? '\u2713' : s.n}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.done ? 'var(--accent)' : 'var(--text)' }}>{s.title}</span>
              </div>
            ))}
          </div>

          {/* Cloud link / tournament select */}
          {!cloud?.bound ? (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connect Organization</div>
              <div className="flex gap-6">
                <input className="input" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="Cloud URL (https://...)" style={{ flex: 1 }} />
                <button className="btn btn-accent" onClick={requestDeviceCode} disabled={cloudBusy || !cloudUrl.trim()} style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                  {cloudBusy ? 'Wait...' : 'Get Code'}
                </button>
              </div>
              {deviceCode && (
                <div className="flex items-center gap-8" style={{ marginTop: 10 }}>
                  <div className="mono" style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.2em', color: 'var(--accent)' }}>{deviceCode}</div>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                    {deviceStatus === 'waiting' ? 'Enter this on the cloud dashboard' : 'Approved'}
                  </span>
                </div>
              )}
              {cloudErr && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{cloudErr}</div>}
            </div>
          ) : !lc.rosterLoaded ? (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Tournament</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                <strong style={{ color: 'var(--text)' }}>{cloud.org?.name}</strong> linked
              </div>
              <div className="flex gap-6">
                <select className="input" value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)} style={{ flex: 1 }}>
                  {(tournaments.length ? tournaments : [{ id: '', name: 'No tournaments', status: '' }]).map(t => (
                    <option key={t.id || 'none'} value={t.id}>{t.name || 'No tournaments'}</option>
                  ))}
                </select>
                <button className="btn btn-accent" onClick={selectTournament} disabled={cloudBusy || !selectedTournament} style={{ fontSize: 11 }}>
                  {cloudBusy ? 'Linking...' : 'Link'}
                </button>
              </div>
            </div>
          ) : null}
          {rosterMsg && <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(96,165,250,0.06)', color: 'var(--accent)', border: '1px solid rgba(96,165,250,0.08)', marginTop: 8 }}>{rosterMsg}</div>}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── READY: Waiting ──────────────────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {phase === 'ready' && (
        <>
          {/* Team cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {(roster?.teams ?? []).map(t => (
              <div key={t.slot_number} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                display: 'flex', alignItems: 'center', gap: 8,
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: `${t.brand_color}18`, border: `1px solid ${t.brand_color}25`,
                  display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 900, color: t.brand_color,
                }}>{String(t.slot_number).padStart(2, '0')}</div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.short_name || t.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>{t.player_count} players</div>
                </div>
              </div>
            ))}
          </div>

          {/* Waiting state */}
          <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div className="pulse" style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--purple)', margin: '0 auto 12px', boxShadow: '0 0 12px rgba(155,138,251,0.3)' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4 }}>Waiting for game client</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Start spectating in the game client — data appears automatically</div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── WARMUP ──────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {phase === 'warmup' && (
        <div className="card">
          <div className="tile-header">
            <div className="flex items-center gap-8">
              <span className="tile-title">Lobby</span>
              <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{teams.length} teams · Plane / warmup</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {teams.map((t, i) => (
              <div key={t.teamName} style={{
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div className="flex items-center gap-6">
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-faint)', width: 16 }}>{i + 1}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.brandColor || 'var(--text)' }}>{t.displayName || t.shortName || t.teamName}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>{t.liveMemberNum}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── LIVE ────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {phase === 'live' && (
        <>
          {/* Stat row */}
          <div className="stat-grid">
            {[
              { label: 'Alive', value: `${alive}/${teams.length}`, color: alive > 5 ? 'var(--accent)' : alive > 1 ? 'var(--amber)' : 'var(--red)' },
              { label: 'Kills', value: kills, color: 'var(--red)' },
              { label: 'Widgets', value: widgetCount, color: 'var(--accent)' },
              { label: 'Match', value: `#${lc.matchNumber}`, color: 'var(--purple)' },
            ].map((s, i) => (
              <div key={i} className="stat-box">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Main live content: leaderboard + sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
            {/* Leaderboard */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="flex items-center gap-8">
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Leaderboard</span>
                  <div className="live-dot" />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{teams.length} teams</span>
              </div>

              <div className="table-header" style={{ gridTemplateColumns: '28px 4px 1fr 50px 50px 60px', padding: '8px 18px' }}>
                <span>#</span><span></span><span>Team</span><span style={{ textAlign: 'center' }}>Alive</span><span style={{ textAlign: 'center' }}>Kills</span><span style={{ textAlign: 'right' }}>Pts</span>
              </div>
              {teams.map((t, i) => (
                <div key={t.teamName} className="table-row" style={{
                  gridTemplateColumns: '28px 4px 1fr 50px 50px 60px', padding: '8px 18px',
                  opacity: t.liveMemberNum === 0 ? 0.4 : 1,
                }}>
                  <span style={{ fontWeight: 900, fontSize: 12, color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--purple)' : i === 2 ? 'var(--amber)' : 'var(--text-faint)' }}>{i + 1}</span>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: t.brandColor || 'var(--text-faint)', opacity: 0.6 }} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{t.displayName || t.shortName || t.teamName}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: t.liveMemberNum > 0 ? 'var(--accent)' : 'var(--red)' }}>{t.liveMemberNum}/4</span>
                  <span style={{ textAlign: 'center', fontWeight: 800, fontSize: 12 }}>{t.kills}</span>
                  <span style={{ textAlign: 'right', fontWeight: 900, fontSize: 13 }}>{t.totalPoints}</span>
                </div>
              ))}
            </div>

            {/* Right sidebar: MVP + Top Fraggers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* MVP */}
              {game?.spotlight && game.spotlight.kills > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--purple)' }}>Match MVP</span>
                    <Trophy />
                  </div>
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{game.spotlight.kills}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{game.spotlight.displayName || game.spotlight.playerName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{game.spotlight.teamName}</div>
                  </div>
                </div>
              )}

              {/* Top fraggers */}
              {topFraggers.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Top Fraggers</span>
                  </div>
                  {topFraggers.map((p, i) => (
                    <div key={p.playerName} style={{
                      padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: i < topFraggers.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div className="flex items-center gap-6">
                        <span style={{ fontSize: 10, fontWeight: 900, color: i === 0 ? 'var(--accent)' : 'var(--text-faint)', width: 14 }}>{i + 1}</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>{p.displayName || p.playerName}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>{p.teamName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--red)' }}>{p.kills}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>{p.damage} dmg</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── FINISHED / SYNCED ───────────────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {(phase === 'finished' || phase === 'synced') && (
        <>
          {/* Next match banner */}
          {phase === 'synced' && (
            <div style={{
              padding: '14px 18px', borderRadius: 'var(--radius)',
              background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>Match complete — results synced</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Reset for the next match</div>
              </div>
              <button className="btn btn-accent" onClick={resetMatch}>Next Match</button>
            </div>
          )}

          {/* Winner card */}
          {teams[0] && (
            <div style={{
              padding: '20px 24px', borderRadius: 'var(--radius-lg)', textAlign: 'center',
              background: `linear-gradient(135deg, ${teams[0].brandColor || orgAccent}10, rgba(16,20,32,0.9))`,
              border: `1px solid ${teams[0].brandColor || orgAccent}15`,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--amber)', marginBottom: 4 }}>Winner Winner Chicken Dinner</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)' }}>{teams[0].displayName || teams[0].shortName || teams[0].teamName}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                {teams[0].kills} kills · {teams[0].totalPoints} points
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="stat-grid">
            {[
              { label: 'Total Kills', value: kills, color: 'var(--red)' },
              { label: 'Teams', value: teams.length, color: 'var(--purple)' },
              { label: 'Sync', value: lc.syncResult === 'success' ? 'DONE' : lc.syncResult === 'pending' ? '...' : lc.syncResult === 'failed' ? 'FAIL' : 'WAIT', color: lc.syncResult === 'success' ? 'var(--accent)' : lc.syncResult === 'failed' ? 'var(--red)' : 'var(--amber)' },
              { label: 'Match', value: `#${lc.matchNumber}`, color: 'var(--accent)' },
            ].map((s, i) => (
              <div key={i} className="stat-box">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Final standings + top fraggers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Final Standings</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: 'rgba(96,165,250,0.06)', color: 'var(--accent)' }}>COMPLETE</span>
              </div>
              <div className="table-header" style={{ gridTemplateColumns: '28px 4px 1fr 50px 60px', padding: '8px 18px' }}>
                <span>#</span><span></span><span>Team</span><span style={{ textAlign: 'center' }}>Kills</span><span style={{ textAlign: 'right' }}>Total</span>
              </div>
              {teams.map((t, i) => (
                <div key={t.teamName} className="table-row" style={{ gridTemplateColumns: '28px 4px 1fr 50px 60px', padding: '8px 18px' }}>
                  <span style={{ fontWeight: 900, fontSize: 12, color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--purple)' : i === 2 ? 'var(--amber)' : 'var(--text-faint)' }}>{i + 1}</span>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: t.brandColor || 'var(--text-faint)', opacity: 0.6 }} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{t.displayName || t.shortName || t.teamName}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--red)' }}>{t.kills}</span>
                  <span style={{ textAlign: 'right', fontWeight: 900, fontSize: 13, color: i === 0 ? 'var(--accent)' : 'var(--text)' }}>{t.totalPoints}</span>
                </div>
              ))}
            </div>

            {/* Top fraggers sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {game?.spotlight && game.spotlight.kills > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--purple)' }}>Match MVP</span>
                  </div>
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{game.spotlight.kills}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{game.spotlight.displayName || game.spotlight.playerName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{game.spotlight.teamName}</div>
                  </div>
                </div>
              )}

              {topFraggers.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Top Fraggers</span>
                  </div>
                  {topFraggers.map((p, i) => (
                    <div key={p.playerName} style={{
                      padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: i < topFraggers.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div className="flex items-center gap-6">
                        <span style={{ fontSize: 10, fontWeight: 900, color: i === 0 ? 'var(--accent)' : 'var(--text-faint)', width: 14 }}>{i + 1}</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>{p.displayName || p.playerName}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>{p.teamName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--red)' }}>{p.kills}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>{p.damage} dmg</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sync status */}
              {lc.syncResult === 'failed' && (
                <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,107,107,0.06)', border: '1px solid rgba(239,107,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'var(--red)' }}>Sync failed</span>
                  <button className="btn btn-red" onClick={retrySync} style={{ fontSize: 9, padding: '2px 6px' }}>Retry</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── Bottom bar: Overlays + Sync ─────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {phase !== 'idle' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Overlays */}
          <div className="card">
            <div className="tile-header">
              <span className="tile-title">Overlays</span>
              <a href="/controller" className="btn" style={{ fontSize: 10, padding: '3px 8px' }}>Controller</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {[
                { key: 'leaderboard', label: 'Ranking' }, { key: 'killfeed', label: 'Kill Feed' }, { key: 'playercard', label: 'Player' },
                { key: 'elimination', label: 'Elim' }, { key: 'results', label: 'Results' }, { key: 'mvp', label: 'MVP' },
                { key: 'fraggers', label: 'Fraggers' }, { key: 'wwcd', label: 'WWCD' }, { key: 'teamlist', label: 'Teams' },
              ].map(w => {
                const on = widgets[w.key] ?? false;
                return (
                  <div key={w.key} style={{
                    padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                    background: on ? 'rgba(96,165,250,0.04)' : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${on ? 'rgba(96,165,250,0.1)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: on ? 'var(--accent)' : 'var(--text-faint)', flexShrink: 0, opacity: on ? 1 : 0.4 }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: on ? 'var(--text)' : 'var(--text-faint)' }}>{w.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text-faint)' }}>
              OBS: <span className="mono">localhost:3001/overlay/master</span>
            </div>
          </div>

          {/* Cloud + Sync */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="card" style={{ flex: 1, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div className="flex items-center gap-6">
                  <Cloud />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Cloud</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: cloud?.bound ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.03)', color: cloud?.bound ? 'var(--accent)' : 'var(--text-faint)' }}>
                  {cloud?.bound ? 'LINKED' : 'NOT LINKED'}
                </span>
              </div>
              {cloud?.bound && (
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                  {cloud.org?.name}{cloud.tournament?.name ? ` / ${cloud.tournament.name}` : ''}
                </div>
              )}
            </div>

            <div className="card" style={{ flex: 1, padding: '12px 14px', borderColor: sync.connected ? 'rgba(155,138,251,0.08)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sync.connected || true ? 4 : 0 }}>
                <div className="flex items-center gap-6">
                  <Refresh />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Sync</span>
                  {sync.connected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--purple)' }} />}
                </div>
                {sync.connected && <button className="btn btn-red" onClick={stopSync} style={{ fontSize: 9, padding: '2px 6px' }}>Stop</button>}
              </div>
              {sync.connected ? (
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  <span style={{ fontWeight: 800, textTransform: 'uppercase', color: sync.role === 'leader' ? 'var(--red)' : 'var(--accent)' }}>{sync.role}</span>
                  {' '}{sync.peerCount} peers
                  {sync.syncCode && <span className="mono" style={{ marginLeft: 6, fontWeight: 800, letterSpacing: '0.1em' }}>{sync.syncCode}</span>}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button className="btn" onClick={startLeader} disabled={syncBusy || !roster?.has_cloud_config} style={{ width: '100%', fontSize: 9 }}>
                    {!roster?.has_cloud_config ? 'Link first' : 'Leader'}
                  </button>
                  <div className="flex gap-4">
                    <input className="input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="Code" maxLength={6} style={{ flex: 1, textAlign: 'center', fontWeight: 800, letterSpacing: '0.12em', fontSize: 10 }} />
                    <button className="btn btn-accent" onClick={joinFollower} disabled={syncBusy || joinCode.length !== 6} style={{ fontSize: 9 }}>Join</button>
                  </div>
                </div>
              )}
              {syncErr && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{syncErr}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────── */}
      <div className="flex items-center" style={{ justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 9, color: 'var(--text-faint)' }}>
        <span>Live Stat Engine</span>
        <span className="mono">:3001</span>
      </div>
    </div>
  );
}
Let me check if the dev server is running and verify compilation.

Bash Type-check local app
IN
cd "/c/Users/natnaelb/Downloads/Telegram Desktop/live_stat" && npx tsc --noEmit -p apps/local/tsconfig.json 2>&1 | head -50

OUT
node:internal/modules/cjs/loader:1423
  throw err;
  ^

Error: Cannot find module 'C:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\node_modules\typescript\bin\tsc'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1420:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1058:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1063:22)
    at Module._load (node:internal/modules/cjs/loader:1226:37)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v25.1.0
Globpattern: "apps/local/app/overlay/**/page.tsx"
Found 14 files
Bash Check typescript installation
IN
cd "/c/Users/natnaelb/Downloads/Telegram Desktop/live_stat" && npm ls typescript 2>&1 | head -5

OUT
live-stat-monorepo@0.1.0 C:\Users\natnaelb\Downloads\Telegram Desktop\live_stat
+-- cloud@0.1.0 -> .\apps\cloud
| +-- eslint-config-next@16.1.0
| | +-- typescript-eslint@8.56.1
| | | +-- @typescript-eslint/eslint-plugin@8.56.1
Agent:Read all overlay pages
IN
Read the contents of ALL these overlay page files in the local app. I need the full content of each:

1. apps/local/app/overlay/killfeed/page.tsx
2. apps/local/app/overlay/playercard/page.tsx
3. apps/local/app/overlay/leaderboard/page.tsx
4. apps/local/app/overlay/elimination/page.tsx
5. apps/local/app/overlay/wwcd/page.tsx
6. apps/local/app/overlay/fraggers/page.tsx
7. apps/local/app/overlay/results/page.tsx
8. apps/local/app/overlay/teamlist/page.tsx
9. apps/local/app/overlay/mvp/page.tsx
10. apps/local/app/overlay/schedule/page.tsx
11. apps/local/app/overlay/master/page.tsx
12. apps/local/app/overlay/matchinfo/page.tsx
13. apps/local/app/overlay/pointtable/page.tsx
14. apps/local/app/overlay/gallery/page.tsx

For each file, tell me:
- The full file content
- Whether it has a black/dark background (look for background-color, bg, etc.)
- Whether it uses hardcoded neon colors like #00ffc3, #ff4e4e, #7c6afc, #ffb800, rgba(0,255,195), etc.
- Whether it's using 'use client' directive
- What API endpoints it fetches from

Working directory: c:/Users/natnaelb/Downloads/Telegram Desktop/live_stat
Globpattern: "apps/local/app/overlay/*/page.tsx"
Found 14 files
Read page.tsx
Good. Now let me install dependencies and fix the overlays. The two main overlay issues are:

Black/dark backgrounds — OBS browser sources need transparent backgrounds
Hardcoded neon colors — need the calmer palette
Let me install deps first, then fix all overlays.

Bash Install all monorepo dependencies
IN
cd "/c/Users/natnaelb/Downloads/Telegram Desktop/live_stat" && npm install 2>&1 | tail -10

OUT
145 packages are looking for funding
  run `npm fund` for details

1 high severity vulnerability

To address all issues, run:
  npm audit fix --force

Run `npm audit` for details.
Dependencies installed. Now let me read and fix all the overlay pages. Let me start reading them in parallel.

Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\killfeed\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\playercard\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\leaderboard\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\elimination\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\wwcd\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\fraggers\page.tsx
Good — I can see the overlays already have body { background: transparent !important; } in their global styles, which means the transparent background IS set. The issue is likely that the Next.js layout wraps them with a default background. Let me check the layout file.

Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\layout.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\results\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\teamlist\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\mvp\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\master\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\schedule\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\matchinfo\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\pointtable\page.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\gallery\page.tsx
Now I see — the root layout wraps ALL pages (including overlays) with ShellWrapper and globals.css. The overlays try to override with body { background: transparent !important; } but the ShellWrapper and CSS might still apply dark backgrounds. Let me check ShellWrapper and globals.css.

Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\components\ShellWrapper.tsx
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\globals.css
I see two problems:

API response format changed — The /api/live route now wraps data in ok() envelope ({ok: true, data: {...}}), but overlays still expect raw data (d.teams). This breaks all overlays.
Dark background — globals.css sets body { background: var(--bg-base) } (dark), and while overlays have !important overrides, there might be flash/timing issues.
Let me check the live route first.

Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\api\live\route.ts
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\api\killfeed\route.ts
Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\api\theme\route.ts
Found both breaking issues:

/api/live now returns { ok: true, data: { teams: [...], players: [...], ... }, ts: ... } — overlays expect { teams: [...] } directly
/api/theme now returns { ok: true, data: { accent_color: '...', ... }, ts: ... } — overlays expect { accent_color: '...' } directly
Every overlay that calls these APIs is broken. I need to either:

A) Unwrap the envelope in each overlay, or
B) Make these endpoints return raw data for overlay compatibility
Option A is better — update the overlays to handle the envelope. Let me also fix the background issue by creating an overlay-specific layout. Let me do this systematically.

Update Todos

Fix overlay API envelope unwrapping (overlays broken by ok() wrapper)

Create overlay layout with transparent background

Update overlay colors from neon to calm palette

Verify dev server compiles and runs
The overlays all fetch from /api/live and /api/theme expecting raw data, but now those endpoints wrap in ok(). I need to update all overlay pages to unwrap res.data. Let me fix them all systematically.

Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\leaderboard\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\leaderboard\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\leaderboard\page.tsx
Modified
The inline edits are causing syntax issues. Let me take a cleaner approach — I'll rewrite the problematic section properly by reading the current state and doing a proper edit.

Read c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\leaderboard\page.tsx
I see the issue — the closing brace and the catch are wrong. Let me fix the whole useEffect block properly.

Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\leaderboard\page.tsx
Added 1 line
Good, leaderboard fixed. Now let me apply the same envelope unwrapping pattern to all other overlay pages. I'll use a helper pattern: r?.data ?? r to handle both wrapped and unwrapped responses.

Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\elimination\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\elimination\page.tsx
Added 1 line
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\wwcd\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\wwcd\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\fraggers\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\fraggers\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\results\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\results\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\teamlist\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\teamlist\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\mvp\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\mvp\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\schedule\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\matchinfo\page.tsx
Modified
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\pointtable\page.tsx
Added 1 line
Edit c:\Users\natnaelb\Downloads\Telegram Desktop\live_stat\apps\local\app\overlay\playercard\page.tsx
Added 1 line
All envelope unwrapping is done. Now let me create the overlay layout for transparent backgrounds and update the colors.

Update Todos

Fix overlay API envelope unwrapping (overlays broken by ok() wrapper)

Create overlay layout with transparent background

Update overlay colors from neon to calm palette

Verify dev server compiles and runs