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
    if (error) { setError(error.message); setLoading(false); }
    else { router.push('/'); router.refresh(); }
  }

  return (
    <div>
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3.5 mb-5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00ffc3, #00b89c)' }}>
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M2 9L5.5 5.5L9 9L12.5 5.5L16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 13L5.5 9.5L9 13L12.5 9.5L16 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
              </svg>
            </div>
            <div className="absolute -inset-2 rounded-2xl blur-xl opacity-30"
              style={{ background: 'linear-gradient(135deg, #00ffc3, #00b89c)' }} />
          </div>
          <span className="font-display text-2xl font-bold tracking-wider uppercase text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(135deg, #00ffc3 0%, #6d5efc 50%, #ff4e4e 100%)' }}>
            Tournyx
          </span>
        </div>
        <p className="text-[var(--text-muted)] text-sm font-medium">Sign in to your organization</p>
      </div>

      <form onSubmit={handleSubmit}
        className="relative surface-elevated p-8 space-y-6 rounded-2xl accent-top">
        {error && (
          <div className="bg-[#ff4e4e]/6 border border-[#ff4e4e]/15 text-[#ff4e4e] text-sm px-4 py-3 rounded-xl animate-slide-down font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="label">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required autoFocus className="input-premium" placeholder="admin@org.com" />
        </div>

        <div>
          <label className="label">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required className="input-premium" placeholder="••••••••" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-[var(--text-muted)] text-sm mt-7">
        New organization?{' '}
        <Link href="/register" className="text-[#00ffc3] hover:text-[#6d5efc] transition-colors font-semibold">
          Create account
        </Link>
      </p>
    </div>
  );
}
