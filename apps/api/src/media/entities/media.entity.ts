import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  OneToMany, OneToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { MediaFile } from './media-file.entity';
import { MediaVersion } from './media-version.entity';
import { MediaMetadata } from './media-metadata.entity';

export type MediaType = 'photo' | 'video';
export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'failed';
export type Visibility = 'public' | 'unlisted' | 'private';

@Entity('media')
@Index(['visibility', 'status', 'publishedAt'])
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (u) => u.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ name: 'owner_id' })
  @Index()
  ownerId!: string;

  @Column({ type: 'varchar' })
  type!: MediaType;

  @Column({ type: 'varchar', default: 'uploading' })
  status!: MediaStatus;

  @Column({ type: 'varchar', default: 'public' })
  visibility!: Visibility;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: number;

  @Column({ type: 'int', nullable: true })
  width?: number;

  @Column({ type: 'int', nullable: true })
  height?: number;

  @Column({ name: 'duration_sec', type: 'numeric', nullable: true })
  durationSec?: number;

  @Column({ name: 'storage_key' })
  storageKey!: string;

  @Column({ nullable: true })
  blurhash?: string;

  @Column({ name: 'view_count', type: 'bigint', default: 0 })
  viewCount!: number;

  @Column({ name: 'favorite_count', type: 'bigint', default: 0 })
  favoriteCount!: number;

  @Column({ name: 'download_count', type: 'bigint', default: 0 })
  downloadCount!: number;

  @OneToMany(() => MediaFile, (f) => f.media, { cascade: true })
  files!: MediaFile[];

  @OneToMany(() => MediaVersion, (v) => v.media, { cascade: true })
  versions!: MediaVersion[];

  @OneToOne(() => MediaMetadata, (m) => m.media, { cascade: true })
  metadata?: MediaMetadata;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;
}
