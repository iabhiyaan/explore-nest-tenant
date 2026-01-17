import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Tenant } from '../database/entities';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import { PaginationQueryDto } from '../common/dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async create(createTenantDto: CreateTenantDto, currentUser: any) {
    const existingTenant = await this.tenantRepository.findOne({
      where: { name: createTenantDto.name },
    });

    if (existingTenant) {
      throw new ConflictException('Tenant with this name already exists');
    }

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      createdBy: currentUser.sub,
      updatedBy: currentUser.sub,
    });

    await this.tenantRepository.save(tenant);

    return this.findOne(tenant.id);
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};
    if (search) {
      whereCondition.name = Like(`%${search}%`);
    }

    const [tenants, total] = await this.tenantRepository.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: tenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['users', 'roles'],
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto, currentUser: any) {
    const tenant = await this.findOne(id);

    Object.assign(tenant, updateTenantDto);
    tenant.updatedBy = currentUser.sub;

    await this.tenantRepository.save(tenant);

    return this.findOne(id);
  }

  async remove(id: string, currentUser: any) {
    const tenant = await this.findOne(id);

    tenant.isActive = false;
    tenant.updatedBy = currentUser.sub;

    await this.tenantRepository.save(tenant);

    return { message: 'Tenant deactivated successfully' };
  }
}
