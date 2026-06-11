import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Media } from './media.entity';

export type FileVariant = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

/** Responsive image derivatives produced by Sharp. */
@Entity('media_files')
export class MediaFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Media, (m) => m.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media!: Media;

  @Column({ name: 'media_id' })
  @Index()
  mediaId!: string;

  @Column({ type: 'varchar' })
  variant!: FileVariant;

  @Column({ name: 'storage_key' })
  storageKey!: string;

  @Column({ type: 'int', nullable: true })
  width?: number;

  @Column({ type: 'int', nullable: true })
  height?: number;

  @Column({ type: 'bigint', nullable: true })
  bytes?: number;

  @Column({ nullable: true })
  mime?: string;
}
