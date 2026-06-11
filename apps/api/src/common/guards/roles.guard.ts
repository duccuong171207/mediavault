import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMS_KEY } from '../decorators/auth.decorators';

/** Enforces @Roles and @Permissions metadata against the authenticated user. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const requiredPerms = this.reflector.getAllAndOverride<string[]>(PERMS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles?.length && !requiredPerms?.length) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Authentication required');

    if (requiredRoles?.length) {
      const ok = requiredRoles.some((r) => user.roles?.includes(r));
      if (!ok) throw new ForbiddenException('Insufficient role');
    }
    if (requiredPerms?.length) {
      const ok = requiredPerms.every((p) => user.permissions?.includes(p));
      if (!ok) throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
