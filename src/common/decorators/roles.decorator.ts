import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const ROLE_AT_LEAST_KEY = 'roleAtLeast';
export const RoleAtLeast = (role: string) =>
  SetMetadata(ROLE_AT_LEAST_KEY, role);
