import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities';
import {
  isSuperAdmin,
  hasHigherOrEqualPrivilege,
  canManageCompanyAdmins,
  canAccessTenant,
} from '../common/utils/authorization';
import { ADMIN_MANAGEMENT_PERMISSION } from '../common/constants/roles';

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
}

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canManageUser(
    requester: any,
    targetUserId: string,
  ): Promise<AuthorizationResult> {
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!targetUser) {
      return { allowed: false, reason: 'Target user not found' };
    }

    const targetUserRoles =
      targetUser.userRoles?.map((ur) => ur.role?.name) || [];

    if (requester.sub === targetUserId) {
      return { allowed: true, reason: 'User managing own profile' };
    }

    if (isSuperAdmin(requester.roles)) {
      return { allowed: true, reason: 'SUPER_ADMIN can manage all users' };
    }

    if (isSuperAdmin(targetUserRoles)) {
      return {
        allowed: false,
        reason: 'Cannot manage SUPER_ADMIN accounts',
      };
    }

    if (!canAccessTenant(requester, targetUser.tenantId || '')) {
      return {
        allowed: false,
        reason: 'Cross-tenant access not allowed',
      };
    }

    if (
      targetUserRoles.includes('COMPANY_ADMIN') &&
      !canManageCompanyAdmins(requester)
    ) {
      return {
        allowed: false,
        reason: 'MANAGE_COMPANY_ADMINS permission required',
      };
    }

    return { allowed: true, reason: 'User management allowed' };
  }

  async canViewUser(
    requester: any,
    targetUserId: string,
  ): Promise<AuthorizationResult> {
    return this.canManageUser(requester, targetUserId);
  }

  filterAccessibleUsers(requester: any, users: User[]): User[] {
    if (isSuperAdmin(requester.roles)) {
      return users;
    }

    return users.filter((user) => {
      if (user.id === requester.sub) {
        return true;
      }

      if (!canAccessTenant(requester, user.tenantId || '')) {
        return false;
      }

      return true;
    });
  }

  validatePrivilegeEscalation(
    requester: any,
    targetRoles: string[],
  ): AuthorizationResult {
    if (isSuperAdmin(requester.roles)) {
      return { allowed: true, reason: 'SUPER_ADMIN can assign any role' };
    }

    const hasPrivilegeEscalation = targetRoles.some((role) => {
      if (role === 'SUPER_ADMIN') {
        return true;
      }
      return (
        role === 'COMPANY_ADMIN' &&
        !hasHigherOrEqualPrivilege(requester.roles, 'COMPANY_ADMIN')
      );
    });

    if (hasPrivilegeEscalation) {
      return {
        allowed: false,
        reason: 'Privilege escalation detected',
      };
    }

    return { allowed: true, reason: 'Role assignment valid' };
  }
}
