export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-[-30%] left-[-15%] w-[700px] h-[700px] rounded-full opacity-[0.05] blur-[140px] animate-gradient"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--purple), var(--accent))', backgroundSize: '200% 200%' }} />
      <div className="absolute bottom-[-25%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[120px] animate-gradient"
        style={{ background: 'linear-gradient(135deg, var(--red), var(--purple), var(--red))', backgroundSize: '200% 200%', animationDelay: '3s' }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 auth-grid-overlay" />

      {/* Diagonal accent line */}
      <div className="absolute top-0 right-[30%] w-px h-[40%] opacity-[0.06] origin-top auth-accent-line" />

      <div className="relative z-10 w-full max-w-[420px] animate-scale-in">{children}</div>
    </div>
  );
}
