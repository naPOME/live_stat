'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div>
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00ffc3] to-[#00ffc3] flex items-center justify-center shadow-[0_0_24px_rgba(109,94,252,0.4)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9L5.5 5.5L9 9L12.5 5.5L16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 13L5.5 9.5L9 13L12.5 9.5L16 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">LiveStat Cloud</span>
        </div>
        <p className="text-[#8b8da6] text-sm">Sign in to your organization</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#213448] border border-white/10 rounded-2xl p-6 space-y-4 shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
      >
        {error && (
          <div className="bg-[#ff4e4e]/10 border border-[#ff4e4e]/30 text-[#ff4e4e] text-sm px-3 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 focus:ring-1 focus:ring-[#00ffc3]/30 transition-colors"
            placeholder="admin@org.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 focus:ring-1 focus:ring-[#00ffc3]/30 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 disabled:cursor-not-allowed text-[#00ffc3] font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-[#8b8da6] text-sm mt-5">
        New organization?{' '}
        <Link href="/register" className="text-[#00ffc3] hover:text-[#8b7ffe] transition-colors font-medium">
          Create account
        </Link>
      </p>
    </div>
  );
}
