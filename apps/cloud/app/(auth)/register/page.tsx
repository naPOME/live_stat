'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ orgName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Server-side registration (creates user + org atomically, auto-confirms email)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password, orgName: form.orgName }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Registration failed');
      setLoading(false);
      return;
    }

    // 2. Sign in now that the account exists with a confirmed session
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      setError('Account created — but login failed: ' + signInError.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00ffc3] to-[#00ffc3] flex items-center justify-center shadow-[0_0_24px_rgba(109,94,252,0.4)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9L5.5 5.5L9 9L12.5 5.5L16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-xl font-black tracking-[0.2em] uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-[#00ffc3] via-[#6d5efc] to-[#ff4e4e]">
            Tournyx
          </span>
        </div>
        <p className="text-[#8b8da6] text-sm">Create your organization account</p>
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
            Organization Name
          </label>
          <input
            type="text"
            value={form.orgName}
            onChange={(e) => set('orgName', e.target.value)}
            required
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 focus:ring-1 focus:ring-[#00ffc3]/30 transition-colors"
            placeholder="e.g. Pro Esports League"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8b8da6] uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            required
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
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            required
            minLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ffc3]/60 focus:ring-1 focus:ring-[#00ffc3]/30 transition-colors"
            placeholder="Min. 6 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 disabled:opacity-50 disabled:cursor-not-allowed text-[#00ffc3] font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-[#8b8da6] text-sm mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-[#00ffc3] hover:text-[#8b7ffe] transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
