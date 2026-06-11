import { MasonryGrid } from '@/components/media/masonry-grid';

export const dynamic = 'force-dynamic';

export default function ExplorePage({ searchParams }: { searchParams: { type?: string } }) {
  const type = searchParams.type;
  const endpoint = `/media?sort=latest&limit=24${type ? `&type=${type}` : ''}`;
  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {type === 'photo' ? 'Photos' : type === 'video' ? 'Videos' : 'Explore'}
      </h1>
      <MasonryGrid endpoint={endpoint} />
    </div>
  );
}
