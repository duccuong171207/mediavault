import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Album } from './album.entity';
import { Media } from '../../media/entities/media.entity';

@Entity('album_media')
export class AlbumMedia {
  @PrimaryColumn({ name: 'album_id', type: 'uuid' })
  albumId!: string;

  @PrimaryColumn({ name: 'media_id', type: 'uuid' })
  mediaId!: string;

  @ManyToOne(() => Album, (a) => a.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'album_id' })
  album!: Album;

  @ManyToOne(() => Media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media!: Media;

  @Column({ type: 'int', default: 0 })
  position!: number;
}
