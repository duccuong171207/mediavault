import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AlbumMedia } from './album-media.entity';

export type AlbumType = 'photo' | 'video' | 'mixed';
export type Visibility = 'public' | 'unlisted' | 'private';

@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (u) => u.albums, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', default: 'mixed' })
  type!: AlbumType;

  @Column({ type: 'varchar', default: 'public' })
  visibility!: Visibility;

  @Column({ name: 'cover_media_id', type: 'uuid', nullable: true })
  coverMediaId?: string;

  @OneToMany(() => AlbumMedia, (am) => am.album, { cascade: true })
  items!: AlbumMedia[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
