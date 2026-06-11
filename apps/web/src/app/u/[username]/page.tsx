import { notFound } from 'next/navigation';
import { apiServer } from '@/lib/api';
import { MasonryGrid } from '@/components/media/masonry-grid';

export const revalidate = 30;

interface Profile {
  id: string; username: string; displayName?: string; bio?: string;
  avatarUrl?: string; bannerUrl?: string; socialLinks?: Record<string, string>;
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  let user: Profile;
  try {
    user = await apiServer<Profile>(`/u/${params.username}`);
  } catch {
    notFound();
  }

  return (
    <>
      <div className="relative h-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.bannerUrl ?? 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1920&q=80'} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <div className="mx-auto max-w-[1600px] px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 -mt-16 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatarUrl ?? `https://i.pravatar.cc/200?u=${user.username}`} className="w-32 h-32 rounded-2xl ring-4 ring-white dark:ring-ink object-cover" alt="" />
          <div className="pb-2">
            <h1 className="text-3xl font-extrabold">{user.displayName ?? user.username}</h1>
            <p className="text-slate-400">@{user.username}</p>
          </div>
        </div>
        {user.bio && <p className="mt-5 max-w-2xl text-slate-600 dark:text-slate-300">{user.bio}</p>}

        <h2 className="text-xl font-bold mt-10 mb-6">Media</h2>
        <div className="pb-16">
          <MasonryGrid endpoint={`/media?owner=${user.username}&sort=latest&limit=24`} />
        </div>
      </div>
    </>
  );
}
