const BG = 'https://a-static.besthdwallpaper.com/playerunknown-s-battlegrounds-pubg-mobile-battle-in-mad-miramar-wallpaper-2560x1080-63448_14.jpg';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left: cinematic image panel ───────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{ backgroundImage: `url(${BG})`, backgroundSize: 'cover', backgroundPosition: 'center 35%' }}>

        {/* Dark gradient overlays */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, transparent 60%, rgba(0,0,0,0.6) 100%)' }} />

        {/* Brand top-left */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
           
            <span className="font-display text-lg font-bold tracking-wider uppercase text-white">Tournyx</span>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 mt-auto p-10 pb-14">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 mb-4">
            Esport Tournament Platform
          </div>
          <h2 className="text-[3.5rem] font-black text-white leading-[1.05] tracking-tight">
            Manage.<br />Compete.<br />
            <span style={{ color: '#00ffc3' }}>Dominate.</span>
          </h2>
          <p className="text-white/40 text-sm mt-5 max-w-xs leading-relaxed">
            End-to-end tournament management — brackets, live stats, OBS overlays, and more.
          </p>
        </div>
      </div>

      {/* ── Right: form panel ─────────────────────────────────── */}
      <div className="w-full lg:w-[460px] flex-shrink-0 flex flex-col items-center justify-center p-8 bg-[var(--bg-base)] relative">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, #00ffc330, transparent)' }} />

        <div className="w-full max-w-[360px]">
          {/* Mobile logo (hidden on large screens where panel shows) */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
          
            <span className="font-display font-bold tracking-wider uppercase text-[var(--text-primary)]">Tournyx</span>
          </div>

          {children}
        </div>
      </div>

    </div>
  );
}
