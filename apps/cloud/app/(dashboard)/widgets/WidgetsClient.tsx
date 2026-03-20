'use client';

import { useState } from 'react';

const WIDGETS = [
  { name: 'Match Ranking', path: '/overlay/leaderboard', description: 'Live leaderboard with teams, player alive/dead status bars, points and eliminations.', size: '420 x 1080', category: 'Live' },
  { name: 'Kill Feed', path: '/overlay/killfeed', description: 'Real-time kill events showing killer → victim with team colors and distance.', size: '1920 x 1080', category: 'Live' },
  { name: 'Player Card', path: '/overlay/playercard', description: 'Stats overlay for the currently observed player: health bar, kills, team info.', size: '1920 x 1080', category: 'Live' },
  { name: 'Elimination', path: '/overlay/elimination', description: 'Animated popup when a team is fully eliminated. Shows rank badge and points.', size: '1920 x 1080', category: 'Live' },
  { name: 'MVP', path: '/overlay/mvp', description: 'Match MVP display — top fragger with team tag and detailed stats panel.', size: '1920 x 1080', category: 'Post-Match' },
  { name: 'WWCD', path: '/overlay/wwcd', description: 'Winner Winner Chicken Dinner celebration with player stats and elims.', size: '1920 x 1080', category: 'Post-Match' },
  { name: 'Top Fraggers', path: '/overlay/fraggers', description: 'Top 5 players by eliminations with MVP badge and kill count.', size: '1920 x 1080', category: 'Post-Match' },
  { name: 'After Match Score', path: '/overlay/results', description: 'Two-column match results table with all teams ranked by total points.', size: '1920 x 1080', category: 'Post-Match' },
  { name: 'Point Table', path: '/overlay/pointtable', description: 'Visual PUBG Mobile standard point system — placement and elimination points.', size: '1920 x 1080', category: 'Static' },
  { name: 'Team List', path: '/overlay/teamlist', description: 'Two-column grid of all participating teams with logos and slot numbers.', size: '1920 x 1080', category: 'Static' },
  { name: 'Match Info', path: '/overlay/matchinfo', description: 'Match started notification with tournament banner, stage name, map.', size: '1920 x 1080', category: 'Static' },
  { name: 'Schedule', path: '/overlay/schedule', description: 'Bottom bar showing all matches with map names and live/finished status.', size: '1920 x 1080', category: 'Static' },
];

const CATEGORIES = ['All', 'Live', 'Post-Match', 'Static'];

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/live', description: 'Current match leaderboard (JSON). Teams sorted by points.' },
  { method: 'GET', path: '/api/stream', description: 'Full game state SSE stream. Events: hello, state, ping.' },
  { method: 'GET', path: '/api/killfeed', description: 'Kill events SSE stream. Last 8 kills on connect, then real-time.' },
  { method: 'GET', path: '/api/playercard', description: 'Observed player SSE stream. Updates on player focus switch.' },
  { method: 'GET', path: '/api/theme', description: 'Overlay theme config: colors, font, brand from roster_mapping.' },
  { method: 'POST', path: '/api/pcob', description: 'Game data ingestion endpoint. Accepts team/player state.' },
  { method: 'POST', path: '/api/watcher', description: 'Start/stop watching game log files.' },
];

type Tournament = { id: string; name: string; stages: { id: string; name: string }[] };

type Props = { initialTournaments: Tournament[] };

