export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#213448] px-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(109,94,252,0.15) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
