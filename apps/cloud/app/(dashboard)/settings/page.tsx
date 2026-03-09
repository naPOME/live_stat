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

function TableStylePreview({
  style,
  bgColor,
  accentColor,
  brandColor,
  font,
  selected,
  onClick,
}: {
  style: TableStyle;
  bgColor: string;
  accentColor: string;
  brandColor: string;
  font: string;
  selected: boolean;
  onClick: () => void;
}) {
  const mockTeams = [
    { name: 'TEAM A', pts: 28, alive: 3, color: brandColor },
    { name: 'TEAM B', pts: 21, alive: 2, color: '#ffffff' },
    { name: 'TEAM C', pts: 15, alive: 1, color: '#ffffff' },
  ];

  function rowStyle(i: number, teamColor: string) {
    if (style === 'strip') return { background: i === 0 ? `${brandColor}18` : 'transparent' };
    if (style === 'card') return { background: i === 0 ? `${brandColor}10` : '#ffffff05', borderLeft: `3px solid ${teamColor}66` };
    if (style === 'dark') return { background: i === 0 ? '#ffffff0d' : 'transparent', borderBottom: `1px solid #ffffff08` };
    return {}; // minimal
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl overflow-hidden border-2 transition-all text-left ${
        selected ? 'border-[#00ffc3] shadow-[0_0_0_1px_rgba(109,94,252,0.3)]' : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div
        className="p-2"
        style={{ background: bgColor, fontFamily: font }}
      >
        {/* Mini header */}
        <div
          className="flex items-center justify-between px-2 py-1 mb-1 rounded-t"
          style={{ borderBottom: `1px solid ${accentColor}22` }}
        >
          <span className="text-[7px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>Live Rankings</span>
          <div className="w-1 h-1 rounded-full" style={{ background: accentColor }} />
        </div>
        {mockTeams.map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2 py-1"
            style={rowStyle(i, t.color)}
          >
            <span
              className="text-[9px] font-black w-3 text-center"
              style={{ color: i === 0 ? accentColor : '#ffffff44' }}
            >
              {i + 1}
            </span>
            <span
              className="text-[9px] font-bold flex-1 truncate"
              style={{ color: i === 0 ? '#fff' : '#ffffff88' }}
            >
              {t.name}
            </span>
            <span className="text-[9px] font-black tabular-nums" style={{ color: i === 0 ? brandColor : '#fff' }}>
              {t.pts}
            </span>
          </div>
        ))}
      </div>
      <div className={`px-2 py-1.5 text-center text-[9px] font-semibold ${selected ? 'bg-[#00ffc3]/20 text-[#00ffc3]' : 'bg-white/5 text-[#8b8da6]'}`}>
        {TABLE_STYLES.find(s => s.id === style)?.label}
      </div>
    </button>
  );
}

