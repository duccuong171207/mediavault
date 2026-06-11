import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../../users/entities/role.entity';
import { PermissionKey } from '../../users/entities/permission.entity';

export const ROLES_KEY = 'roles';
export const PERMS_KEY = 'permissions';
export const PUBLIC_KEY = 'isPublic';

/** Restrict a route to one of the given roles. */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

/** Require all listed fine-grained permissions. */
export const Permissions = (...perms: PermissionKey[]) => SetMetadata(PERMS_KEY, perms);

/** Mark a route as accessible without authentication. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
