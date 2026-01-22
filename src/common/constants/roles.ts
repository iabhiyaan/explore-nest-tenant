export const RoleHierarchy = {
  SUPER_ADMIN: 3,
  COMPANY_ADMIN: 2,
  CLIENT: 1,
} as const;

export const PROTECTED_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN'] as const;
export const ADMIN_MANAGEMENT_PERMISSION = 'MANAGE_COMPANY_ADMINS';

export type RoleName = keyof typeof RoleHierarchy;
