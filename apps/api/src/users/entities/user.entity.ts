import {
  Column, CreateDateColumn, Entity, JoinTable, ManyToMany,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Media } from '../../media/entities/media.entity';
import { Album } from '../../albums/entities/album.entity';

export type UserStatus = 'active' | 'suspended' | 'pending';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash!: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'banner_url', nullable: true })
  bannerUrl?: string;

  @Column({ name: 'social_links', type: 'jsonb', default: {} })
  socialLinks!: Record<string, string>;

  @Column({ type: 'varchar', default: 'active' })
  status!: UserStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToMany(() => Role, (r) => r.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: Role[];

  @OneToMany(() => Media, (m) => m.owner)
  media!: Media[];

  @OneToMany(() => Album, (a) => a.owner)
  albums!: Album[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
