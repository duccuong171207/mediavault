import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Media } from '../../media/entities/media.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ name: 'usage_count', type: 'bigint', default: 0 })
  usageCount!: number;
}

@Entity('media_tags')
export class MediaTag {
  @PrimaryColumn({ name: 'media_id', type: 'uuid' })
  mediaId!: string;

  @PrimaryColumn({ name: 'tag_id' })
  tagId!: number;

  @ManyToOne(() => Media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media!: Media;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'tag_id' })
  tag!: Tag;
}