// Mini leaderboard preview component
function LeaderboardPreview({
  bgColor,
  accentColor,
  brandColor,
  font,
  style,
  orgLogo,
}: {
  bgColor: string;
  accentColor: string;
  brandColor: string;
  font: string;
  style: TableStyle;
  orgLogo?: string | null;
}) {
  const mockTeams = [
    { name: 'TEAM A', pts: 28, kills: 13, alive: 3, color: brandColor },
    { name: 'TEAM B', pts: 21, kills: 9, alive: 4, color: '#ffffff' },
    { name: 'TEAM C', pts: 15, kills: 5, alive: 2, color: '#ffffff' },
    { name: 'TEAM D', pts: 8, kills: 3, alive: 1, color: '#ffffff' },
    { name: 'TEAM E', pts: 3, kills: 1, alive: 0, color: '#ffffff' },
  ];

  function rowStyle(i: number, teamColor: string) {
    if (style === 'strip') return { background: i === 0 ? `${brandColor}18` : 'transparent', borderBottom: i < mockTeams.length - 1 ? `1px solid ${accentColor}0a` : 'none' };
    if (style === 'card') return { background: i === 0 ? `${brandColor}15` : '#ffffff05', borderLeft: `4px solid ${teamColor}88`, borderBottom: i < mockTeams.length - 1 ? `1px solid ${accentColor}0a` : 'none' };
    if (style === 'dark') return { background: i === 0 ? '#ffffff0d' : 'transparent', borderBottom: `1px solid #ffffff15` };
    return { borderBottom: i < mockTeams.length - 1 ? `1px solid ${accentColor}0a` : 'none' }; // minimal
  }

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ fontFamily: font, background: `${bgColor}ee`, border: `1px solid ${accentColor}22`, width: 320 }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: `${bgColor}`, borderBottom: `1px solid ${accentColor}22` }}
      >
        <div className="flex items-center gap-2">
          {orgLogo && <img src={orgLogo} alt="" className="w-5 h-5 rounded object-cover" />}
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
            Live Rankings
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
          <span className="text-[9px] font-bold uppercase" style={{ color: accentColor }}>Live</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[20px_1fr_28px_28px_36px] gap-1 px-3 py-1.5" style={{ borderBottom: `1px solid ${accentColor}11` }}>
        {['#', 'Team', '▪▪', 'K', 'Pts'].map((h) => (
          <span key={h} className="text-[8px] font-bold uppercase tracking-wider text-center" style={{ color: accentColor + '88' }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      {mockTeams.map((t, i) => (
        <div
          key={i}
          className="grid grid-cols-[20px_1fr_28px_28px_36px] gap-1 items-center px-3 py-1.5"
          style={rowStyle(i, t.color)}
        >
          <span
            className="text-[10px] font-black text-center"
            style={{ color: i === 0 ? accentColor : '#ffffff55' }}
          >
            {i + 1}
          </span>
          <span
            className="text-[11px] font-bold uppercase truncate"
            style={{ color: i === 0 ? '#fff' : '#ffffff99' }}
          >
            {t.name}
          </span>
          {/* Alive bars */}
          <div className="flex gap-0.5 justify-center">
            {Array.from({ length: 4 }, (_, b) => (
              <div
                key={b}
                className="w-1 h-3 rounded-sm"
                style={{ backgroundColor: b < t.alive ? accentColor : '#ffffff15' }}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-center tabular-nums" style={{ color: accentColor }}>
            {t.kills}
          </span>
          <span className="text-[12px] font-black text-center tabular-nums" style={{ color: i === 0 ? brandColor : '#fff' }}>
            {t.pts}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [org, setOrg] = useState<Organization | null>(null);
  const [form, setForm] = useState({
    name: '',
    brand_color: '#00ffc3',
    accent_color: '#00ffc3',
    bg_color: '#213448',
    font: 'Inter',
    table_style: 'strip' as TableStyle,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
      if (!profile?.org_id) { setLoading(false); return; }

      const { data: o } = await supabase.from('organizations').select('*').eq('id', profile.org_id).single();
      if (o) {
        setOrg(o);
        setForm({
          name: o.name,
          brand_color: o.brand_color,
          accent_color: o.accent_color,
          table_style: ((o as any).table_style ?? 'strip') as TableStyle,
          bg_color: o.bg_color,
          font: o.font,
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
    } as any).eq('id', org.id);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setOrg((o) => o ? { ...o, ...form } : o);
    }
    setSaving(false);
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    setLogoUploading(true);

    const ext = file.name.split('.').pop();
    const path = `orgs/${org.id}/logo.${ext}`;
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', org.id);
      setOrg((o) => o ? { ...o, logo_url: publicUrl } : o);
    }
    setLogoUploading(false);
  }

  if (loading) return <div className="p-8 text-[#8b8da6]">Loading…</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Organization Settings</h1>
        <p className="text-[#8b8da6] text-sm mt-1">Branding is applied to all exported match packages and overlays</p>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-6 items-start">
        {/* Form */}
        <form onSubmit={save} className="space-y-5">
          {/* Org info */}
          <div className="bg-[#213448] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="text-sm font-semibold text-white">Organization</div>

            {/* Logo */}
            <div>
              <label className="block text-xs text-[#8b8da6] mb-2">Logo</label>
              <div className="flex items-center gap-4">
                <div className="relative group/logo">
                  {org?.logo_url ? (
                    <img src={org.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover bg-white/5" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-[#8b8da6]">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 14l4-4 3 3 3-4 4 5H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer text-xs text-white font-medium">
                    {logoUploading ? '…' : 'Upload'}
                    <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                  </label>
                </div>
                <div className="text-xs text-[#8b8da6]">
                  Hover to upload<br />
                  PNG or SVG recommended<br />
                  Included in match export ZIP
                </div>
              </div>
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

          {/* Theme */}
          <div className="bg-[#213448] border border-white/10 rounded-2xl p-5 space-y-5">
            <div>
              <div className="text-sm font-semibold text-white mb-0.5">Overlay Theme</div>
              <div className="text-xs text-[#8b8da6]">Applied to live leaderboard, killfeed, and player card overlays</div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'brand_color', label: 'Brand / Primary', desc: 'Team rows, rank highlights' },
                { key: 'accent_color', label: 'Accent', desc: 'Kill counts, live dots, alive bars' },
                { key: 'bg_color', label: 'Background', desc: 'Overlay panel background' },
              ].map(({ key, label, desc }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-2">{label}</label>
                  <label className="flex items-center mb-1 group relative cursor-pointer">
                    <input
                      type="color"
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <div
                      className="w-10 h-10 rounded-l-lg border border-r-0 border-white/10 shrink-0"
                      style={{ backgroundColor: form[key as keyof typeof form] }}
                    />
                    <input
                      type="text"
                      value={form[key as keyof typeof form]}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm((f) => ({ ...f, [key]: v }));
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-r-lg px-3 h-10 text-white text-sm font-mono focus:outline-none focus:border-[#00ffc3]/60 transition-colors uppercase"
                    />
                  </label>
                  <div className="text-[10px] text-[#8b8da6]">{desc}</div>
                </div>
              ))}
            </div>

            {/* Font */}
            <div>
              <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-2">Overlay Font</label>
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
            <div>
              <div className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-1">Leaderboard Style</div>
              <div className="text-[10px] text-[#8b8da6] mb-3">Choose how team rows appear in the overlay leaderboard</div>
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

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 text-[#00ffc3] font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            {saved && <span className="text-[#00ffc3] text-sm font-medium">Saved ✓</span>}
          </div>
        </form>

        {/* Live preview */}
        <div className="sticky top-8">
          <div className="text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-3">Live Preview</div>
          <LeaderboardPreview
            bgColor={form.bg_color}
            accentColor={form.accent_color}
            brandColor={form.brand_color}
            font={form.font}
            style={form.table_style}
            orgLogo={org?.logo_url}
          />
          <p className="text-[10px] text-[#8b8da6] mt-3 text-center">
            Preview updates in real-time as you adjust settings
          </p>
        </div>
      </div>
    </div>
  );
}