export default function WidgetsClient({ initialTournaments }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'widgets' | 'api'>('widgets');
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');

  const localUrl = 'http://localhost:3000';

  const selectedTournament = initialTournaments.find((t) => t.id === selectedTournamentId);
  const stages = selectedTournament?.stages ?? [];

  function buildContextParams() {
    if (!selectedTournamentId) return '';
    let p = `?tournamentId=${selectedTournamentId}`;
    if (selectedStageId) p += `&stageId=${selectedStageId}`;
    return p;
  }

  function copyUrl(path: string) {
    const url = `${localUrl}${path}${buildContextParams()}`;
    navigator.clipboard.writeText(url);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  }

  function displayUrl(path: string) {
    return `${localUrl}${path}${buildContextParams()}`;
  }

  const filtered = activeCategory === 'All' ? WIDGETS : WIDGETS.filter((w) => w.category === activeCategory);

  const categoryStyle: Record<string, string> = {
    Live: 'badge-danger',
    'Post-Match': 'badge-accent',
    Static: 'badge-muted',
  };

  return (
    <div className="p-10 max-w-[1100px] page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Widgets & API</h1>
        <p className="text-[var(--text-secondary)] text-sm font-body">OBS overlay widgets and API endpoints for the local engine</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 surface rounded-xl p-1 w-fit">
        {(['widgets', 'api'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg text-sm font-display font-semibold tracking-wide transition-all ${
              activeTab === tab ? 'bg-white/[0.06] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}>
            {tab === 'widgets' ? 'Overlay Widgets' : 'API Endpoints'}
          </button>
        ))}
      </div>

      {activeTab === 'widgets' && (
        <>
          {/* Tournament context selector */}
          {initialTournaments.length > 0 && (
            <div className="surface-elevated rounded-xl p-5 mb-6 flex flex-wrap items-center gap-4">
              <div>
                <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Pre-fill URLs</div>
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={selectedTournamentId}
                    onChange={(e) => { setSelectedTournamentId(e.target.value); setSelectedStageId(''); }}
                    className="input-premium py-1.5 text-sm w-auto"
                  >
                    <option value="">Select tournament…</option>
                    {initialTournaments.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {stages.length > 0 && (
                    <select value={selectedStageId} onChange={(e) => setSelectedStageId(e.target.value)}
                      className="input-premium py-1.5 text-sm w-auto">
                      <option value="">All stages</option>
                      {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                  {selectedTournamentId && (
                    <button onClick={() => { setSelectedTournamentId(''); setSelectedStageId(''); }}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--red)] transition-colors">Clear</button>
                  )}
                </div>
              </div>
              {selectedTournamentId && (
                <div className="ml-auto">
                  <code className="text-[10px] text-[var(--accent)] font-mono bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-lg px-3 py-1.5 block">
                    {buildContextParams()}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Master + Controller */}
          <div className="grid grid-cols-2 gap-4 mb-6 stagger">
            <div className="surface-elevated rounded-xl p-5 relative overflow-hidden accent-top">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-[0.04]" style={{ background: '#00ffc3' }} />
              <div className="relative">
                <div className="badge badge-accent mb-3 w-fit">Recommended</div>
                <div className="font-display text-sm font-semibold tracking-wide mb-1">Master Overlay</div>
                <p className="text-[var(--text-muted)] text-xs mb-3">Single OBS source — composites all widgets. Toggle from Controller.</p>
                <code className="text-[11px] bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-[#00ffc3] font-mono block">
                  {localUrl}/overlay/master
                </code>
              </div>
            </div>
            <div className="surface-elevated rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-[0.04]" style={{ background: '#ff4e4e' }} />
              <div className="relative">
                <div className="badge badge-danger mb-3 w-fit">Observer Tool</div>
                <div className="font-display text-sm font-semibold tracking-wide mb-1">Widget Controller</div>
                <p className="text-[var(--text-muted)] text-xs mb-3">Toggle widgets with hotkeys (F1-F12). Quick presets for match phases.</p>
                <code className="text-[11px] bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-[#00ffc3] font-mono block">
                  {localUrl}/controller
                </code>
              </div>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-6">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`text-xs px-4 py-2 rounded-lg font-display font-semibold tracking-wide transition-all ${
                  activeCategory === cat
                    ? 'bg-[#00ffc3]/8 text-[#00ffc3] border border-[#00ffc3]/15'
                    : 'surface text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Widget grid */}
          <div className="grid grid-cols-2 gap-4 stagger">
            {filtered.map((w) => (
              <div key={w.path} className="surface-elevated rounded-xl p-5 flex flex-col gap-3 card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-display text-sm font-semibold tracking-wide">{w.name}</h3>
                      <span className={`badge text-[9px] ${categoryStyle[w.category] || ''}`}>{w.category}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{w.size}</span>
                  </div>
                  <a href={displayUrl(w.path)} target="_blank" rel="noopener"
                    className="btn-ghost btn-sm text-[10px]">Preview</a>
                </div>
                <p className="text-[var(--text-muted)] text-xs leading-relaxed flex-1">{w.description}</p>
                <div className="flex items-center gap-2 mt-auto">
                  <code className="flex-1 text-[10px] bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-[#00ffc3] font-mono truncate">
                    {displayUrl(w.path)}
                  </code>
                  <button onClick={() => copyUrl(w.path)}
                    className={`text-[10px] px-3 py-2 rounded-lg font-display font-semibold tracking-wide transition-all flex-shrink-0 ${
                      copied === w.path
                        ? 'bg-[#00ffc3] text-[var(--bg-base)]'
                        : 'surface text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}>
                    {copied === w.path ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Setup guide */}
          <div className="mt-8 surface-elevated rounded-xl p-6 relative accent-top">
            <h3 className="font-display text-sm font-semibold tracking-wide mb-4">OBS Setup</h3>
            <ol className="text-[var(--text-muted)] text-xs space-y-2.5 list-decimal list-inside leading-relaxed">
              <li>Ensure the local engine runs at <code className="text-[#00ffc3] bg-[var(--bg-base)] px-2 py-0.5 rounded font-mono text-[11px]">localhost:3000</code></li>
              <li>In OBS, add a <strong className="text-[var(--text-primary)]">Browser Source</strong></li>
              <li>Paste the widget URL, set size to <strong className="text-[var(--text-primary)]">1920 x 1080</strong></li>
              <li>Enable <strong className="text-[var(--text-primary)]">&quot;Shutdown source when not visible&quot;</strong></li>
              <li>Set Custom CSS: <code className="text-[#00ffc3] bg-[var(--bg-base)] px-2 py-0.5 rounded font-mono text-[11px]">{'body { background: transparent !important; }'}</code></li>
            </ol>
          </div>
        </>
      )}

      {activeTab === 'api' && (
        <div className="space-y-3 stagger">
          <p className="text-[var(--text-muted)] text-xs mb-5">
            These endpoints run on the local engine at <code className="text-[#00ffc3] font-mono">localhost:3000</code>.
            SSE streams auto-reconnect with 10s keepalives.
          </p>
          {API_ENDPOINTS.map((ep) => (
            <div key={ep.path} className="surface-elevated rounded-xl px-6 py-4 flex items-start gap-4 card-hover">
              <span className={`badge flex-shrink-0 mt-0.5 ${ep.method === 'GET' ? 'badge-accent' : 'badge-warning'}`}>{ep.method}</span>
              <div className="flex-1 min-w-0">
                <code className="text-sm font-mono font-semibold">{ep.path}</code>
                <p className="text-[var(--text-muted)] text-xs mt-1 leading-relaxed">{ep.description}</p>
              </div>
              <button onClick={() => copyUrl(ep.path)}
                className={`text-[10px] px-3 py-2 rounded-lg font-display font-semibold tracking-wide transition-all flex-shrink-0 ${
                  copied === ep.path ? 'bg-[#00ffc3] text-[var(--bg-base)]' : 'surface text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}>
                {copied === ep.path ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
