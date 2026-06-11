'use client';

import Link from 'next/link';
import { Play, Heart } from 'lucide-react';
import { formatCount, formatDuration } from '@/lib/utils';
import type { MediaCard as MediaCardType } from '@/lib/types';

export function MediaCard({ media }: { media: MediaCardType }) {
  const href = media.type === 'video' ? `/v/${media.id}` : `/m/${media.id}`;
  return (
    <Link
      href={href}
      className="block relative rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 group cursor-pointer transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      {media.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          loading="lazy"
          src={media.thumbnailUrl}
          alt={media.title ?? ''}
          className="w-full object-cover"
          style={media.width && media.height ? { aspectRatio: `${media.width}/${media.height}` } : undefined}
        />
      ) : (
        <div className="w-full aspect-[4/3] grid place-items-center text-slate-400">processing…</div>
      )}

      {media.type === 'video' && (
        <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-semibold flex items-center gap-1">
          <Play size={12} /> {formatDuration(media.durationSec)}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
        <div className="text-white font-semibold truncate">{media.title ?? 'Untitled'}</div>
        <div className="flex items-center gap-3 mt-1 text-slate-300 text-xs">
          <span className="flex items-center gap-1"><Heart size={12} /> {formatCount(media.favoriteCount)}</span>
          <span>{formatCount(media.viewCount)} views</span>
        </div>
      </div>
    </Link>
  );
}
