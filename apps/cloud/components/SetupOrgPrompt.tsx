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
    const { error: rpcError } = await supabase.rpc('register_organization', {
      org_name: orgName.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#213448]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 3L19 18H3L11 3Z" stroke="#f59e0b" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M11 9.5v4" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="11" cy="16" r="0.9" fill="#f59e0b"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Setup Incomplete</h2>
          <p className="text-[#8b8da6] text-sm">
            Your account doesn&apos;t have an organization yet.<br />
            Enter a name to complete setup.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#213448] border border-white/10 rounded-2xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-[#ff4e4e]/10 border border-[#ff4e4e]/30 text-[#ff4e4e] text-sm px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Pro Esports League"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 text-[#00ffc3] font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Setting up…' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
