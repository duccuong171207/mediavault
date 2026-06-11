import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Media } from './media.entity';

/** Video renditions + HLS playlists produced by FFmpeg. */
export type Rendition =
  | '360p' | '480p' | '720p' | '1080p' | '1440p' | '2160p' | 'hls_master';

@Entity('media_versions')
export class MediaVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Media, (m) => m.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media!: Media;

  @Column({ name: 'media_id' })
  @Index()
  mediaId!: string;

  @Column({ type: 'varchar' })
  rendition!: Rendition;

  @Column({ name: 'storage_key' })
  storageKey!: string;

  @Column({ name: 'bitrate_kbps', type: 'int', nullable: true })
  bitrateKbps?: number;

  @Column({ nullable: true })
  codec?: string;

  @Column({ type: 'bigint', nullable: true })
  bytes?: number;
}
