'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Stage, Match, PointSystem, TeamApplication } from '@/lib/types';

type StageWithMatches = Stage & { matches: Match[] };
type Tab = 'stages' | 'applications';

const MAPS = ['Erangel', 'Miramar', 'Vikendi', 'Sanhok', 'Rondo', 'Deston', 'Nusa', 'Taego'];
const STAGE_NAMES = ['Groups', 'Semi-Finals', 'Grand Finals', 'Qualifier', 'Playoffs'];

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [tournament, setTournament] = useState<{ id: string; name: string; status: string; api_key: string } | null>(null);
  const [stages, setStages] = useState<StageWithMatches[]>([]);
  const [pointSystem, setPointSystem] = useState<PointSystem | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>('stages');

  // Applications
  const [applications, setApplications] = useState<TeamApplication[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Add stage form
  const [addingStage, setAddingStage] = useState(false);
  const [stageName, setStageName] = useState('');

  // Add match form
  const [addingMatchTo, setAddingMatchTo] = useState<string | null>(null);
  const [matchName, setMatchName] = useState('');
  const [matchMap, setMatchMap] = useState('');

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('tournaments').select('*').eq('id', id).single();
      if (!t) { router.push('/tournaments'); return; }
      setTournament(t);

      const { data: ps } = await supabase
        .from('point_systems').select('*').eq('tournament_id', id).limit(1).single();
      setPointSystem(ps);

      await Promise.all([refreshStages(), refreshApplications()]);
      setLoading(false);
    }
    load();
  }, [id]);

  async function refreshStages() {
    const { data: stagesData } = await supabase
      .from('stages')
      .select('*, matches(*)')
      .eq('tournament_id', id)
      .order('stage_order');
    setStages((stagesData as StageWithMatches[]) ?? []);
  }

  async function refreshApplications() {
    const { data } = await supabase
      .from('team_applications')
      .select('*')
      .eq('tournament_id', id)
      .order('created_at', { ascending: false });
    setApplications((data as TeamApplication[]) ?? []);
  }

  async function acceptApplication(app: TeamApplication) {
    setAccepting(app.id);

    // Get org_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
    if (!profile?.org_id) { setAccepting(null); return; }

    // Create team in the org
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        org_id: profile.org_id,
        name: app.team_name,
        short_name: app.short_name || null,
        brand_color: app.brand_color,
      })
      .select('id')
      .single();

    if (teamError || !team) { setAccepting(null); return; }

    // Create players
    if (app.players.length > 0) {
      await supabase.from('players').insert(
        app.players.map((p) => ({
          team_id: team.id,
          display_name: p.display_name,
          player_open_id: p.player_open_id,
        })),
      );
    }

    // Mark application as accepted
    await supabase
      .from('team_applications')
      .update({ status: 'accepted' })
      .eq('id', app.id);

    setAccepting(null);
    await refreshApplications();
  }

  async function rejectApplication(appId: string) {
    await supabase
      .from('team_applications')
      .update({ status: 'rejected' })
      .eq('id', appId);
    await refreshApplications();
  }

  function copyRegistrationLink() {
    const link = `${window.location.origin}/apply/${id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function addStage() {
    if (!stageName.trim()) return;
    await supabase.from('stages').insert({
      tournament_id: id,
      name: stageName.trim(),
      stage_order: stages.length + 1,
    });
    setStageName('');
    setAddingStage(false);
    await refreshStages();
  }

  async function addMatch(stageId: string) {
    if (!matchName.trim()) return;
    await supabase.from('matches').insert({
      stage_id: stageId,
      name: matchName.trim(),
      map_name: matchMap || null,
      point_system_id: pointSystem?.id ?? null,
    });
    setMatchName('');
    setMatchMap('');
    setAddingMatchTo(null);
    await refreshStages();
  }

  async function deleteStage(stageId: string) {
    if (!confirm('Delete this stage and all its matches?')) return;
    await supabase.from('stages').delete().eq('id', stageId);
    await refreshStages();
  }

  async function deleteMatch(matchId: string) {
    if (!confirm('Delete this match?')) return;
    await supabase.from('matches').delete().eq('id', matchId);
    await refreshStages();
  }

  async function archiveTournament() {
    if (!confirm('Archive this tournament?')) return;
    await supabase.from('tournaments').update({ status: 'archived' }).eq('id', id);
    setTournament((t) => t ? { ...t, status: 'archived' } : t);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-[#8b8da6]">Loading…</div>
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6 text-sm">
        <Link href="/tournaments" className="text-[#8b8da6] hover:text-white transition-colors">Tournaments</Link>
        <span className="text-[#8b8da6]/40">/</span>
        <span className="text-white">{tournament.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              tournament.status === 'active' ? 'bg-[#00ffc3]/10 text-[#00ffc3]' : 'bg-white/5 text-[#8b8da6]'
            }`}>
              {tournament.status}
            </span>
          </div>
          <p className="text-[#8b8da6] text-sm">{stages.length} stage{stages.length !== 1 ? 's' : ''}</p>
        </div>
        {tournament.status === 'active' && (
          <button
            onClick={archiveTournament}
            className="text-xs text-[#8b8da6] hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            Archive
          </button>
        )}
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* API Key */}
        <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider">Cloud API Key</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-xs text-[#00ffc3] font-mono break-all truncate">
              {tournament.api_key}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(tournament.api_key)}
              className="flex-shrink-0 text-xs text-[#8b8da6] hover:text-white border border-white/10 px-3 py-2 rounded-lg hover:border-white/20 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Registration Link */}
        <div className="bg-[#213448] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider">Team Registration Link</span>
            <span className="text-xs text-[#8b8da6]">Share with teams</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-xs text-[#00ffc3] font-mono truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}/apply/${id}` : `/apply/${id}`}
            </code>
            <button
              onClick={copyRegistrationLink}
              className="flex-shrink-0 text-xs text-[#8b8da6] hover:text-white border border-white/10 px-3 py-2 rounded-lg hover:border-white/20 transition-colors"
            >
              {linkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#213448] border border-white/10 rounded-xl p-1 w-fit">
        {(['stages', 'applications'] as Tab[]).map((tab) => {
          const pendingCount = applications.filter((a) => a.status === 'pending').length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-white/10 text-white'
                  : 'text-[#8b8da6] hover:text-white'
              }`}
            >
              {tab === 'stages' ? 'Stages & Matches' : 'Applications'}
              {tab === 'applications' && pendingCount > 0 && (
                <span className="bg-[#00ffc3] text-[#0e1621] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── STAGES TAB ─── */}
      {activeTab === 'stages' && (
        <>
          <div className="space-y-4 mb-4">
            {stages.map((stage) => (
              <div key={stage.id} className="bg-[#213448] border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00ffc3]" />
                    <span className="font-semibold text-white">{stage.name}</span>
                    <span className="text-xs text-[#8b8da6]">{stage.matches?.length ?? 0} match{stage.matches?.length !== 1 ? 'es' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setAddingMatchTo(stage.id); setMatchName(''); setMatchMap(''); }}
                      className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors"
                    >
                      + Add Match
                    </button>
                    <button
                      onClick={() => deleteStage(stage.id)}
                      className="text-xs text-[#8b8da6] hover:text-[#ff4e4e] transition-colors ml-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {stage.matches?.length > 0 && (
                  <div>
                    {stage.matches.map((match, i) => (
                      <div
                        key={match.id}
                        className={`flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors ${
                          i > 0 ? 'border-t border-white/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-white">{match.name}</span>
                          {match.map_name && (
                            <span className="text-xs text-[#8b8da6] bg-white/5 px-2 py-0.5 rounded">{match.map_name}</span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            match.status === 'finished' ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
                            : match.status === 'live' ? 'bg-[#ff4e4e]/10 text-[#ff4e4e]'
                            : 'bg-white/5 text-[#8b8da6]'
                          }`}>
                            {match.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/tournaments/${id}/stages/${stage.id}/matches/${match.id}`}
                            className="text-xs text-[#00ffc3] hover:text-[#8b7ffe] font-medium transition-colors"
                          >
                            Roster & Export →
                          </Link>
                          <button
                            onClick={() => deleteMatch(match.id)}
                            className="text-xs text-[#8b8da6] hover:text-[#ff4e4e] transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {addingMatchTo === stage.id && (
                  <div className="border-t border-white/5 px-5 py-3 bg-black/20 flex items-center gap-3">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Match name (e.g. Game 1)"
                      value={matchName}
                      onChange={(e) => setMatchName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addMatch(stage.id); if (e.key === 'Escape') setAddingMatchTo(null); }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                    />
                    <select
                      value={matchMap}
                      onChange={(e) => setMatchMap(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                    >
                      <option value="">Map (optional)</option>
                      {MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button
                      onClick={() => addMatch(stage.id)}
                      className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingMatchTo(null)}
                      className="text-[#8b8da6] hover:text-white text-sm px-2 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {stage.matches?.length === 0 && addingMatchTo !== stage.id && (
                  <div className="px-5 py-5 text-center text-[#8b8da6] text-sm">
                    No matches yet.{' '}
                    <button
                      onClick={() => setAddingMatchTo(stage.id)}
                      className="text-[#00ffc3] hover:text-[#8b7ffe] transition-colors"
                    >
                      Add the first one
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {addingStage ? (
            <div className="bg-[#213448] border border-[#00ffc3]/30 rounded-2xl p-4 flex items-center gap-3">
              <input
                type="text"
                autoFocus
                placeholder="Stage name"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addStage(); if (e.key === 'Escape') setAddingStage(false); }}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
              />
              <div className="flex gap-1.5">
                {STAGE_NAMES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStageName(n)}
                    className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-[#00ffc3]/20 text-[#8b8da6] hover:text-[#00ffc3] transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={addStage}
                className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Add Stage
              </button>
              <button
                onClick={() => setAddingStage(false)}
                className="text-[#8b8da6] hover:text-white transition-colors text-sm px-2"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingStage(true)}
              className="w-full border border-dashed border-white/10 hover:border-[#00ffc3]/40 rounded-2xl py-3.5 text-[#8b8da6] hover:text-[#00ffc3] text-sm font-medium transition-colors"
            >
              + Add Stage
            </button>
          )}
        </>
      )}

      {/* ─── APPLICATIONS TAB ─── */}
      {activeTab === 'applications' && (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className="bg-[#213448] border border-dashed border-white/10 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-white font-semibold mb-1">No applications yet</h3>
              <p className="text-[#8b8da6] text-sm mb-4">Share the registration link with teams to start receiving applications.</p>
              <button
                onClick={copyRegistrationLink}
                className="inline-flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {linkCopied ? 'Copied!' : 'Copy Registration Link'}
              </button>
            </div>
          ) : (
            applications.map((app) => {
              const isPending = app.status === 'pending';
              const isAccepted = app.status === 'accepted';
              return (
                <div
                  key={app.id}
                  className={`bg-[#213448] border rounded-2xl overflow-hidden ${
                    isPending ? 'border-[#00ffc3]/20' : 'border-white/10'
                  }`}
                >
                  {/* Application header */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ backgroundColor: app.brand_color + '33', border: `1.5px solid ${app.brand_color}55` }}
                      >
                        <span style={{ color: app.brand_color }}>
                          {(app.short_name ?? app.team_name).substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate">{app.team_name}</span>
                          {app.short_name && <span className="text-xs text-[#8b8da6]">[{app.short_name}]</span>}
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isPending ? 'bg-amber-500/15 text-amber-400'
                            : isAccepted ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
                            : 'bg-[#ff4e4e]/10 text-[#ff4e4e]'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-[#8b8da6]">{app.players.length} player{app.players.length !== 1 ? 's' : ''}</span>
                          {app.contact_email && <span className="text-xs text-[#8b8da6]">{app.contact_email}</span>}
                          <span className="text-xs text-[#8b8da6]">{new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => acceptApplication(app)}
                          disabled={accepting === app.id}
                          className="bg-[#00ffc3] hover:bg-[#00e6af] disabled:opacity-50 text-[#0e1621] text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                          {accepting === app.id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => rejectApplication(app.id)}
                          className="text-xs text-[#8b8da6] hover:text-[#ff4e4e] border border-white/10 hover:border-[#ff4e4e]/30 px-3 py-2 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Player list */}
                  <div className="border-t border-white/5 px-5 py-3 bg-black/10">
                    <div className="grid grid-cols-[1fr_1fr] gap-2 mb-1.5">
                      <span className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">Display Name</span>
                      <span className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">In-Game ID</span>
                    </div>
                    {app.players.map((p, pi) => (
                      <div key={pi} className="grid grid-cols-[1fr_1fr] gap-2 py-1">
                        <span className="text-sm text-white">{p.display_name}</span>
                        <span className="text-sm text-[#8b8da6] font-mono">{p.player_open_id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
