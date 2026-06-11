import Link from 'next/link';
import { apiServer } from '@/lib/api';
import { MasonryGrid } from '@/components/media/masonry-grid';
import type { Feed } from '@/lib/types';

export const revalidate = 30;

async function getInitial(): Promise<Feed> {
  try {
    return await apiServer<Feed>('/media?sort=trending&limit=24');
  } catch {
    return { items: [], nextCursor: null };
  }
}

const CATEGORIES = ['Nature', 'Portraits', 'Architecture', 'Travel', 'Street', 'Aerial', 'Wildlife', 'Cinematic', 'Black & White'];

export default async function HomePage() {
  const initial = await getInitial();

  return (
    <>
      {/* hero */}
      <section className="relative h-[460px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-[1600px] w-full px-6 lg:px-8 pb-14">
            <p className="text-brand font-semibold tracking-wide mb-2">FEATURED COLLECTION</p>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white max-w-2xl leading-tight">Where moments become masterpieces.</h1>
            <p className="mt-4 text-slate-200 max-w-xl">High-fidelity photo & video hosting, organization and streaming. Curated by the MediaVault community.</p>
            <div className="mt-6 flex gap-3">
              <Link href="/explore" className="px-6 h-12 grid place-items-center rounded-full bg-white text-ink font-semibold">Start exploring</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        {/* categories */}
        <section>
          <h2 className="text-xl font-bold mb-4">Popular Categories</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {CATEGORIES.map((c) => (
              <Link key={c} href={`/search?q=${encodeURIComponent(c)}`} className="shrink-0 px-5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-brand hover:text-white text-sm font-medium transition">{c}</Link>
            ))}
          </div>
        </section>

        {/* trending grid */}
        <section>
          <h2 className="text-xl font-bold mb-6">Trending</h2>
          <MasonryGrid endpoint="/media?sort=trending&limit=24" initialItems={initial.items} initialCursor={initial.nextCursor} />
        </section>
      </div>
    </>
  );
}
