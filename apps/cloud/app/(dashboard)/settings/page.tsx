'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Organization } from '@/lib/types';

const FONTS = ['Inter', 'Rajdhani', 'Barlow Condensed', 'Bebas Neue', 'Orbitron'];

type TableStyle = 'strip' | 'card' | 'dark' | 'minimal';

const TABLE_STYLES: { id: TableStyle; label: string; desc: string }[] = [
  { id: 'strip',   label: 'Strip',   desc: 'Subtle row highlight, clean lines' },
  { id: 'card',    label: 'Card',    desc: 'Left border accent per team color' },
  { id: 'dark',    label: 'Dark Pro', desc: 'High contrast, bold rank numbers' },
  { id: 'minimal', label: 'Minimal', desc: 'Numbers and names only, no fills' },
];

const VISIBILITY_OPTIONS = [
  { key: 'leaderboard', label: 'Match Ranking', desc: 'Live leaderboard overlay' },
  { key: 'killfeed', label: 'Kill Feed', desc: 'Real-time kill events' },
  { key: 'playercard', label: 'Player Card', desc: 'Observed player stats' },
  { key: 'elimination', label: 'Elimination Notification', desc: 'Team eliminated popup' },
  { key: 'wwcd', label: 'WWCD', desc: 'Winner Winner Chicken Dinner screen' },
  { key: 'fraggers', label: 'Top Fraggers', desc: 'Top players by kills' },
  { key: 'results', label: 'After Match Score', desc: 'Post-match results table' },
  { key: 'pointtable', label: 'Point Table', desc: 'Point system display' },
  { key: 'teamlist', label: 'Team List', desc: 'Teams grid with logos' },
  { key: 'matchinfo', label: 'Match Info', desc: 'Match started notification' },
  { key: 'mvp', label: 'MVP', desc: 'Match MVP display' },
  { key: 'schedule', label: 'Match Schedule', desc: 'Bottom schedule bar' },
  { key: 'sponsor_overlay', label: 'Sponsor Overlay', desc: 'Show sponsor logos on overlays' },
];

type SettingsTab = 'branding' | 'theme' | 'visibility';

function TableStylePreview({
  style, bgColor, accentColor, brandColor, font, selected, onClick,
}: {
  style: TableStyle; bgColor: string; accentColor: string; brandColor: string;
  font: string; selected: boolean; onClick: () => void;
}) {
  const mockTeams = [
    { name: 'TEAM A', pts: 28, color: brandColor },
    { name: 'TEAM B', pts: 21, color: '#ffffff' },
    { name: 'TEAM C', pts: 15, color: '#ffffff' },
  ];

  function rowStyle(i: number, teamColor: string) {
    if (style === 'strip') return { background: i === 0 ? `${brandColor}18` : 'transparent' };
    if (style === 'card') return { background: i === 0 ? `${brandColor}10` : '#ffffff05', borderLeft: `3px solid ${teamColor}66` };
    if (style === 'dark') return { background: i === 0 ? '#ffffff0d' : 'transparent', borderBottom: `1px solid #ffffff08` };
    return {};
  }

  return (
    <button
      type="button"
      onClick={onClick}
    className={`relative rounded-xl overflow-hidden border transition-colors text-left w-full group ${
        selected ? 'border-[var(--accent-border)]' : 'border-[var(--border)] hover:border-[var(--border-hover)]'
      }`}
  >
      {selected && <div className="absolute inset-0 bg-[var(--accent)]/5" />}
      <div className="p-2" style={{ background: bgColor, fontFamily: font }}>
        <div className="flex items-center justify-between px-2 py-1 mb-1" style={{ borderBottom: `1px solid ${accentColor}22` }}>
          <span className="text-[7px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>Live Rankings</span>
          <div className="w-1 h-1 rounded-full" style={{ background: accentColor }} />
        </div>
        {mockTeams.map((t, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2 py-1" style={rowStyle(i, t.color)}>
            <span className="text-[9px] font-black w-3 text-center" style={{ color: i === 0 ? accentColor : '#ffffff44' }}>{i + 1}</span>
            <span className="text-[9px] font-bold flex-1 truncate" style={{ color: i === 0 ? '#fff' : '#ffffff88' }}>{t.name}</span>
            <span className="text-[9px] font-black tabular-nums" style={{ color: i === 0 ? brandColor : '#fff' }}>{t.pts}</span>
          </div>
        ))}
      </div>
      <div className={`px-2 py-1.5 text-center text-[9px] font-display font-semibold uppercase tracking-wider ${selected ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border-t border-[var(--border)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-t border-transparent'}`}>
        {TABLE_STYLES.find(s => s.id === style)?.label}
      </div>
    </button>
  );
}

