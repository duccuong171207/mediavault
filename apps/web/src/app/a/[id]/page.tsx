import { notFound } from 'next/navigation';
import { apiServer } from '@/lib/api';
import { MediaCard } from '@/components/media/media-card';
import { formatCount } from '@/lib/utils';

export const revalidate = 30;

interface AlbumDetail {
  id: string; title: string; description?: string; type: string;
  coverUrl: string | null;
  items: { mediaId: string; type: 'photo' | 'video'; title?: string; thumbnailUrl: string | null; position: number }[];
}

export default async function AlbumPage({ params }: { params: { id: string } }) {
  let album: AlbumDetail;
  try {
    album = await apiServer<AlbumDetail>(`/albums/${params.id}`);
  } catch {
    notFound();
  }

  return (
    <>
      <div className="relative h-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={album.coverUrl ?? 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=80'} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mx-auto max-w-[1600px] w-full px-6 pb-8">
          <span className="px-3 py-1 rounded-full bg-brand text-white text-xs font-semibold uppercase">{album.type} album</span>
          <h1 className="text-4xl font-extrabold text-white mt-3">{album.title}</h1>
          {album.description && <p className="text-slate-200 mt-2 max-w-xl">{album.description}</p>}
          <p className="text-slate-300 text-sm mt-2">{album.items.length} items</p>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {album.items.map((it) => (
            <MediaCard key={it.mediaId} media={{
              id: it.mediaId, type: it.type, title: it.title,
              thumbnailUrl: it.thumbnailUrl, viewCount: 0, favoriteCount: 0,
            }} />
          ))}
        </div>
      </div>
    </>
  );
}
