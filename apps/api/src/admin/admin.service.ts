import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Media } from '../media/entities/media.entity';
import { Album } from '../albums/entities/album.entity';
import { View } from '../interactions/entities/interaction.entities';
import { ActivityLog } from '../system/entities/system.entities';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Media) private media: Repository<Media>,
    @InjectRepository(Album) private albums: Repository<Album>,
    @InjectRepository(View) private views: Repository<View>,
    @InjectRepository(ActivityLog) private logs: Repository<ActivityLog>,
  ) {}

  async stats() {
    const [totalUsers, totalPhotos, totalVideos, totalAlbums] = await Promise.all([
      this.users.count(),
      this.media.count({ where: { type: 'photo' } }),
      this.media.count({ where: { type: 'video' } }),
      this.albums.count(),
    ]);

    const storageRow = await this.media
      .createQueryBuilder('m')
      .leftJoin('media_files', 'f', 'f.media_id = m.id')
      .leftJoin('media_versions', 'v', 'v.media_id = m.id')
      .select('COALESCE(SUM(f.bytes),0) + COALESCE(SUM(v.bytes),0)', 'total')
      .getRawOne<{ total: string }>();

    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const [dailyUploads, dailyViews] = await Promise.all([
      this.media.createQueryBuilder('m').where('m.created_at >= :since', { since }).getCount(),
      this.views.createQueryBuilder('v').where('v.viewed_at >= :since', { since }).getCount(),
    ]);

    return {
      totalUsers,
      totalPhotos,
      totalVideos,
      totalAlbums,
      storageBytes: Number(storageRow?.total ?? 0),
      dailyUploads,
      dailyViews,
    };
  }

  /** Time-bucketed uploads + views for the analytics chart. */
  async analytics(range: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily') {
    const trunc = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[range];
    const interval = { daily: '30 days', weekly: '12 weeks', monthly: '12 months', yearly: '5 years' }[range];

    const uploads = await this.media.query(
      `SELECT date_trunc($1, created_at) AS bucket, COUNT(*)::int AS count
       FROM media WHERE created_at >= now() - $2::interval
       GROUP BY bucket ORDER BY bucket`,
      [trunc, interval],
    );
    const views = await this.views.query(
      `SELECT date_trunc($1, viewed_at) AS bucket, COUNT(*)::int AS count
       FROM views WHERE viewed_at >= now() - $2::interval
       GROUP BY bucket ORDER BY bucket`,
      [trunc, interval],
    );
    return { range, uploads, views };
  }

  activity(limit = 50) {
    return this.logs.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
