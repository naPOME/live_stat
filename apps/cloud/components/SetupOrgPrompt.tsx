'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetupOrgPrompt() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('register_organization', { org_name: orgName.trim() });

    if (rpcError) { setError(rpcError.message); setLoading(false); return; }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      {/* Subtle gradient orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.04]"
        style={{ background: 'linear-gradient(135deg, #ffb800, #ff4e4e)' }} />

      <div className="w-full max-w-sm relative z-10 animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(255,184,0,0.1), rgba(255,78,78,0.06))', border: '1px solid rgba(255,184,0,0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L21 20H3L12 3Z" stroke="#ffb800" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M12 10v4.5" stroke="#ffb800" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="12" cy="17.5" r="0.9" fill="#ffb800"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Setup Incomplete</h2>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            Your account doesn&apos;t have an organization yet.<br />
            Enter a name to complete setup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="surface-elevated rounded-2xl p-7 space-y-5 relative accent-top">
          {error && (
            <div className="bg-[#ff4e4e]/6 border border-[#ff4e4e]/15 text-[#ff4e4e] text-sm px-4 py-3 rounded-xl animate-slide-down font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="label">Organization Name</label>
            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
              required autoFocus placeholder="e.g. Pro Esports League" className="input-premium" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
