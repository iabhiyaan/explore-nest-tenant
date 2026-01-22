import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, ROLE_AT_LEAST_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { getRoleLevel } from '../utils/authorization';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoleAtLeast = this.reflector.getAllAndOverride<string>(
      ROLE_AT_LEAST_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles && !requiredRoleAtLeast && !requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (requiredRoles.some((role) => user.roles?.includes(role))) {
        return true;
      }
    }

    if (requiredRoleAtLeast) {
      const userRoleLevel = Math.max(
        ...(user.roles?.map((role: string) => getRoleLevel(role)) || [0]),
      );
      const requiredRoleLevel = getRoleLevel(requiredRoleAtLeast);

      if (userRoleLevel >= requiredRoleLevel) {
        return true;
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (
        requiredPermissions.some((permission) =>
          user.permissions?.includes(permission),
        )
      ) {
        return true;
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
