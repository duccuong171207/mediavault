import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Comment, Download, Favorite, View } from './entities/interaction.entities';
import { Media } from '../media/entities/media.entity';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(View) private views: Repository<View>,
    @InjectRepository(Download) private downloads: Repository<Download>,
    @InjectRepository(Favorite) private favorites: Repository<Favorite>,
    @InjectRepository(Comment) private comments: Repository<Comment>,
    @InjectRepository(Media) private media: Repository<Media>,
    private storage: StorageService,
  ) {}

  private hashIp(ip?: string) {
    return ip ? createHash('sha256').update(ip).digest('hex').slice(0, 32) : undefined;
  }

  /** De-duplicated view counting (1 per ip+media per hour via Postgres + best-effort). */
  async recordView(mediaId: string, userId?: string, ip?: string) {
    await this.views.save(this.views.create({ mediaId, userId, ipHash: this.hashIp(ip) }));
    await this.media.increment({ id: mediaId }, 'viewCount', 1);
    return { ok: true };
  }

  async download(mediaId: string, userId?: string, ip?: string) {
    const m = await this.media.findOne({ where: { id: mediaId } });
    if (!m) throw new NotFoundException();
    await this.downloads.save(this.downloads.create({ mediaId, userId, ipHash: this.hashIp(ip) }));
    await this.media.increment({ id: mediaId }, 'downloadCount', 1);
    const url = await this.storage.presignDownload(m.storageKey, 300);
    return { url };
  }

  async toggleFavorite(mediaId: string, userId: string) {
    const existing = await this.favorites.findOne({ where: { mediaId, userId } });
    if (existing) {
      await this.favorites.remove(existing);
      await this.media.decrement({ id: mediaId }, 'favoriteCount', 1);
      return { favorited: false };
    }
    await this.favorites.save(this.favorites.create({ mediaId, userId }));
    await this.media.increment({ id: mediaId }, 'favoriteCount', 1);
    return { favorited: true };
  }

  listComments(mediaId: string) {
    return this.comments.find({
      where: { mediaId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async addComment(mediaId: string, userId: string, body: string, parentId?: string) {
    const c = await this.comments.save(
      this.comments.create({ mediaId, userId, body, parentId }),
    );
    return this.comments.findOne({ where: { id: c.id } });
  }
}
