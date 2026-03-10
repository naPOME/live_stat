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
      className={`rounded-xl overflow-hidden border-2 transition-all text-left w-full ${
        selected ? 'border-[#00ffc3] shadow-[0_0_0_1px_rgba(0,255,195,0.3)]' : 'border-white/10 hover:border-white/20'
      }`}
    >
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
      <div className={`px-2 py-1.5 text-center text-[9px] font-semibold ${selected ? 'bg-[#00ffc3]/20 text-[#00ffc3]' : 'bg-white/5 text-[#8b8da6]'}`}>
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
      <label className="block text-xs text-[#8b8da6] mb-2">{label}</label>
      <div className="flex items-center gap-4">
        <div className="relative group/img">
          {currentUrl ? (
            <img src={currentUrl} alt="" className="w-16 h-16 rounded-xl object-cover bg-white/5" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-[#8b8da6]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 14l4-4 3 3 3-4 4 5H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer text-xs text-white font-medium">
            {uploading ? '...' : 'Upload'}
            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} className="hidden" />
          </label>
        </div>
        <div className="text-[10px] text-[#8b8da6] leading-relaxed">{hint}</div>
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

  if (loading) return <div className="p-8 text-[#8b8da6]">Loading...</div>;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'branding', label: 'Logo & Branding' },
    { id: 'theme', label: 'Overlay Theme' },
    { id: 'visibility', label: 'Widget Visibility' },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#8b8da6] text-sm mt-1">Customize your organization branding, overlay theme, and widget visibility</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#1a2a3a] border border-white/10 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white/10 text-white' : 'text-[#8b8da6] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={save}>
        {/* ─── BRANDING TAB ─── */}
        {activeTab === 'branding' && (
          <div className="space-y-5">
            {/* Organization Info */}
            <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">Organization</div>

              <div className="grid grid-cols-2 gap-6">
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

              <div>
                <label className="block text-xs text-[#8b8da6] mb-1.5">Organization Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                />
              </div>
            </div>

            {/* Sponsor Logos */}
            <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl p-5 space-y-4">
              <div>
                <div className="text-sm font-semibold text-white">Sponsor Logos</div>
                <div className="text-xs text-[#8b8da6] mt-0.5">Up to 3 sponsor logos displayed on overlays and public pages</div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
            <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl p-5 space-y-4">
              <div>
                <div className="text-sm font-semibold text-white">Banner & Hero</div>
                <div className="text-xs text-[#8b8da6] mt-0.5">Displayed on tournament public pages and overlay headers</div>
              </div>

              <ImageUploader
                label="Banner Image"
                hint="Recommended: 1920x400 or wider. Used as hero background on public pages."
                currentUrl={org?.banner_url}
                onUpload={(f) => uploadImage(f, 'banner_url', 'banner')}
                uploading={uploading === 'banner_url'}
              />

              {/* Banner preview */}
              {org?.banner_url && (
                <div
                  className="relative rounded-xl overflow-hidden h-[120px] bg-cover bg-center"
                  style={{ backgroundImage: `url(${org.banner_url})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <div className="text-white font-black text-lg">{form.banner_title || 'Tournament Title'}</div>
                    <div className="text-[#8b8da6] text-xs">{form.banner_subtitle || 'Subtitle text'}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#8b8da6] mb-1.5">Banner Title</label>
                  <input
                    type="text"
                    value={form.banner_title}
                    onChange={(e) => setForm((f) => ({ ...f, banner_title: e.target.value }))}
                    placeholder="e.g. PMPL Africa Championship"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8b8da6] mb-1.5">Banner Subtitle</label>
                  <input
                    type="text"
                    value={form.banner_subtitle}
                    onChange={(e) => setForm((f) => ({ ...f, banner_subtitle: e.target.value }))}
                    placeholder="e.g. $50,000 Prize Pool"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── THEME TAB ─── */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
            <div className="space-y-5">
              {/* Colors */}
              <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl p-5 space-y-5">
                <div>
                  <div className="text-sm font-semibold text-white mb-0.5">Overlay Colors</div>
                  <div className="text-xs text-[#8b8da6]">Applied to all live overlays in OBS</div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'brand_color', label: 'Brand / Primary', desc: 'Team rows, rank highlights' },
                    { key: 'accent_color', label: 'Accent', desc: 'Kill counts, alive bars, live dots' },
                    { key: 'bg_color', label: 'Background', desc: 'Overlay panel background' },
                  ].map(({ key, label, desc }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-2">{label}</label>
                      <div className="flex items-center mb-1">
                        <label className="relative cursor-pointer w-10 h-10 shrink-0 block">
                          <input
                            type="color"
                            value={form[key as keyof typeof form] as string}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                          />
                          <div
                            className="w-10 h-10 rounded-l-lg border border-r-0 border-white/10 absolute inset-0"
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
                          className="flex-1 w-full min-w-0 bg-white/5 border border-white/10 rounded-r-lg px-3 h-10 text-white text-sm font-mono focus:outline-none focus:border-[#00ffc3]/60 transition-colors uppercase"
                        />
                      </div>
                      <div className="text-[10px] text-[#8b8da6]">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font */}
              <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl p-5 space-y-3">
                <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider">Overlay Font</label>
                <div className="flex gap-2 flex-wrap">
                  {FONTS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm((form) => ({ ...form, font: f }))}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        form.font === f
                          ? 'border-[#00ffc3] bg-[#00ffc3]/15 text-white'
                          : 'border-white/10 bg-white/5 text-[#8b8da6] hover:text-white hover:border-white/20'
                      }`}
                      style={{ fontFamily: f }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Style */}
              <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl p-5 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-1">Leaderboard Style</div>
                  <div className="text-[10px] text-[#8b8da6] mb-3">How team rows appear in the overlay leaderboard</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
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
                      <div className="text-[9px] text-[#8b8da6] mt-1 text-center leading-tight">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="sticky top-8">
              <div className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-3">Live Preview</div>
              <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{ fontFamily: form.font, background: `${form.bg_color}ee`, border: `1px solid ${form.accent_color}22`, width: 320 }}
              >
                <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${form.accent_color}22` }}>
                  <div className="flex items-center gap-2">
                    {org?.logo_url && <img src={org.logo_url} alt="" className="w-5 h-5 rounded object-cover" />}
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: form.accent_color }}>Live Rankings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: form.accent_color }} />
                    <span className="text-[9px] font-bold uppercase" style={{ color: form.accent_color }}>Live</span>
                  </div>
                </div>
                <div className="grid grid-cols-[20px_1fr_28px_28px_36px] gap-1 px-3 py-1.5" style={{ borderBottom: `1px solid ${form.accent_color}11` }}>
                  {['#', 'Team', '', 'K', 'Pts'].map((h) => (
                    <span key={h} className="text-[8px] font-bold uppercase tracking-wider text-center" style={{ color: form.accent_color + '88' }}>{h}</span>
                  ))}
                </div>
                {[
                  { name: 'TEAM A', pts: 28, kills: 13, alive: 3 },
                  { name: 'TEAM B', pts: 21, kills: 9, alive: 4 },
                  { name: 'TEAM C', pts: 15, kills: 5, alive: 2 },
                  { name: 'TEAM D', pts: 8, kills: 3, alive: 0 },
                ].map((t, i) => {
                  const s = form.table_style;
                  const rs = s === 'strip' ? { background: i === 0 ? `${form.brand_color}18` : 'transparent' }
                    : s === 'card' ? { background: i === 0 ? `${form.brand_color}15` : '#ffffff05', borderLeft: `4px solid ${i === 0 ? form.brand_color : '#ffffff'}88` }
                    : s === 'dark' ? { background: i === 0 ? '#ffffff0d' : 'transparent', borderBottom: `1px solid #ffffff15` }
                    : {};
                  return (
                    <div key={i} className="grid grid-cols-[20px_1fr_28px_28px_36px] gap-1 items-center px-3 py-1.5" style={rs}>
                      <span className="text-[10px] font-black text-center" style={{ color: i === 0 ? form.accent_color : '#ffffff55' }}>{i + 1}</span>
                      <span className="text-[11px] font-bold uppercase truncate" style={{ color: i === 0 ? '#fff' : '#ffffff99' }}>{t.name}</span>
                      <div className="flex gap-0.5 justify-center">
                        {Array.from({ length: 4 }, (_, b) => (
                          <div key={b} className="w-1 h-3 rounded-sm" style={{ backgroundColor: b < t.alive ? form.accent_color : '#ffffff15' }} />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-center tabular-nums" style={{ color: form.accent_color }}>{t.kills}</span>
                      <span className="text-[12px] font-black text-center tabular-nums" style={{ color: i === 0 ? form.brand_color : '#fff' }}>{t.pts}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#8b8da6] mt-3 text-center">Updates in real-time as you adjust</p>
            </div>
          </div>
        )}

        {/* ─── VISIBILITY TAB ─── */}
        {activeTab === 'visibility' && (
          <div className="space-y-5">
            <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl p-5">
              <div className="mb-4">
                <div className="text-sm font-semibold text-white">Widget Visibility</div>
                <div className="text-xs text-[#8b8da6] mt-0.5">Control which overlay widgets are active during your broadcast. Disabled widgets will show nothing when loaded in OBS.</div>
              </div>

              <div className="space-y-1">
                {VISIBILITY_OPTIONS.map(({ key, label, desc }) => {
                  const enabled = form.visibility[key] ?? true;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleVisibility(key)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        enabled ? 'bg-white/5 hover:bg-white/8' : 'bg-transparent hover:bg-white/3 opacity-50'
                      }`}
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium text-white">{label}</div>
                        <div className="text-[10px] text-[#8b8da6]">{desc}</div>
                      </div>
                      {/* Toggle switch */}
                      <div
                        className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ml-4 ${
                          enabled ? 'bg-[#00ffc3]' : 'bg-white/10'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                            enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  VISIBILITY_OPTIONS.forEach(o => { all[o.key] = true; });
                  setForm(f => ({ ...f, visibility: all }));
                }}
                className="text-xs text-[#00ffc3] hover:text-white border border-[#00ffc3]/30 px-3 py-1.5 rounded-lg transition-colors"
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
                className="text-xs text-[#8b8da6] hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                Disable All
              </button>
            </div>
          </div>
        )}

        {/* Save button - always visible */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/5">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 text-[#00ffc3] font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-[#00ffc3] text-sm font-medium">Saved</span>}
        </div>
      </form>
    </div>
  );
}
