import { DataSource } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import { Media } from '../media/entities/media.entity';
import { MediaTag } from '../media/entities/tag.entity';

const MEDIA_INDEX = 'media';
let client: Client | null = null;

function es() {
  if (!client) client = new Client({ node: process.env.ELASTIC_NODE! });
  return client;
}

/** Reads a media row + its tags/owner/category and (re)indexes the searchable doc. */
export async function indexMediaDoc(ds: DataSource, mediaId: string) {
  const media = await ds.getRepository(Media).findOne({
    where: { id: mediaId },
    relations: ['owner', 'category'],
  });
  if (!media || media.visibility === 'private') return;

  const tags = await ds.getRepository(MediaTag).find({ where: { mediaId } });

  try {
    await es().index({
      index: MEDIA_INDEX,
      id: mediaId,
      document: {
        ownerId: media.ownerId,
        ownerUsername: media.owner?.username,
        type: media.type,
        title: media.title ?? '',
        description: media.description ?? '',
        tags: tags.map((t) => t.tag?.name).filter(Boolean),
        category: media.category?.name,
        visibility: media.visibility,
        width: media.width,
        height: media.height,
        viewCount: Number(media.viewCount),
        favoriteCount: Number(media.favoriteCount),
        publishedAt: media.publishedAt,
      },
      refresh: false,
    });
  } catch (e) {
    // index failure shouldn't fail the whole job; log and continue
    console.warn(`[indexer] failed to index ${mediaId}: ${(e as Error).message}`);
  }
}
