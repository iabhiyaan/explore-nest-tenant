import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getProfile(userId: string): Promise<{
    id: string;
    username: string;
    tenantId: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: Date;
    roles: string[];
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return {
      id: user.id,
      username: user.username,
      tenantId: user.tenantId,
      firstName: (user as any).firstName || null,
      lastName: (user as any).lastName || null,
      email: (user as any).email || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: user.userRoles?.map((ur) => ur.role?.name) || [],
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<{
    id: string;
    username: string;
    tenantId: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: Date;
    roles: string[];
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    if (dto.username && dto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: dto.username },
      });
      if (existingUser) {
        throw new ConflictException('Username already exists');
      }
      user.username = dto.username;
    }

    if (dto.firstName !== undefined) {
      (user as any).firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      (user as any).lastName = dto.lastName;
    }

    if (dto.email !== undefined) {
      (user as any).email = dto.email;
    }

    user.updatedBy = userId;
    await this.userRepository.save(user);

    return this.getProfile(userId);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.updatedBy = userId;
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }
}
