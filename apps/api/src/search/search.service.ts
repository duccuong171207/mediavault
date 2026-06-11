import { Injectable } from '@nestjs/common';
import { SearchClient, MEDIA_INDEX } from '../common/search/search.client';
import { StorageService } from '../common/storage/storage.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Media } from '../media/entities/media.entity';

export interface SearchQuery {
  q?: string;
  type?: 'photo' | 'video';
  date?: 'day' | 'week' | 'month' | 'year';
  resolution?: 'hd' | 'fhd' | '4k';
  sort?: 'relevance' | 'popular' | 'newest' | 'downloads';
  page?: number;
}

@Injectable()
export class SearchService {
  constructor(
    private search: SearchClient,
    private storage: StorageService,
    @InjectRepository(Media) private media: Repository<Media>,
  ) {}

  async query(params: SearchQuery) {
    const page = Math.max(1, params.page ?? 1);
    const size = 24;
    const filters: any[] = [
      { term: { visibility: 'public' } },
    ];
    if (params.type) filters.push({ term: { type: params.type } });
    if (params.resolution) {
      const min = params.resolution === '4k' ? 2160 : params.resolution === 'fhd' ? 1080 : 720;
      filters.push({ range: { height: { gte: min } } });
    }
    if (params.date) {
      const map = { day: 'now-1d', week: 'now-7d', month: 'now-30d', year: 'now-365d' };
      filters.push({ range: { publishedAt: { gte: map[params.date] } } });
    }

    const must = params.q
      ? [{ multi_match: { query: params.q, fields: ['title^3', 'tags^2', 'description', 'ownerUsername'] } }]
      : [{ match_all: {} }];

    const sort =
      params.sort === 'popular' ? [{ viewCount: 'desc' }]
      : params.sort === 'newest' ? [{ publishedAt: 'desc' }]
      : params.sort === 'downloads' ? [{ favoriteCount: 'desc' }]
      : ['_score'];

    let hits: any[] = [];
    let total = 0;
    try {
      const res = await this.search.client.search({
        index: MEDIA_INDEX,
        from: (page - 1) * size,
        size,
        query: { bool: { must, filter: filters } },
        sort: sort as any,
        aggs: {
          types: { terms: { field: 'type' } },
          categories: { terms: { field: 'category', size: 20 } },
        },
      });
      hits = res.hits.hits;
      total = typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0;

      // hydrate thumbnails from DB (ES holds the searchable doc, not derivative keys)
      const ids = hits.map((h) => h._id);
      const rows = ids.length
        ? await this.media.find({ where: { id: In(ids) }, relations: ['files'] })
        : [];
      const byId = new Map(rows.map((r) => [r.id, r]));
      const items = hits.map((h) => {
        const m = byId.get(h._id);
        const f = m?.files?.find((x) => x.variant === 'medium') ?? m?.files?.[0];
        return {
          id: h._id,
          ...h._source,
          thumbnailUrl: f ? this.storage.publicUrlFor(f.storageKey) : null,
        };
      });
      return { items, total, page, facets: (res as any).aggregations };
    } catch {
      // graceful fallback to Postgres if ES is unavailable
      return this.fallback(params, page, size);
    }
  }

  private async fallback(params: SearchQuery, page: number, size: number) {
    const qb = this.media
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.files', 'f')
      .where('m.visibility = :v', { v: 'public' })
      .andWhere('m.status = :s', { s: 'ready' });
    if (params.q) qb.andWhere('m.title ILIKE :q', { q: `%${params.q}%` });
    if (params.type) qb.andWhere('m.type = :t', { t: params.type });
    qb.orderBy('m.publishedAt', 'DESC').skip((page - 1) * size).take(size);
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((m) => {
        const f = m.files?.find((x) => x.variant === 'medium') ?? m.files?.[0];
        return { id: m.id, title: m.title, type: m.type, thumbnailUrl: f ? this.storage.publicUrlFor(f.storageKey) : null };
      }),
      total, page, facets: null,
    };
  }
}
