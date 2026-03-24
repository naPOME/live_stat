'use client';

import { useEffect, useState, useRef, use } from 'react';

type PlayerRow = { display_name: string; player_open_id: string };

type TournamentInfo = {
  name: string;
  status: string;
  registration_open: boolean;
  registration_limit: number | null;
  accepted_teams: number;
};

type OrgInfo = {
  name: string;
  logo_url: string | null;
  sponsors: string[];
};

export default function ApplyPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);

  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // Form
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [telegram, setTelegram] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([
    { display_name: '', player_open_id: '' },
    { display_name: '', player_open_id: '' },
    { display_name: '', player_open_id: '' },
    { display_name: '', player_open_id: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/apply?tournament_id=${encodeURIComponent(tournamentId)}`);
      const data = await res.json();

      if (!res.ok) {
        setLoadError(data.error ?? 'Tournament not found');
        setLoading(false);
        return;
      }

      setTournament(data.tournament);
      setOrg(data.organization ?? null);
      setLoading(false);
    }
    load();
  }, [tournamentId]);

  function updatePlayer(index: number, field: keyof PlayerRow, value: string) {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addPlayerRow() {
    setPlayers((prev) => [...prev, { display_name: '', player_open_id: '' }]);
  }

  function removePlayerRow(index: number) {
    if (players.length <= 1) return;
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file too large (max 5MB)');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const filledPlayers = players.filter((p) => p.display_name.trim() && p.player_open_id.trim());
    if (filledPlayers.length === 0) {
      setError('Add at least one player with display name and in-game ID');
      setSubmitting(false);
      return;
    }

    let logoUrl: string | null = null;
    if (logoFile) {
      setLogoUploading(true);
      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('folder', `applications/${tournamentId}`);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      setLogoUploading(false);
      if (uploadRes.ok && uploadData.url) {
        logoUrl = uploadData.url;
      }
    }

    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournament_id: tournamentId,
        team_name: teamName,
        short_name: shortName || null,
        telegram_username: telegram || null,
        logo_url: logoUrl,
        players: filledPlayers,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Submission failed');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found / closed — show nothing useful ──
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white/20 text-sm">This page is not available.</p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#2F6B3F]/15 flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#2F6B3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">Application Submitted</h1>
          <p className="text-white/40 text-sm">
            <span className="text-white/80">{teamName}</span> has been registered for
          </p>
          <p className="text-white/80 font-medium mt-1">{tournament?.name}</p>
          <p className="text-white/25 text-xs mt-6">The organizer will review your application.</p>
          {org?.sponsors && org.sponsors.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/5">
              {org.sponsors.map((url, i) => (
                <img key={i} src={url} alt="" className="h-6 w-auto max-w-[80px] object-contain opacity-40" />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const slotsInfo = tournament?.registration_limit
    ? `${tournament.accepted_teams} / ${tournament.registration_limit} teams registered`
    : null;

  // ── Form ──
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* ── Header ── */}
      <div className="border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {org?.logo_url ? (
                <img src={org.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/5" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/30">
                  {(org?.name ?? '').substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-xs text-white/30">{org?.name}</div>
                <div className="text-sm font-semibold text-white/90">{tournament?.name}</div>
              </div>
            </div>
            {slotsInfo && (
              <div className="text-[10px] text-white/30 bg-white/5 px-2.5 py-1 rounded-full">
                {slotsInfo}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sponsors Bar ── */}
      {org?.sponsors && org.sponsors.length > 0 && (
        <div className="border-b border-white/5">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center gap-6">
            <span className="text-[9px] uppercase tracking-widest text-white/15 font-medium">Sponsored by</span>
            {org.sponsors.map((url, i) => (
              <img key={i} src={url} alt="" className="h-5 w-auto max-w-[70px] object-contain opacity-50" />
            ))}
          </div>
        </div>
      )}

      {/* ── Form ── */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-base font-semibold mb-1">Team Registration</h1>
        <p className="text-xs text-white/30 mb-8">Fill in your team details and player roster to register.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/8 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* ── Team Details ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">Team Details</legend>

            {/* Logo */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="w-14 h-14 rounded-xl border border-dashed border-white/10 hover:border-white/25 transition-colors flex items-center justify-center overflow-hidden shrink-0"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-white/20"/>
                  </svg>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
              </button>
              <div>
                <div className="text-xs text-white/70">Team Logo</div>
                <div className="text-[10px] text-white/25 mt-0.5">
                  {logoFile ? logoFile.name : 'PNG or JPG, max 5MB'}
                </div>
                {logoFile && (
                  <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="text-[10px] text-red-400/70 hover:text-red-400 mt-0.5">Remove</button>
                )}
              </div>
            </div>

            {/* Name + Tag */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] text-white/30 mb-1.5">Team Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Alpha Wolves"
                  className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-white/30 mb-1.5">Tag</label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="ALPH"
                  maxLength={5}
                  className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/20 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Telegram */}
            <div>
              <label className="block text-[11px] text-white/30 mb-1.5">Captain Telegram Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-sm">@</span>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value.replace(/^@/, ''))}
                  placeholder="username"
                  className="w-full bg-white/[0.04] border border-white/8 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
            </div>
          </fieldset>

          {/* ── Players ── */}
          <fieldset className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <legend className="text-xs font-medium text-white/50 uppercase tracking-wider">Players</legend>
                <p className="text-[10px] text-white/20 mt-0.5">In-game ID must match the exact character ID</p>
              </div>
              <button type="button" onClick={addPlayerRow}
                className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
                + Add
              </button>
            </div>

            <div className="space-y-1.5">
              {/* Header */}
              <div className="grid grid-cols-[1fr_1fr_24px] gap-2 px-1">
                <span className="text-[9px] text-white/20 uppercase tracking-wider font-medium">Display Name</span>
                <span className="text-[9px] text-white/20 uppercase tracking-wider font-medium">In-Game ID</span>
                <span />
              </div>

              {players.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_24px] gap-2 items-center">
                  <input
                    type="text"
                    value={p.display_name}
                    onChange={(e) => updatePlayer(i, 'display_name', e.target.value)}
                    placeholder={`Player ${i + 1}`}
                    className="bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/20 transition-colors"
                  />
                  <input
                    type="text"
                    value={p.player_open_id}
                    onChange={(e) => updatePlayer(i, 'player_open_id', e.target.value)}
                    placeholder="ID"
                    className="bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/20 transition-colors font-mono"
                  />
                  <button type="button" onClick={() => removePlayerRow(i)}
                    className={`text-white/15 hover:text-red-400/70 text-sm transition-colors ${players.length <= 1 ? 'invisible' : ''}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </fieldset>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={submitting || logoUploading}
            className="w-full bg-white text-black font-medium py-2.5 rounded-lg text-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {logoUploading ? 'Uploading logo...' : submitting ? 'Submitting...' : 'Submit Registration'}
          </button>

          <p className="text-center text-white/10 text-[10px] pt-2">
            Tournyx
          </p>
        </form>
      </div>
    </div>
  );
}
