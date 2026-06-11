'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { MediaCard } from '@/components/media/media-card';
import type { MediaCard as MediaCardType } from '@/lib/types';

interface SearchResult {
  items: (MediaCardType & { type: 'photo' | 'video' })[];
  total: number;
  page: number;
}

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const [type, setType] = useState(params.get('type') ?? '');
  const [date, setDate] = useState('');
  const [resolution, setResolution] = useState('');
  const [sort, setSort] = useState('relevance');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (type) qs.set('type', type);
    if (date) qs.set('date', date);
    if (resolution) qs.set('resolution', resolution);
    if (sort) qs.set('sort', sort);
    try {
      const data = await api<SearchResult>(`/search?${qs}`, { auth: false });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [q, type, date, resolution, sort]);

  useEffect(() => { run(); }, [run]);

  const TYPES = [['', 'All'], ['photo', 'Photos'], ['video', 'Videos']] as const;
  const DATES = [['', 'Any time'], ['day', 'Past 24 hours'], ['week', 'Past week'], ['month', 'Past month'], ['year', 'Past year']] as const;
  const RES = [['', 'Any'], ['hd', 'HD 720p+'], ['fhd', 'Full HD 1080p+'], ['4k', '4K 2160p+']] as const;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 grid lg:grid-cols-[260px_1fr] gap-8">
      <aside className="space-y-6">
        <FilterGroup title="Type">
          {TYPES.map(([v, label]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="type" checked={type === v} onChange={() => setType(v)} className="accent-brand" /> {label}
            </label>
          ))}
        </FilterGroup>
        <FilterGroup title="Upload date">
          {DATES.map(([v, label]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="date" checked={date === v} onChange={() => setDate(v)} className="accent-brand" /> {label}
            </label>
          ))}
        </FilterGroup>
        <FilterGroup title="Resolution">
          {RES.map(([v, label]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="res" checked={resolution === v} onChange={() => setResolution(v)} className="accent-brand" /> {label}
            </label>
          ))}
        </FilterGroup>
        <FilterGroup title="Sort by">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full h-10 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 text-sm outline-none">
            <option value="relevance">Relevance</option>
            <option value="popular">Most popular</option>
            <option value="newest">Newest</option>
            <option value="downloads">Most favorited</option>
          </select>
        </FilterGroup>
      </aside>

      <div>
        <p className="text-slate-400 text-sm mb-5">
          {loading ? 'Searching…' : <><b className="text-slate-900 dark:text-slate-100">{result?.total ?? 0}</b> results{q && <> for &quot;{q}&quot;</>}</>}
        </p>
        <div className="masonry">
          {result?.items.map((m) => <MediaCard key={m.id} media={m} />)}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="p-16 text-center text-slate-400">Loading…</div>}><SearchInner /></Suspense>;
}
