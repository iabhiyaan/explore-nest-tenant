import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Tenant } from '../database/entities';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    // Validate tenant first (if provided)
    if (loginDto.tenantId) {
      const tenant = await this.tenantRepository.findOne({
        where: { id: loginDto.tenantId },
      });
      if (!tenant) {
        throw new UnauthorizedException('Invalid tenant ID');
      }
      if (!tenant.isActive) {
        throw new UnauthorizedException('Tenant is deactivated');
      }
    }

    // Load user (optionally scoped to tenant)
    const userWhere: any = { username: loginDto.username };
    if (loginDto.tenantId) {
      userWhere.tenantId = loginDto.tenantId;
    }

    const user = await this.userRepository.findOne({
      where: userWhere,
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
        'tenant',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Tenant validity for loaded user
    if (user.tenantId) {
      const tenant = user.tenant;
      if (!tenant || !tenant.isActive) {
        throw new UnauthorizedException('Tenant is deactivated');
      }
    }

    // Lock and active checks
    const isLocked = user.lockedUntil && user.lockedUntil > new Date();
    if (isLocked) {
      throw new UnauthorizedException(
        `Account is locked. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Password validation
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login: reset counters and generate token
    user.loginAttempts = 0;
    user.lockedUntil = null as any;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const permissions =
      user.userRoles
        ?.flatMap(
          (ur) =>
            ur.role?.rolePermissions?.map((rp) => rp.permission?.key) || [],
        )
        .filter(Boolean) || [];

    const payload = {
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
      roles: user.userRoles?.map((ur) => ur.role?.name) || [],
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        roles: user.userRoles?.map((ur) => ur.role?.name) || [],
        permissions,
        lastLogin: user.lastLoginAt,
      },
    };
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
        'tenant',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      tenantId: user.tenantId,
      tenant: user.tenant,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles:
        user.userRoles?.map((ur) => ({
          id: ur.role?.id,
          name: ur.role?.name,
          permissions:
            ur.role?.rolePermissions?.map((rp) => rp.permission?.key) || [],
        })) || [],
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }
}
