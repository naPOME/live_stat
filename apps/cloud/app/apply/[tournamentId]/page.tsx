'use client';

import { useEffect, useState, useRef, use } from 'react';

type PlayerRow = { display_name: string; player_open_id: string };

export default function ApplyPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);

  const [tournament, setTournament] = useState<{ name: string; status: string } | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // Form
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [brandColor, setBrandColor] = useState('#ffffff');
  const [contactEmail, setContactEmail] = useState('');
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

      const t = data.tournament;
      if (t.status !== 'active') {
        setLoadError('This tournament is no longer accepting applications');
        setLoading(false);
        return;
      }

      setTournament({ name: t.name, status: t.status });
      setOrgName(data.organization?.name ?? '');
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

    // Upload logo if provided
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
        brand_color: brandColor,
        contact_email: contactEmail || null,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <span className="loader" aria-label="Loading" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">:/</div>
          <p className="text-white font-semibold mb-1">{loadError}</p>
          <p className="text-[#8b8da6] text-sm">Check the link and try again.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00ffc3]/15 flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#00ffc3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Application Submitted!</h1>
          <p className="text-[#8b8da6] text-sm mb-1">
            <span className="text-white font-medium">{teamName}</span> has been submitted to
          </p>
          <p className="text-[#00ffc3] font-semibold">{tournament?.name}</p>
          <p className="text-[#8b8da6] text-xs mt-4">
            The tournament organizer will review your application.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1621] py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ffc3] to-[#00ffc3]/60 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L5 5L8 8L11 5L14 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-black tracking-[0.2em] uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-[#00ffc3] via-[#6d5efc] to-[#ff4e4e]">
              Tournyx
            </span>
          </div>
          {orgName && <p className="text-[#8b8da6] text-xs mb-2">Hosted by {orgName}</p>}
          <h1 className="text-xl font-bold text-white">Team Registration</h1>
          <p className="text-[#00ffc3] font-semibold text-sm mt-1">{tournament?.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-[#ff4e4e]/10 border border-[#ff4e4e]/30 text-[#ff4e4e] text-sm px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Team info */}
          <div className="bg-[#1a2735] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="text-sm font-semibold text-white">Team Details</div>

            {/* Logo upload */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="relative w-16 h-16 rounded-xl border-2 border-dashed border-white/20 hover:border-[#00ffc3]/50 transition-colors flex items-center justify-center overflow-hidden flex-shrink-0 group"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30 group-hover:text-[#00ffc3]/60 transition-colors">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
              </button>
              <div>
                <div className="text-xs text-white font-medium">Team Logo</div>
                <div className="text-[10px] text-[#8b8da6] mt-0.5">
                  {logoFile ? logoFile.name : 'Click to upload (PNG/JPG, max 5MB)'}
                </div>
                {logoFile && (
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="text-[10px] text-[#ff4e4e] mt-1 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs text-[#8b8da6] mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Alpha Wolves"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8b8da6] mb-1">Short Name / Tag</label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="ALPH"
                  maxLength={5}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8b8da6] mb-1">Team Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-10 h-9 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-mono text-[#8b8da6]">{brandColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#8b8da6] mb-1">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="captain@team.gg"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="bg-[#1a2735] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Players</div>
                <div className="text-xs text-[#8b8da6]">In-game ID must match the exact character ID used in-game</div>
              </div>
              <button
                type="button"
                onClick={addPlayerRow}
                className="text-xs text-[#00ffc3] hover:text-white font-medium transition-colors"
              >
                + Add Player
              </button>
            </div>

            <div className="space-y-2">
              {/* Column labels */}
              <div className="grid grid-cols-[1fr_1fr_28px] gap-2 px-1">
                <span className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">Player Name</span>
                <span className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">In-Game Character ID</span>
                <span />
              </div>

              {players.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_28px] gap-2 items-center">
                  <input
                    type="text"
                    value={p.display_name}
                    onChange={(e) => updatePlayer(i, 'display_name', e.target.value)}
                    placeholder={`Player ${i + 1}`}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                  />
                  <input
                    type="text"
                    value={p.player_open_id}
                    onChange={(e) => updatePlayer(i, 'player_open_id', e.target.value)}
                    placeholder="exact ID"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removePlayerRow(i)}
                    className={`text-[#8b8da6] hover:text-[#ff4e4e] text-sm transition-colors ${players.length <= 1 ? 'invisible' : ''}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || logoUploading}
            className="w-full bg-[#00ffc3] hover:bg-[#00e6af] disabled:opacity-50 text-[#0e1621] font-bold py-3 rounded-xl transition-colors text-sm"
          >
            {logoUploading ? 'Uploading logo...' : submitting ? 'Submitting...' : 'Submit Application'}
          </button>

          <p className="text-center text-[#8b8da6] text-[10px]">
            Powered by Tournyx
          </p>
        </form>
      </div>
    </div>
  );
}
