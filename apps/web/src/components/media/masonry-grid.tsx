'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { MediaCard } from './media-card';
import type { Feed, MediaCard as MediaCardType } from '@/lib/types';

interface Props {
  endpoint: string;          // e.g. /media?sort=trending
  initialItems?: MediaCardType[];
  initialCursor?: string | null;
}

/** Masonry grid with cursor-based infinite scroll + lazy loading. */
export function MasonryGrid({ endpoint, initialItems = [], initialCursor = null }: Props) {
  const [items, setItems] = useState<MediaCardType[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const sep = endpoint.includes('?') ? '&' : '?';
      const url = `${endpoint}${cursor ? `${sep}cursor=${encodeURIComponent(cursor)}` : ''}`;
      const data = await api<Feed>(url, { auth: false });
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      if (!data.nextCursor || data.items.length === 0) setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [endpoint, cursor, loading, done]);

  // initial load if no SSR data
  useEffect(() => {
    if (initialItems.length === 0) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="masonry">
        {items.map((m) => <MediaCard key={m.id} media={m} />)}
      </div>
      {!done && <div ref={sentinel} className="h-20 grid place-items-center text-slate-400 text-sm">{loading ? 'Loading…' : ''}</div>}
      {done && items.length === 0 && <p className="text-center text-slate-400 py-16">No media yet.</p>}
    </>
  );
}
