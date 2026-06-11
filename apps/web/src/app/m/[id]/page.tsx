import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiServer } from '@/lib/api';
import { MediaCard } from '@/components/media/media-card';
import { formatCount } from '@/lib/utils';
import type { MediaDetail, MediaCard as MediaCardType } from '@/lib/types';

export const revalidate = 30;

export default async function MediaDetailPage({ params }: { params: { id: string } }) {
  let media: MediaDetail;
  let similar: MediaCardType[] = [];
  try {
    media = await apiServer<MediaDetail>(`/media/${params.id}`);
    similar = await apiServer<MediaCardType[]>(`/media/${params.id}/similar`).catch(() => []);
  } catch {
    notFound();
  }

  const exif = media.metadata;
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 grid lg:grid-cols-[1fr_360px] gap-8">
      <div>
        <div className="rounded-2xl overflow-hidden bg-black grid place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.thumbnailUrl ?? ''} alt={media.title ?? ''} className="w-full max-h-[72vh] object-contain" />
        </div>

        <h1 className="text-2xl font-bold mt-6">{media.title ?? 'Untitled'}</h1>
        {media.description && <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">{media.description}</p>}

        {media.tags && media.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {media.tags.map((t) => (
              <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs">#{t}</Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-6 text-sm text-slate-400">
          <span>{formatCount(media.viewCount)} views</span>
          <span>{formatCount(media.favoriteCount)} favorites</span>
        </div>
      </div>

      <aside className="space-y-6">
        {media.owner && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.owner.avatarUrl ?? `https://i.pravatar.cc/80?u=${media.owner.username}`} className="w-12 h-12 rounded-full" alt="" />
            <div>
              <div className="font-semibold">{media.owner.displayName ?? media.owner.username}</div>
              <Link href={`/u/${media.owner.username}`} className="text-xs text-brand">@{media.owner.username}</Link>
            </div>
          </div>
        )}

        {exif && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-bold mb-4">Capture Details</h3>
            <dl className="text-sm space-y-2">
              {([['Camera', exif.camera], ['Lens', exif.lens], ['ISO', exif.iso], ['Aperture', exif.aperture], ['Shutter', exif.shutter], ['Focal length', exif.focalLength]] as const)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt className="text-slate-400">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
                ))}
            </dl>
          </div>
        )}

        {similar.length > 0 && (
          <div>
            <h3 className="font-bold mb-3">Similar Media</h3>
            <div className="grid grid-cols-3 gap-2">
              {similar.slice(0, 9).map((m) => <MediaCard key={m.id} media={m} />)}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
