import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities';
import { CreateUserDto, UpdateUserDto } from './dto';
import { PaginationQueryDto } from '../common/dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, currentUser: any) {
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      username: createUserDto.username,
      passwordHash: hashedPassword,
      tenantId: createUserDto.tenantId || currentUser.tenantId,
      createdBy: currentUser.sub,
      updatedBy: currentUser.sub,
    });

    await this.userRepository.save(user);

    return this.findOne(user.id, currentUser);
  }

  async findAll(query: PaginationQueryDto, currentUser: any) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (currentUser.roles.includes('SUPER_ADMIN')) {
      if (search) {
        whereCondition.username = Like(`%${search}%`);
      }
    } else {
      whereCondition.tenantId = currentUser.tenantId;
      if (search) {
        whereCondition.username = Like(`%${search}%`);
      }
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['userRoles', 'userRoles.role'],
    });

    return {
      data: users.map((user) => ({
        id: user.id,
        username: user.username,
        tenantId: user.tenantId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        roles: user.userRoles?.map((ur) => ur.role?.name) || [],
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: any) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role', 'tenant'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !currentUser.roles.includes('SUPER_ADMIN') &&
      user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied to this user');
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
        })) || [],
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !currentUser.roles.includes('SUPER_ADMIN') &&
      user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied to this user');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    user.updatedBy = currentUser.sub;

    await this.userRepository.save(user);

    return this.findOne(id, currentUser);
  }

  async remove(id: string, currentUser: any) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !currentUser.roles.includes('SUPER_ADMIN') &&
      user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied to this user');
    }

    user.isActive = false;
    user.updatedBy = currentUser.sub;

    await this.userRepository.save(user);

    return { message: 'User deactivated successfully' };
  }
}
