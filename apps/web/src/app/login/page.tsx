'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] grid place-items-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-center mb-2">Welcome back</h1>
        <p className="text-center text-slate-400 mb-8 text-sm">
          Accounts are created by administrators. Public sign-up is disabled.
        </p>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          {error && <div className="rounded-lg bg-red-500/10 text-red-500 text-sm px-4 py-2">{error}</div>}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 outline-none focus:ring-2 ring-brand" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 outline-none focus:ring-2 ring-brand" />
          </div>
          <button disabled={loading} className="w-full h-11 rounded-full bg-brand hover:bg-brand-hover text-white font-semibold disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
