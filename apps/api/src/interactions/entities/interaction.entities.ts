import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryColumn, PrimaryGeneratedColumn,
} from 'typeorm';
import { Media } from '../../media/entities/media.entity';
import { User } from '../../users/entities/user.entity';

@Entity('views')
export class View {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;
  @Column({ name: 'media_id', type: 'uuid' }) mediaId!: string;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId?: string;
  @Column({ name: 'ip_hash', nullable: true }) ipHash?: string;
  @CreateDateColumn({ name: 'viewed_at' }) viewedAt!: Date;
}

@Entity('downloads')
export class Download {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;
  @Column({ name: 'media_id', type: 'uuid' }) mediaId!: string;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId?: string;
  @Column({ name: 'ip_hash', nullable: true }) ipHash?: string;
  @CreateDateColumn({ name: 'viewed_at' }) viewedAt!: Date;
}

@Entity('favorites')
export class Favorite {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId!: string;
  @PrimaryColumn({ name: 'media_id', type: 'uuid' }) mediaId!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'media_id', type: 'uuid' }) mediaId!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true }) parentId?: string;
  @Column({ type: 'text' }) body!: string;

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
