import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';

/** Fine-grained permission keys, e.g. media.delete.any, user.create, settings.manage */
export const PERM = {
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',
  ADMIN_CREATE: 'admin.create',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE_OWN: 'media.delete.own',
  MEDIA_DELETE_ANY: 'media.delete.any',
  CATEGORY_MANAGE: 'category.manage',
  ALBUM_MANAGE: 'album.manage',
  SETTINGS_MANAGE: 'settings.manage',
  ANALYTICS_VIEW: 'analytics.view',
} as const;
export type PermissionKey = (typeof PERM)[keyof typeof PERM];

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  key!: PermissionKey;

  @ManyToMany(() => Role, (r) => r.permissions)
  roles!: Role[];
}
