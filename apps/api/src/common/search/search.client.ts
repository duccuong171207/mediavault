import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

export const MEDIA_INDEX = 'media';

export interface MediaDoc {
  id: string;
  ownerId: string;
  ownerUsername: string;
  type: 'photo' | 'video';
  title: string;
  description: string;
  tags: string[];
  category?: string;
  visibility: string;
  width?: number;
  height?: number;
  viewCount: number;
  favoriteCount: number;
  publishedAt?: string;
}

/** Elasticsearch client + index lifecycle + query builder for faceted search. */
@Injectable()
export class SearchClient implements OnModuleInit {
  private readonly log = new Logger(SearchClient.name);
  readonly client: Client;

  constructor(config: ConfigService) {
    this.client = new Client({ node: config.getOrThrow('ELASTIC_NODE') });
  }

  async onModuleInit() {
    try {
      await this.ensureIndex();
    } catch (e) {
      this.log.warn(`Elasticsearch not ready: ${(e as Error).message}`);
    }
  }

  async ensureIndex() {
    const exists = await this.client.indices.exists({ index: MEDIA_INDEX });
    if (exists) return;
    await this.client.indices.create({
      index: MEDIA_INDEX,
      mappings: {
        properties: {
          ownerId: { type: 'keyword' },
          ownerUsername: { type: 'keyword' },
          type: { type: 'keyword' },
          title: { type: 'text', analyzer: 'standard' },
          description: { type: 'text' },
          tags: { type: 'keyword' },
          category: { type: 'keyword' },
          visibility: { type: 'keyword' },
          width: { type: 'integer' },
          height: { type: 'integer' },
          viewCount: { type: 'long' },
          favoriteCount: { type: 'long' },
          publishedAt: { type: 'date' },
        },
      },
    });
    this.log.log(`Created index "${MEDIA_INDEX}"`);
  }

  async index(doc: MediaDoc) {
    await this.client.index({ index: MEDIA_INDEX, id: doc.id, document: doc, refresh: false });
  }

  async remove(id: string) {
    await this.client.delete({ index: MEDIA_INDEX, id }).catch(() => undefined);
  }
}
