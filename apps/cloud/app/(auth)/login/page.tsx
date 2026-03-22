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

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push('/'); router.refresh(); }
  }

  return (
    <>
      <div className="mb-10">
        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight">
          Welcome back
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Sign in to your organization dashboard
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-[#ff4e4e]/8 border border-[#ff4e4e]/20 text-[#ff4e4e] text-sm px-4 py-3 rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="input-premium w-full"
            placeholder="admin@gmail.com"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-premium w-full"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-sm font-bold mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-[var(--border)]">
        <p className="text-[var(--text-muted)] text-sm text-center">
          New organization?{' '}
          <Link href="/register" className="text-[#00ffc3] hover:opacity-80 transition-opacity font-semibold">
            Create account
          </Link>
        </p>
      </div>
    </>
  );
}
