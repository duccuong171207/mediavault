import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Album } from './entities/album.entity';
import { AlbumMedia } from './entities/album-media.entity';
import { StorageService } from '../common/storage/storage.service';
import {
  AddMediaDto, CreateAlbumDto, ReorderDto, SetCoverDto, UpdateAlbumDto,
} from './dto/album.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AlbumsService {
  constructor(
    @InjectRepository(Album) private albums: Repository<Album>,
    @InjectRepository(AlbumMedia) private albumMedia: Repository<AlbumMedia>,
    private storage: StorageService,
  ) {}

  private async ownedAlbum(id: string, user: AuthUser) {
    const album = await this.albums.findOne({ where: { id } });
    if (!album) throw new NotFoundException('Album not found');
    const isAdmin = user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');
    if (album.ownerId !== user.id && !isAdmin) throw new ForbiddenException();
    return album;
  }

  create(dto: CreateAlbumDto, user: AuthUser) {
    return this.albums.save(
      this.albums.create({
        ownerId: user.id,
        title: dto.title,
        description: dto.description,
        type: (dto.type as Album['type']) ?? 'mixed',
        visibility: (dto.visibility as Album['visibility']) ?? 'public',
      }),
    );
  }

  async list(ownerUsername?: string) {
    const qb = this.albums
      .createQueryBuilder('a')
      .leftJoin('users', 'u', 'u.id = a.owner_id')
      .where('a.visibility = :v', { v: 'public' })
      .orderBy('a.created_at', 'DESC');
    if (ownerUsername) qb.andWhere('u.username = :un', { un: ownerUsername });
    return qb.getMany();
  }

  async detail(id: string) {
    const album = await this.albums.findOne({ where: { id } });
    if (!album) throw new NotFoundException();
    const items = await this.albumMedia.find({
      where: { albumId: id },
      relations: ['media', 'media.files'],
      order: { position: 'ASC' },
    });
    return {
      ...album,
      coverUrl: album.coverMediaId
        ? this.coverUrlFor(items, album.coverMediaId)
        : this.coverUrlFor(items, items[0]?.mediaId),
      items: items.map((am) => {
        const f = am.media?.files?.find((x) => x.variant === 'medium') ?? am.media?.files?.[0];
        return {
          mediaId: am.mediaId,
          position: am.position,
          type: am.media?.type,
          title: am.media?.title,
          thumbnailUrl: f ? this.storage.publicUrlFor(f.storageKey) : null,
        };
      }),
    };
  }

  async update(id: string, dto: UpdateAlbumDto, user: AuthUser) {
    const album = await this.ownedAlbum(id, user);
    Object.assign(album, dto);
    return this.albums.save(album);
  }

  async remove(id: string, user: AuthUser) {
    const album = await this.ownedAlbum(id, user);
    await this.albums.remove(album);
    return { ok: true };
  }

  async addMedia(id: string, dto: AddMediaDto, user: AuthUser) {
    await this.ownedAlbum(id, user);
    const existing = await this.albumMedia.count({ where: { albumId: id } });
    let pos = existing;
    for (const mediaId of dto.mediaIds) {
      await this.albumMedia.save(
        this.albumMedia.create({ albumId: id, mediaId, position: pos++ }),
      );
    }
    return { ok: true, added: dto.mediaIds.length };
  }

  async reorder(id: string, dto: ReorderDto, user: AuthUser) {
    await this.ownedAlbum(id, user);
    await Promise.all(
      dto.order.map((mediaId, idx) =>
        this.albumMedia.update({ albumId: id, mediaId }, { position: idx }),
      ),
    );
    return { ok: true };
  }

  async setCover(id: string, dto: SetCoverDto, user: AuthUser) {
    const album = await this.ownedAlbum(id, user);
    album.coverMediaId = dto.mediaId;
    return this.albums.save(album);
  }

  private coverUrlFor(items: AlbumMedia[], mediaId?: string) {
    const am = items.find((x) => x.mediaId === mediaId);
    const f = am?.media?.files?.find((x) => x.variant === 'large') ?? am?.media?.files?.[0];
    return f ? this.storage.publicUrlFor(f.storageKey) : null;
  }
}
