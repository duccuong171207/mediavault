import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Media } from './entities/media.entity';
import { MediaFile } from './entities/media-file.entity';
import { Tag, MediaTag } from './entities/tag.entity';
import { StorageService } from '../common/storage/storage.service';
import { ProcessingQueue } from '../processing/processing.queue';
import {
  PHOTO_MIME, VIDEO_MIME, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES,
} from '../processing/processing.constants';
import {
  CompleteUploadDto, MediaQueryDto, PresignUploadDto, UpdateMediaDto,
} from './dto/media.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media) private media: Repository<Media>,
    @InjectRepository(MediaFile) private files: Repository<MediaFile>,
    @InjectRepository(Tag) private tags: Repository<Tag>,
    @InjectRepository(MediaTag) private mediaTags: Repository<MediaTag>,
    private storage: StorageService,
    private queue: ProcessingQueue,
  ) {}

  /** Phase 1 of upload: validate, create a placeholder row, return a presigned PUT URL. */
  async presign(dto: PresignUploadDto, user: AuthUser) {
    const isPhoto = PHOTO_MIME.includes(dto.mime);
    const isVideo = VIDEO_MIME.includes(dto.mime);
    if (!isPhoto && !isVideo) throw new BadRequestException(`Unsupported type: ${dto.mime}`);
    if (isPhoto && dto.size > MAX_PHOTO_BYTES) throw new BadRequestException('Photo exceeds 100MB');
    if (isVideo && dto.size > MAX_VIDEO_BYTES) throw new BadRequestException('Video exceeds 5GB');

    const id = randomUUID();
    const ext = extname(dto.filename) || (isPhoto ? '.jpg' : '.mp4');
    const storageKey = `originals/${user.id}/${id}${ext}`;

    const media = this.media.create({
      id,
      ownerId: user.id,
      type: isPhoto ? 'photo' : 'video',
      status: 'uploading',
      storageKey,
      visibility: 'private',
    });
    await this.media.save(media);

    const uploadUrl = await this.storage.presignUpload(storageKey, dto.mime);
    return { mediaId: id, storageKey, uploadUrl };
  }

  /** Phase 2: client confirms bytes are uploaded → persist metadata + enqueue processing. */
  async complete(id: string, dto: CompleteUploadDto, user: AuthUser) {
    const media = await this.media.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');
    if (media.ownerId !== user.id) throw new ForbiddenException();

    media.title = dto.title ?? media.title;
    media.description = dto.description;
    media.categoryId = dto.categoryId;
    media.visibility = (dto.visibility as Media['visibility']) ?? 'public';
    media.status = 'processing';
    await this.media.save(media);

    if (dto.tags?.length) await this.attachTags(media.id, dto.tags);

    const jobData = { mediaId: media.id, storageKey: media.storageKey, mime: '' };
    if (media.type === 'photo') await this.queue.enqueueImage(jobData);
    else await this.queue.enqueueVideo(jobData);

    return { id: media.id, status: media.status };
  }

  async status(id: string) {
    const media = await this.media.findOne({ where: { id } });
    if (!media) throw new NotFoundException();
    return { id, status: media.status };
  }

  /** Public cursor-paginated feed. */
  async feed(q: MediaQueryDto) {
    const limit = Math.min(q.limit ?? 24, 60);
    const qb = this.media
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.files', 'f')
      .leftJoinAndSelect('m.owner', 'o')
      .where('m.visibility = :v', { v: 'public' })
      .andWhere('m.status = :s', { s: 'ready' })
      .take(limit + 1);

    if (q.type) qb.andWhere('m.type = :t', { t: q.type });
    if (q.categoryId) qb.andWhere('m.categoryId = :c', { c: q.categoryId });
    if (q.owner) qb.andWhere('o.username = :owner', { owner: q.owner });

    if (q.sort === 'popular') qb.orderBy('m.viewCount', 'DESC');
    else if (q.sort === 'trending') qb.orderBy('m.favoriteCount', 'DESC');
    else qb.orderBy('m.publishedAt', 'DESC');

    if (q.cursor) qb.andWhere('m.publishedAt < :cursor', { cursor: q.cursor });

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((m) => this.toCard(m));
    const nextCursor = hasMore ? rows[limit - 1].publishedAt?.toISOString() : null;
    return { items, nextCursor };
  }

  async detail(id: string) {
    const media = await this.media.findOne({
      where: { id },
      relations: ['files', 'versions', 'metadata', 'owner', 'category'],
    });
    if (!media) throw new NotFoundException();
    const tags = await this.mediaTags.find({ where: { mediaId: id } });
    return {
      ...this.toCard(media),
      description: media.description,
      versions: media.versions?.map((v) => ({
        rendition: v.rendition,
        url: this.storage.publicUrlFor(v.storageKey),
        bitrateKbps: v.bitrateKbps,
      })),
      metadata: media.metadata,
      owner: media.owner
        ? { username: media.owner.username, displayName: media.owner.displayName, avatarUrl: media.owner.avatarUrl }
        : null,
      category: media.category?.name,
      tags: tags.map((t) => t.tag.name),
    };
  }

  async similar(id: string) {
    const media = await this.media.findOne({ where: { id } });
    if (!media) throw new NotFoundException();
    const rows = await this.media.find({
      where: { categoryId: media.categoryId, visibility: 'public', status: 'ready' },
      relations: ['files'],
      take: 12,
    });
    return rows.filter((m) => m.id !== id).map((m) => this.toCard(m));
  }

  async update(id: string, dto: UpdateMediaDto, user: AuthUser) {
    const media = await this.media.findOne({ where: { id } });
    if (!media) throw new NotFoundException();
    const isAdmin = user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');
    if (media.ownerId !== user.id && !isAdmin) throw new ForbiddenException();
    Object.assign(media, {
      title: dto.title ?? media.title,
      description: dto.description ?? media.description,
      categoryId: dto.categoryId ?? media.categoryId,
      visibility: (dto.visibility as Media['visibility']) ?? media.visibility,
    });
    if (dto.tags) await this.attachTags(id, dto.tags);
    return this.media.save(media);
  }

  async remove(id: string, user: AuthUser) {
    const media = await this.media.findOne({ where: { id }, relations: ['files', 'versions'] });
    if (!media) throw new NotFoundException();
    const isAdmin = user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');
    if (media.ownerId !== user.id && !isAdmin) throw new ForbiddenException();

    // best-effort storage cleanup
    const keys = [media.storageKey, ...(media.files ?? []).map((f) => f.storageKey),
      ...(media.versions ?? []).map((v) => v.storageKey)];
    await Promise.all(keys.map((k) => this.storage.deleteObject(k).catch(() => undefined)));
    await this.media.remove(media);
    return { ok: true };
  }

  // ---------- helpers ----------
  private async attachTags(mediaId: string, names: string[]) {
    await this.mediaTags.delete({ mediaId });
    const clean = Array.from(new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)));
    for (const name of clean) {
      let tag = await this.tags.findOne({ where: { name } });
      if (!tag) tag = await this.tags.save(this.tags.create({ name, usageCount: 0 }));
      await this.mediaTags.save(this.mediaTags.create({ mediaId, tagId: tag.id }));
    }
  }

  private toCard(m: Media) {
    const variant = (v: string) => m.files?.find((f) => f.variant === v);
    const thumb = variant('medium') ?? variant('small') ?? variant('large');
    return {
      id: m.id,
      type: m.type,
      title: m.title,
      width: m.width,
      height: m.height,
      blurhash: m.blurhash,
      durationSec: m.durationSec,
      viewCount: Number(m.viewCount),
      favoriteCount: Number(m.favoriteCount),
      thumbnailUrl: thumb ? this.storage.publicUrlFor(thumb.storageKey) : null,
      publishedAt: m.publishedAt,
    };
  }
}
