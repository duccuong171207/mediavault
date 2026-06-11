import { notFound } from 'next/navigation';
import { apiServer } from '@/lib/api';
import { VideoPlayer } from '@/components/media/video-player';
import { MediaCard } from '@/components/media/media-card';
import { formatCount } from '@/lib/utils';
import type { MediaDetail, MediaCard as MediaCardType } from '@/lib/types';

export const revalidate = 30;

export default async function VideoPage({ params }: { params: { id: string } }) {
  let media: MediaDetail;
  let similar: MediaCardType[] = [];
  try {
    media = await apiServer<MediaDetail>(`/media/${params.id}`);
    similar = await apiServer<MediaCardType[]>(`/media/${params.id}/similar`).catch(() => []);
  } catch {
    notFound();
  }

  const master = media.versions?.find((v) => v.rendition === 'hls_master');
  const src = master?.url ?? media.versions?.[0]?.url ?? '';

  const tech = [
    ['Resolution', media.width && media.height ? `${media.width}×${media.height}` : '—'],
    ['Renditions', String(media.versions?.filter((v) => v.rendition !== 'hls_master').length ?? 0)],
    ['Frame rate', media.metadata?.frameRate ? `${media.metadata.frameRate} fps` : '—'],
    ['Audio', media.metadata?.audioCodec ?? '—'],
    ['Streaming', 'HLS / ABR'],
  ] as const;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 grid lg:grid-cols-[1fr_360px] gap-8">
      <div>
        <VideoPlayer src={src} poster={media.thumbnailUrl ?? undefined} />
        <h1 className="text-2xl font-bold mt-5">{media.title ?? 'Untitled'}</h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
          <span>{formatCount(media.viewCount)} views</span>
          <span>· {formatCount(media.favoriteCount)} favorites</span>
        </div>
        {media.description && <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl">{media.description}</p>}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mt-5">
          <h3 className="font-bold mb-3">Technical Information</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {tech.map(([k, v]) => (
              <div key={k}><dt className="text-slate-400">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
      </div>

      <aside>
        <h3 className="font-bold mb-3">Up Next</h3>
        <div className="space-y-3">
          {similar.slice(0, 6).map((m) => <MediaCard key={m.id} media={m} />)}
        </div>
      </aside>
    </div>
  );
}
