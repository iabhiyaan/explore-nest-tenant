import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  Tenant,
  Role,
  Permission,
  UserRole,
  RolePermission,
} from '../database/entities';

@Injectable()
export class DatabaseSeeder {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Tenant) private tenantRepository: Repository<Tenant>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async seed() {
    const permissions = await this.seedPermissions();
    const roles = await this.seedRoles();
    const tenant = await this.seedTenant();
    await this.seedRolePermissions(roles, permissions);
    await this.seedUsers(roles, tenant);
  }

  private async seedPermissions(): Promise<Permission[]> {
    const permissionData = [
      { key: 'MANAGE_COMPANIES', description: 'Can manage companies/tenants' },
      { key: 'VIEW_COMPANIES', description: 'Can view companies/tenants' },
      { key: 'MANAGE_USERS', description: 'Can manage users' },
      { key: 'VIEW_USERS', description: 'Can view users' },
      {
        key: 'MANAGE_COMPANY_ADMINS',
        description: 'Can manage company admins',
      },
      { key: 'VIEW_COMPANY_ADMINS', description: 'Can view company admins' },
      { key: 'MANAGE_ROLES', description: 'Can manage roles' },
      { key: 'VIEW_ROLES', description: 'Can view roles' },
      { key: 'MANAGE_PERMISSIONS', description: 'Can manage permissions' },
      { key: 'VIEW_PERMISSIONS', description: 'Can view permissions' },
    ];

    const permissions: Permission[] = [];
    for (const data of permissionData) {
      let permission = await this.permissionRepository.findOne({
        where: { key: data.key },
      });
      if (!permission) {
        permission = this.permissionRepository.create(data);
        await this.permissionRepository.save(permission);
      }
      permissions.push(permission);
    }
    return permissions;
  }

  private async seedRoles(): Promise<Role[]> {
    const roleData: Array<{ name: string; tenantId: string | null }> = [
      { name: 'SUPER_ADMIN', tenantId: null },
      { name: 'COMPANY_ADMIN', tenantId: null },
      { name: 'CLIENT', tenantId: null },
    ];

    const roles: Role[] = [];
    for (const data of roleData) {
      let role = await this.roleRepository.findOne({
        where: { name: data.name, tenantId: data.tenantId as any },
      });
      if (!role) {
        role = this.roleRepository.create(data);
        await this.roleRepository.save(role);
      }
      roles.push(role);
    }
    return roles;
  }

  private async seedTenant(): Promise<Tenant> {
    let tenant = await this.tenantRepository.findOne({
      where: { name: 'Acme Corp' },
    });
    if (!tenant) {
      tenant = this.tenantRepository.create({ name: 'Acme Corp' });
      await this.tenantRepository.save(tenant);
    }
    return tenant;
  }

  private async seedRolePermissions(roles: Role[], permissions: Permission[]) {
    const rolePermissionsMap: Record<string, string[]> = {
      SUPER_ADMIN: permissions.map((p) => p.key),
      COMPANY_ADMIN: [
        'MANAGE_USERS',
        'VIEW_USERS',
        'VIEW_ROLES',
        'VIEW_PERMISSIONS',
      ],
      CLIENT: ['VIEW_USERS'],
    };

    for (const role of roles) {
      const permissionKeys = rolePermissionsMap[role.name] || [];
      for (const key of permissionKeys) {
        const permission = permissions.find((p) => p.key === key);
        if (permission) {
          const existing = await this.rolePermissionRepository.findOne({
            where: { roleId: role.id, permissionId: permission.id },
          });
          if (!existing) {
            const rp = this.rolePermissionRepository.create({
              roleId: role.id,
              permissionId: permission.id,
            });
            await this.rolePermissionRepository.save(rp);
          }
        }
      }
    }
  }

  private async seedUsers(roles: Role[], tenant: Tenant) {
    type UserData = {
      username: string;
      password: string;
      roleName: string;
      tenantId: string | null;
    };

    const userData: UserData[] = [
      {
        username: 'superadmin',
        password: 'admin123',
        roleName: 'SUPER_ADMIN',
        tenantId: null,
      },
      {
        username: 'companyadmin',
        password: 'admin123',
        roleName: 'COMPANY_ADMIN',
        tenantId: tenant.id,
      },
      {
        username: 'clientuser',
        password: 'client123',
        roleName: 'CLIENT',
        tenantId: tenant.id,
      },
    ];

    for (const data of userData) {
      let user = await this.userRepository.findOne({
        where: { username: data.username },
      });
      if (!user) {
        const passwordHash = await bcrypt.hash(data.password, 10);
        user = this.userRepository.create({
          username: data.username,
          passwordHash,
          tenantId: data.tenantId,
        });
        await this.userRepository.save(user);

        const role = roles.find((r) => r.name === data.roleName);
        if (role) {
          const userRole = this.userRoleRepository.create({
            userId: user.id,
            roleId: role.id,
          });
          await this.userRoleRepository.save(userRole);
        }
      }
    }
  }
}
