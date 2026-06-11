'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, Upload, Bell } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '@/lib/auth';

export function Navbar() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-ink/80 border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-fuchsia-500 text-white">▣</span>
          Media<span className="text-brand">Vault</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium ml-2">
          <Link className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" href="/explore">Explore</Link>
          <Link className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" href="/explore?type=photo">Photos</Link>
          <Link className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" href="/explore?type=video">Videos</Link>
        </nav>

        <form onSubmit={submitSearch} className="flex-1 max-w-xl mx-auto hidden sm:block">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search photos, videos, albums, people…"
              className="w-full h-10 rounded-full bg-slate-100 dark:bg-slate-800 pl-11 pr-4 text-sm outline-none focus:ring-2 ring-brand"
            />
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          <ThemeToggle />
          {user ? (
            <>
              {hasRole('ADMIN', 'SUPER_ADMIN') && (
                <Link href="/admin" className="hidden sm:block text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Admin</Link>
              )}
              <button className="hidden sm:grid w-10 h-10 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Bell size={18} /></button>
              <Link href="/studio" className="px-4 h-10 grid place-items-center rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold">
                <span className="flex items-center gap-1"><Upload size={16} /> Upload</span>
              </Link>
              <Link href={`/u/${user.username}`}>
                <img src={user.avatarUrl ?? `https://i.pravatar.cc/64?u=${user.username}`} className="w-9 h-9 rounded-full ring-2 ring-brand/40" alt="" />
              </Link>
            </>
          ) : (
            <Link href="/login" className="px-4 h-10 grid place-items-center rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
