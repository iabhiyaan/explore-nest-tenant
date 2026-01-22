import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import { isSuperAdmin, canManageCompanyAdmins } from '../utils/authorization';

@Injectable()
export class CompanyAdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const currentUser = request.user;

    if (!currentUser) {
      throw new ForbiddenException('Authentication required');
    }

    const targetUserId = request.params.id;

    if (!targetUserId) {
      return true;
    }

    if (isSuperAdmin(currentUser.roles)) {
      return true;
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!targetUser) {
      throw new ForbiddenException('Target user not found');
    }

    const targetUserRoles =
      targetUser.userRoles?.map((ur) => ur.role?.name) || [];

    if (targetUserRoles.includes('COMPANY_ADMIN')) {
      if (!canManageCompanyAdmins(currentUser)) {
        throw new ForbiddenException(
          'MANAGE_COMPANY_ADMINS permission required to manage company admins',
        );
      }
    }

    return true;
  }
}
