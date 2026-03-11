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
  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password, orgName: form.orgName }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Registration failed'); setLoading(false); return; }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    if (signInError) { setError('Account created — but login failed: ' + signInError.message); setLoading(false); return; }

    router.push('/');
    router.refresh();
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
        <p className="text-[var(--text-muted)] text-sm font-medium">Create your organization account</p>
      </div>

      <form onSubmit={handleSubmit}
        className="relative surface-elevated p-8 space-y-5 rounded-2xl accent-top">
        {error && (
          <div className="bg-[#ff4e4e]/6 border border-[#ff4e4e]/15 text-[#ff4e4e] text-sm px-4 py-3 rounded-xl animate-slide-down font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="label">Organization Name</label>
          <input type="text" value={form.orgName} onChange={(e) => set('orgName', e.target.value)}
            required autoFocus className="input-premium" placeholder="e.g. Pro Esports League" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
            required className="input-premium" placeholder="admin@org.com" />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
            required minLength={6} className="input-premium" placeholder="Min. 6 characters" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-[var(--text-muted)] text-sm mt-7">
        Already have an account?{' '}
        <Link href="/login" className="text-[#00ffc3] hover:text-[#6d5efc] transition-colors font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
