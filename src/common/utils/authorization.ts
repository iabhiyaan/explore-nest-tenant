import { RoleHierarchy, ADMIN_MANAGEMENT_PERMISSION } from '../constants/roles';

export function getRoleLevel(role: string): number {
  return RoleHierarchy[role as keyof typeof RoleHierarchy] || 0;
}

export function hasHigherOrEqualPrivilege(
  userRoles: string[],
  targetRole: string,
): boolean {
  const userMaxLevel = Math.max(...userRoles.map((role) => getRoleLevel(role)));
  const targetLevel = getRoleLevel(targetRole);
  return userMaxLevel >= targetLevel;
}

export function isProtectedRole(userRoles: string[]): boolean {
  return userRoles.some(
    (role) => (RoleHierarchy as any)[role] >= RoleHierarchy.COMPANY_ADMIN,
  );
}

export function isSuperAdmin(userRoles: string[]): boolean {
  return userRoles.includes('SUPER_ADMIN');
}

export function canAccessUserData(
  currentUser: any,
  targetUser: any,
  targetUserRoles: string[],
): { allowed: boolean; reason: string } {
  if (currentUser.sub === targetUser.id) {
    return { allowed: true, reason: 'Accessing own profile' };
  }

  if (isSuperAdmin(currentUser.roles)) {
    return { allowed: true, reason: 'SUPER_ADMIN can access all users' };
  }

  if (isSuperAdmin(targetUserRoles)) {
    return {
      allowed: false,
      reason: 'Cannot access SUPER_ADMIN accounts',
    };
  }

  if (
    !hasHigherOrEqualPrivilege(currentUser.roles, 'COMPANY_ADMIN') ||
    currentUser.tenantId !== targetUser.tenantId
  ) {
    return {
      allowed: false,
      reason: 'Cross-tenant access not allowed',
    };
  }

  if (
    targetUserRoles.includes('COMPANY_ADMIN') &&
    !currentUser.permissions?.includes(ADMIN_MANAGEMENT_PERMISSION)
  ) {
    return {
      allowed: false,
      reason: 'MANAGE_COMPANY_ADMINS permission required',
    };
  }

  return { allowed: true, reason: 'Access granted' };
}

export function requiresAdminManagementPermission(currentUser: any): boolean {
  return isSuperAdmin(currentUser.roles) ||
    currentUser.permissions?.includes(ADMIN_MANAGEMENT_PERMISSION)
    ? true
    : false;
}

export function canManageCompanyAdmins(requester: any): boolean {
  return (
    isSuperAdmin(requester.roles) ||
    requester.permissions?.includes(ADMIN_MANAGEMENT_PERMISSION)
  );
}

export function canAccessTenant(requester: any, tenantId: string): boolean {
  return isSuperAdmin(requester.roles) || requester.tenantId === tenantId;
}