function ImageUploader({
  label, hint, currentUrl, onUpload, uploading,
}: {
  label: string; hint: string; currentUrl?: string | null; onUpload: (file: File) => void; uploading: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-5">
        <div className="relative group/img">
          {currentUrl ? (
            <div className="w-16 h-16 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] overflow-hidden flex items-center justify-center relative">
              <img src={currentUrl} alt="" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-[var(--bg-surface)] border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] relative overflow-hidden group-hover/img:border-[var(--text-primary)] group-hover/img:text-[var(--text-primary)] transition-colors">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none" className="z-10 relative">
                <path d="M4 14l4-4 3 3 3-4 4 5H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
          )}
          <label className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer z-20">
            <div className="badge badge-accent backdrop-blur-sm shadow-sm">
               {uploading ? 'UPDATING...' : 'REPLACE'}
            </div>
            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} className="hidden" />
          </label>
        </div>
        <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed max-w-[200px]">{hint}</div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [org, setOrg] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [form, setForm] = useState({
    name: '',
    brand_color: '#00ffc3',
    accent_color: '#00ffc3',
    bg_color: '#213448',
    font: 'Inter',
    table_style: 'strip' as TableStyle,
    banner_title: '',
    banner_subtitle: '',
    visibility: {} as Record<string, boolean>,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState('');
  const [pairName, setPairName] = useState('');
  const [pairMsg, setPairMsg] = useState('');
  const [pairing, setPairing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
      if (!profile?.org_id) { setLoading(false); return; }

      const { data: o } = await supabase.from('organizations').select('*').eq('id', profile.org_id).single();
      if (o) {
        setOrg(o as Organization);
        setForm({
          name: o.name,
          brand_color: o.brand_color,
          accent_color: o.accent_color,
          bg_color: o.bg_color,
          font: o.font,
          table_style: (o.table_style ?? 'strip') as TableStyle,
          banner_title: o.banner_title ?? '',
          banner_subtitle: o.banner_subtitle ?? '',
          visibility: o.visibility ?? {},
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);

    const { error } = await supabase.from('organizations').update({
      name: form.name.trim(),
      brand_color: form.brand_color,
      accent_color: form.accent_color,
      bg_color: form.bg_color,
      font: form.font,
      table_style: form.table_style,
      banner_title: form.banner_title || null,
      banner_subtitle: form.banner_subtitle || null,
      visibility: form.visibility,
    } as any).eq('id', org.id);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setOrg((o) => o ? { ...o, ...form } as Organization : o);
    }
    setSaving(false);
  }

  async function uploadImage(file: File, field: string, storagePath: string) {
    if (!org) return;
    setUploading(field);

    const ext = file.name.split('.').pop();
    const path = `orgs/${org.id}/${storagePath}.${ext}`;
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      await supabase.from('organizations').update({ [field]: publicUrl } as any).eq('id', org.id);
      setOrg((o) => o ? { ...o, [field]: publicUrl } as Organization : o);
    }
    setUploading(null);
  }

  function toggleVisibility(key: string) {
    setForm(f => ({
      ...f,
      visibility: { ...f.visibility, [key]: !(f.visibility[key] ?? true) },
    }));
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh]">
        <span className="loader" aria-label="Loading" />
      </div>
    );
  }

  async function approveDevice() {
    if (!pairCode.trim()) return;
    setPairing(true);
    setPairMsg('');
    try {
      const res = await fetch('/api/device-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pairCode.trim().toUpperCase(), device_name: pairName.trim() || null }),
      });
      const d = await res.json();
      if (d.ok) {
        setPairMsg('Device approved');
        setPairCode('');
        setPairName('');
      } else {
        setPairMsg(d.error || 'Approval failed');
      }
    } catch {
      setPairMsg('Network error');
    } finally {
      setPairing(false);
      setTimeout(() => setPairMsg(''), 4000);
    }
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'branding', label: 'Logo & Branding' },
    { id: 'theme', label: 'Overlay Theme' },
    { id: 'visibility', label: 'Widget Visibility' },
  ];

  return (
    <div className="p-10 max-w-[1200px] page-enter mx-auto">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Settings</h1>
        <p className="text-[var(--text-secondary)] text-sm font-body">
          Customize organization branding, competitive overlay theme, and telemetry visibility.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--text-primary)]" />
            )}
          </button>
        ))}
      </div>

      <form onSubmit={save}>
        {/* ─── BRANDING TAB ─── */}
        {activeTab === 'branding' && (
          <div className="space-y-6 animate-fade-in pb-32">
            {/* Organization Info */}
            <div className="surface p-6">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--border)]">Organization Profile</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <ImageUploader
                  label="Organization Logo"
                  hint="PNG or SVG recommended. Included in match export ZIP and overlays."
                  currentUrl={org?.logo_url}
                  onUpload={(f) => uploadImage(f, 'logo_url', 'logo')}
                  uploading={uploading === 'logo_url'}
                />
                <ImageUploader
                  label="Favicon"
                  hint="Small icon for browser tab. 32x32 or 64x64 PNG."
                  currentUrl={org?.favicon_url}
                  onUpload={(f) => uploadImage(f, 'favicon_url', 'favicon')}
                  uploading={uploading === 'favicon_url'}
                />
              </div>

              <div className="max-w-md">
                <label className="label">Organization Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="input-premium"
                />
              </div>

              {org?.api_key && (
                <div className="max-w-md mt-6">
                  <label className="label">Organization API Key</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={org.api_key ?? ''}
                      className="input-premium font-mono"
                    />
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => { if (org.api_key) navigator.clipboard.writeText(org.api_key); }}
                    >
                      Copy
                    </button>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-2">
                    Use this key to link local production PCs at the organization level.
                  </div>
                </div>
              )}
            </div>

            <div className="surface p-6">
              <div className="mb-6 pb-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Pair Device</h2>
                <div className="text-[13px] text-[var(--text-secondary)]">Approve a local device using its 6-digit code</div>
              </div>

              <div className="flex items-center gap-4 max-w-md">
                <input
                  type="text"
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value.toUpperCase().slice(0, 6))}
                  className="input-premium font-mono tracking-[0.2em] text-center"
                  placeholder="CODE"
                />
                <input
                  type="text"
                  value={pairName}
                  onChange={(e) => setPairName(e.target.value)}
                  className="input-premium"
                  placeholder="Device name (optional)"
                />
                <button type="button" className="btn" onClick={approveDevice} disabled={pairing || pairCode.length !== 6}>
                  {pairing ? 'Approving…' : 'Approve'}
                </button>
              </div>
              {pairMsg && <div className="text-[11px] text-[var(--text-secondary)] mt-3">{pairMsg}</div>}
            </div>

            {/* Sponsor Logos */}
            <div className="surface p-6">
              <div className="mb-6 pb-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Sponsor Logos</h2>
                <div className="text-[13px] text-[var(--text-secondary)]">Up to 3 sponsor logos displayed on overlays and public pages</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { field: 'sponsor1_url', path: 'sponsor1', label: 'Sponsor 1' },
                    { field: 'sponsor2_url', path: 'sponsor2', label: 'Sponsor 2' },
                    { field: 'sponsor3_url', path: 'sponsor3', label: 'Sponsor 3' },
                  ].map(({ field, path, label }) => (
                    <ImageUploader
                      key={field}
                      label={label}
                      hint="PNG with transparent bg"
                      currentUrl={(org as any)?.[field]}
                      onUpload={(f) => uploadImage(f, field, path)}
                      uploading={uploading === field}
                    />
                  ))}
                </div>
              </div>

            {/* Banner / Hero */}
            <div className="surface p-6">
              <div className="mb-6 pb-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Banner & Hero</h2>
                <div className="text-[13px] text-[var(--text-secondary)]">Displayed on tournament public pages and overlay headers</div>
              </div>

              <div className="space-y-6">
                <ImageUploader
                  label="Banner Image"
                  hint="Recommended: 1920x400 or wider. Used as hero background on public pages."
                  currentUrl={org?.banner_url}
                  onUpload={(f) => uploadImage(f, 'banner_url', 'banner')}
                  uploading={uploading === 'banner_url'}
                />

                {/* Banner preview */}
                {org?.banner_url && (
                  <div className="relative rounded-lg overflow-hidden h-[160px] bg-[var(--bg-elevated)] border border-[var(--border)] group">
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${org.banner_url})` }} />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute bottom-0 left-0 p-6 w-full flex items-end justify-between">
                      <div>
                        <div className="font-display font-bold text-2xl text-white mb-1">{form.banner_title || 'Tournament Title'}</div>
                        <div className="text-[var(--text-secondary)] text-sm">{form.banner_subtitle || 'Subtitle text'}</div>
                      </div>
                      <div className="badge badge-muted">Preview</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="label">Banner Title</label>
                    <input
                      type="text"
                      value={form.banner_title}
                      onChange={(e) => setForm((f) => ({ ...f, banner_title: e.target.value }))}
                      placeholder="e.g. PMPL Africa Championship"
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="label">Banner Subtitle</label>
                    <input
                      type="text"
                      value={form.banner_subtitle}
                      onChange={(e) => setForm((f) => ({ ...f, banner_subtitle: e.target.value }))}
                      placeholder="e.g. $50,000 Prize Pool"
                      className="input-premium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── THEME TAB ─── */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 pb-32 animate-fade-in items-start">
            <div className="space-y-6">
              {/* Colors */}
              <div className="surface p-6">
                <div className="mb-6 pb-4 border-b border-[var(--border)]">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Overlay Colors</h2>
                  <div className="text-[13px] text-[var(--text-secondary)]">Applied to all live overlays in OBS</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { key: 'brand_color', label: 'Brand / Primary', desc: 'Team rows, rank highlights' },
                    { key: 'accent_color', label: 'Accent', desc: 'Kill counts, alive bars, live dots' },
                    { key: 'bg_color', label: 'Background', desc: 'Overlay panel background' },
                  ].map(({ key, label, desc }) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <div className="flex items-center mb-2">
                        <label className="relative cursor-pointer w-10 h-10 shrink-0 block">
                          <input
                            type="color"
                            value={form[key as keyof typeof form] as string}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
                          />
                          <div
                            className="w-10 h-10 rounded-l-lg border border-r-0 border-[var(--border)] absolute inset-0"
                            style={{ backgroundColor: form[key as keyof typeof form] as string }}
                          />
                        </label>
                        <input
                          type="text"
                          value={form[key as keyof typeof form] as string}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm((f) => ({ ...f, [key]: v }));
                          }}
                          className="flex-1 min-w-0 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-r-lg px-3 h-10 text-[var(--text-primary)] text-sm font-mono focus:outline-none focus:border-[var(--text-primary)] transition-colors uppercase"
                        />
                      </div>
                      <div className="text-[12px] text-[var(--text-secondary)]">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font */}
              <div className="surface p-6">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Overlay Typography</h2>
                <div className="flex gap-3 flex-wrap">
                  {FONTS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm((form) => ({ ...form, font: f }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.font === f
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-base)]'
                          : 'border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                      }`}
                      style={{ fontFamily: f }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Style */}
              <div className="surface p-6">
                <div className="mb-6 pb-4 border-b border-[var(--border)]">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Leaderboard Architecture</h2>
                  <div className="text-[13px] text-[var(--text-secondary)]">Structure and appearance of team rows in the broadcast</div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {TABLE_STYLES.map((s) => (
                    <div key={s.id}>
                      <TableStylePreview
                        style={s.id}
                        bgColor={form.bg_color}
                        accentColor={form.accent_color}
                        brandColor={form.brand_color}
                        font={form.font}
                        selected={form.table_style === s.id}
                        onClick={() => setForm((f) => ({ ...f, table_style: s.id }))}
                      />
                      <div className="text-[12px] text-[var(--text-secondary)] mt-2 text-center">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="sticky top-8">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">Live Output Preview</h3>
              <div
                className="rounded-xl overflow-hidden shadow-lg border relative"
                style={{ fontFamily: form.font, background: `${form.bg_color}f5`, borderColor: `${form.accent_color}40`, width: '100%' }}
              >
                <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${form.accent_color}22` }}>
                  <div className="flex items-center gap-2">
                    {org?.logo_url && <img src={org.logo_url} alt="" className="w-5 h-5 rounded object-cover" />}
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: form.accent_color }}>Live Rankings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: form.accent_color }} />
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: form.accent_color }}>Live</span>
                  </div>
                </div>
                <div className="grid grid-cols-[20px_1fr_28px_28px_36px] gap-1 px-3 py-1.5" style={{ borderBottom: `1px solid ${form.accent_color}11` }}>
                  {['#', 'Team', '', 'K', 'Pts'].map((h) => (
                    <span key={h} className="text-[9px] font-semibold uppercase tracking-wider text-center" style={{ color: form.accent_color + 'aa' }}>{h}</span>
                  ))}
                </div>
                {[
                  { name: 'TEAM A', pts: 28, kills: 13, alive: 3 },
                  { name: 'TEAM B', pts: 21, kills: 9, alive: 4 },
                  { name: 'TEAM C', pts: 15, kills: 5, alive: 2 },
                  { name: 'TEAM D', pts: 8, kills: 3, alive: 0 },
                ].map((t, i) => {
                  const s = form.table_style;
                  const rs = s === 'strip' ? { background: i === 0 ? `${form.brand_color}1a` : 'transparent' }
                    : s === 'card' ? { background: i === 0 ? `${form.brand_color}15` : 'transparent', borderLeft: `3px solid ${i === 0 ? form.brand_color : '#ffffff'}40` }
                    : s === 'dark' ? { background: i === 0 ? '#ffffff0a' : 'transparent', borderBottom: `1px solid #ffffff0a` }
                    : {};
                  return (
                    <div key={i} className="grid grid-cols-[20px_1fr_28px_28px_36px] gap-1 items-center px-3 py-1.5" style={rs}>
                      <span className="text-[11px] font-medium text-center" style={{ color: i === 0 ? form.accent_color : '#ffffff55' }}>{i + 1}</span>
                      <span className="text-[12px] font-medium truncate" style={{ color: i === 0 ? '#fff' : '#ffffffbb' }}>{t.name}</span>
                      <div className="flex gap-[1px] justify-center">
                        {Array.from({ length: 4 }, (_, b) => (
                          <div key={b} className="w-1 h-2.5 rounded-[1px]" style={{ backgroundColor: b < t.alive ? form.accent_color : '#ffffff15' }} />
                        ))}
                      </div>
                      <span className="text-[12px] font-medium text-center tabular-nums" style={{ color: form.accent_color }}>{t.kills}</span>
                      <span className="text-[13px] font-semibold text-center tabular-nums" style={{ color: i === 0 ? form.brand_color : '#fff' }}>{t.pts}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── VISIBILITY TAB ─── */}
        {activeTab === 'visibility' && (
          <div className="surface p-6 pb-32 animate-fade-in">
            <div className="mb-6 flex items-start justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Widget Visibility</h2>
                <div className="text-[13px] text-[var(--text-secondary)]">Control which overlay widgets are active during your broadcast</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    VISIBILITY_OPTIONS.forEach(o => { all[o.key] = true; });
                    setForm(f => ({ ...f, visibility: all }));
                  }}
                  className="btn-ghost btn-sm"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const none: Record<string, boolean> = {};
                    VISIBILITY_OPTIONS.forEach(o => { none[o.key] = false; });
                    setForm(f => ({ ...f, visibility: none }));
                  }}
                  className="btn-ghost btn-sm"
                >
                  Disable All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {VISIBILITY_OPTIONS.map(({ key, label, desc }) => {
                const enabled = form.visibility[key] ?? true;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleVisibility(key)}
                    className={`flex flex-col items-start p-4 rounded-lg border transition-all text-left ${
                      enabled 
                        ? 'bg-[var(--bg-elevated)] border-[var(--border-hover)]' 
                        : 'bg-[var(--bg-surface)] border-[var(--border)] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`text-sm font-medium transition-colors ${enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{label}</div>
                      <div className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded ${
                        enabled ? 'bg-[var(--text-primary)] text-[var(--bg-base)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}>
                        {enabled ? 'Active' : 'Hidden'}
                      </div>
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)]">{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Save button - always visible floating dock */}
        <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none flex justify-center pb-8">
          <div className="pointer-events-auto flex items-center gap-6 bg-[var(--bg-surface)] backdrop-blur-xl border border-[var(--border)] rounded-full p-2 pl-6 shadow-xl animate-slide-up">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${saving ? 'bg-[var(--text-muted)]' : saved ? 'bg-green-500' : 'bg-[var(--text-muted)]'}`} />
              <div className="text-[13px] font-medium text-[var(--text-secondary)]">
                {saving ? 'Saving...' : saved ? 'Saved' : 'Unsaved Changes'}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary rounded-full px-6 py-2"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
