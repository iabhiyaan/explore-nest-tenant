import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Role } from '../database/entities';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { PaginationQueryDto } from '../common/dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto, currentUser: any) {
    const role = this.roleRepository.create({
      ...createRoleDto,
      createdBy: currentUser.sub,
      updatedBy: currentUser.sub,
    });

    await this.roleRepository.save(role);

    return this.findOne(role.id);
  }

  async findAll(query: PaginationQueryDto, currentUser: any) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (currentUser.roles.includes('SUPER_ADMIN')) {
      if (search) {
        whereCondition.name = Like(`%${search}%`);
      }
    } else {
      whereCondition.tenantId = currentUser.tenantId;
      if (search) {
        whereCondition.name = Like(`%${search}%`);
      }
    }

    const [roles, total] = await this.roleRepository.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    return {
      data: roles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.permission', 'tenant'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto, currentUser: any) {
    const role = await this.findOne(id);

    Object.assign(role, updateRoleDto);
    role.updatedBy = currentUser.sub;

    await this.roleRepository.save(role);

    return this.findOne(id);
  }

  async remove(id: number, currentUser: any) {
    const role = await this.findOne(id);

    role.deletedAt = new Date();
    role.updatedBy = currentUser.sub;

    await this.roleRepository.save(role);

    return { message: 'Role deleted successfully' };
  }
}
