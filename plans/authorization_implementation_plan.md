# Authorization & Authentication Implementation Plan

## Overview

### What This Plan Tries to Solve

This implementation plan addresses ALL authentication and authorization aspects of the system, from login to profile management, role-based access control, and security enhancements.

### What This Plan Covers

This is a **COMPREHENSIVE plan** that covers:

1. **Authentication (Auth)**
   - User login with tenant validation
   - JWT token generation and validation
   - Profile retrieval and updates
   - Password management (change, reset)
   - Token refresh mechanism
   - Logout handling
   - Login rate limiting and security

2. **Authorization (Authz)**
   - Role hierarchy and privilege levels
   - Role-based access control (RBAC)
   - Permission-based access control
   - Tenant isolation
   - User data isolation (own profile only)
   - Admin management permissions
   - Privilege escalation prevention
   - Super admin protection

---

### Current Security Gaps

#### Authentication Gaps

##### 1. No Tenant Validation During Login

**Problem:** Any user from any tenant can login without tenant context validation.

**Current State:**
- Login accepts any valid username/password
- No validation that user's tenant is active
- No validation that tenant exists
- Users could access resources outside their intended context

**Impact:** Security gap - users could potentially access resources outside their tenant context.

##### 2. No Token Refresh Mechanism

**Problem:** JWT tokens expire and there's no way to refresh them without re-login.

**Current State:**
- Single JWT token on login
- No refresh token mechanism
- User must re-login after token expiration
- Poor user experience for long-lived sessions

**Impact:** Inconvenient for users, potential security issues with long-lived tokens.

##### 3. No Logout Mechanism

**Problem:** There's no way to invalidate tokens on logout.

**Current State:**
- No logout endpoint
- Tokens remain valid until expiration
- No server-side token invalidation
- No token blacklist

**Impact:** Users cannot force-logout from devices, security risk for compromised tokens.

##### 4. Limited Password Management

**Problem:** Password change exists but password reset doesn't.

**Current State:**
- Password change exists (`changePassword` in AuthService)
- No password reset via email
- No password strength validation
- No password history check

**Impact:** Users cannot recover forgotten passwords, weak password enforcement.

##### 5. No Rate Limiting on Auth Endpoints

**Problem:** Login endpoint is vulnerable to brute force attacks.

**Current State:**
- No rate limiting on `/auth/login`
- No login attempt tracking
- No account lockout mechanism
- Vulnerable to brute force attacks

**Impact:** Security vulnerability - attackers can brute force credentials.

---

#### Authorization Gaps (Previously Documented)

##### 6. No Role Hierarchy Enforcement
##### 7. Company Admin Data Leakage
##### 8. Unprotected Administrative Operations
##### 9. Privilege Escalation Risk
##### 10. Weak SUPER_ADMIN Protection

*(Previous sections detail these gaps)*

---

### What This Plan Implements

#### Authentication Improvements

1. **Tenant-Scoped Login**
   - Validate user belongs to valid, active tenant during login
   - Reject logins from deactivated tenants
   - Optional tenant context in login request

2. **Token Refresh Mechanism**
   - Implement refresh token storage and validation
   - Create `/auth/refresh` endpoint
   - Short-lived access tokens, long-lived refresh tokens
   - Token rotation on refresh

3. **Logout Functionality**
   - Create `/auth/logout` endpoint
   - Server-side token invalidation
   - Refresh token revocation
   - Audit logging

4. **Enhanced Password Management**
   - Password strength validation
   - Password reset via email (stub for now)
   - Password history check
   -强制密码过期

5. **Rate Limiting**
   - Login attempt rate limiting
   - Account lockout after failed attempts
   - IP-based rate limiting
   - Audit logging of failed attempts

#### Authorization Improvements

*(Same as previously documented)*

6. **Explicit Role Hierarchy**
7. **Privilege Escalation Guards**
8. **Permission-Based Admin Management**
9. **Data Ownership Isolation**
10. **Centralized Authorization**

---

### Goals

| Category | Goal | Description |
|----------|------|-------------|
| **Auth** | **Secure Login** | Tenant-validated, rate-limited login |
| **Auth** | **Token Management** | JWT + refresh token with proper lifecycle |
| **Auth** | **User Self-Service** | Users can manage their own profile |
| **Auth** | **Password Security** | Strong passwords, reset capabilities |
| **Authz** | **Role Hierarchy** | Explicit privilege levels |
| **Authz** | **Data Isolation** | Complete user data isolation |
| **Authz** | **Admin Protection** | Granular admin management |
| **Authz** | **Centralized Logic** | Single source of truth for access |

### Non-Goals

- OAuth/OIDC integration (future)
- Multi-factor authentication (future)
- Changing the multi-tenant architecture
- Adding new roles beyond existing hierarchy (CLIENT, COMPANY_ADMIN, SUPER_ADMIN)

---

---

This plan implements a comprehensive authentication and authorization system covering login, token management, profile updates, and role-based access control.

---

## Phase 0: Authentication Foundation

### Step 0.1: Add Tenant Validation to Login

**Status:** [ ]
**File:** `src/auth/auth.service.ts`
**Description:** Validate user belongs to a valid, active tenant during login
**Dependencies:** None
**Validation:** Users cannot login if tenant is invalid or inactive

**Changes to `login(loginDto)`:**

```typescript
async login(loginDto: LoginDto) {
  // ... existing user lookup ...

  // NEW: Validate tenant exists and is active
  if (user.tenantId) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant is deactivated');
    }
  }

  // ... rest of login logic ...
}
```

**Security Rules:**
- SUPER_ADMIN (tenantId: null) can always login
- Users with valid, active tenantId can login
- Users with invalid tenantId cannot login
- Users with deactivated tenant cannot login

---

### Step 0.2: Add Rate Limiting to Login

**Status:** [ ]
**File:** `src/auth/auth.controller.ts`
**Description:** Implement rate limiting to prevent brute force attacks
**Dependencies:** None
**Validation:** Login blocked after multiple failed attempts

**Implementation:**
```typescript
import { Throttle } from '@nestjs/throttler';

@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
@ApiOperation({ summary: 'Login with username and password' })
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}
```

**Configuration:**
- Default: 5 login attempts per minute per IP
- After limit exceeded: Return 429 Too Many Requests
- Window resets after TTL (60 seconds)

---

### Step 0.3: Enhance Login Response

**Status:** [ ]
**File:** `src/auth/auth.service.ts`
**Description:** Include additional user info in login response
**Dependencies:** None
**Validation:** Login response contains relevant user data

**Enhanced login response:**
```typescript
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
```

**Add to User entity:**
```typescript
@Column({ name: 'last_login_at', nullable: true })
lastLoginAt: Date;
```

---

### Step 0.4: Add Login Attempt Tracking

**Status:** [ ]
**File:** `src/auth/auth.service.ts`
**Description:** Track login attempts for security auditing
**Dependencies:** None
**Validation:** Login attempts are logged and tracked

**Add to User entity:**
```typescript
@Column({ name: 'login_attempts', default: 0 })
loginAttempts: number;

@Column({ name: 'locked_until', nullable: true })
lockedUntil: Date;
```

**Logic:**
- Increment `loginAttempts` on failed login
- Reset on successful login
- Lock account after 5 failed attempts for 15 minutes
- Clear lockout after timeout

---

### Step 0.5: Create Login DTO with Optional Tenant

**Status:** [ ]
**File:** `src/auth/dto/login.dto.ts`
**Description:** Update login DTO to accept optional tenant context
**Dependencies:** None
**Validation:** DTO validates optional tenant

**Updated DTO:**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user1' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'tenant-id', required: false, description: 'Optional tenant ID for context' })
  @IsString()
  @IsOptional()
  tenantId?: string;
}
```

---

## Phase 0B: Token Management

### Step 0.6: Implement Token Refresh

**Status:** [ ]
**Files:** `src/auth/refresh-tokens.entity.ts`, `src/auth/auth.service.ts`, `src/auth/auth.controller.ts`
**Description:** Implement refresh token mechanism for extended sessions
**Dependencies:** Phase 0 complete
**Validation:** Users can refresh access tokens

**Create refresh token entity:**
```typescript
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;
}
```

**Add endpoints:**
```typescript
@Post('refresh')
@ApiOperation({ summary: 'Refresh access token' })
async refreshToken(@Body() dto: RefreshTokenDto) {
  return this.authService.refreshToken(dto.refreshToken);
}

@Post('logout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Logout and invalidate tokens' })
async logout(@Request() req: any) {
  return this.authService.logout(req.user.sub);
}
```

**Refresh token DTO:**
```typescript
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string;
}
```

**Token strategy:**
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry
- Token rotation: New refresh token on each refresh
- Server-side token storage for revocation

---

## Phase 0C: Password Management

### Step 0.7: Add Password Strength Validation

**Status:** [ ]
**File:** `src/auth/validators/password-strength.validator.ts`
**Description:** Validate password strength during change/reset
**Dependencies:** None
**Validation:** Weak passwords are rejected

**Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Implementation:**
```typescript
export class PasswordStrengthValidator implements ValidatorConstraintInterface {
  validate(password: string) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  }
}
```

---

### Step 0.8: Create Password Reset Flow (Stub)

**Status:** [ ]
**Files:** `src/auth/dto/reset-password.dto.ts`, `src/auth/auth.service.ts`
**Description:** Implement password reset request flow (email stub)
**Dependencies:** None
**Validation:** Password can be reset with valid token

**Endpoints:**
```typescript
@Post('forgot-password')
@ApiOperation({ summary: 'Request password reset email' })
async forgotPassword(@Body() dto: ForgotPasswordDto) {
  return this.authService.requestPasswordReset(dto.email);
}

@Post('reset-password')
@ApiOperation({ summary: 'Reset password with token' })
async resetPassword(@Body() dto: ResetPasswordDto) {
  return this.authService.resetPassword(dto.token, dto.newPassword);
}
```

**DTOs:**
```typescript
export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from email' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @Validate(PasswordStrengthValidator)
  newPassword: string;
}
```

**Note:** Email sending is stubbed - implement with actual email service later.

---

## Phase 0D: Profile Management

### Step 0.9: Create Profile Service

**Status:** [ ]
**File:** `src/users/profile.service.ts`
**Description:** Business logic for user self-service operations
**Dependencies:** None
**Validation:** Users can only manage their own profile

**Methods:**
```typescript
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant', 'userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapToProfileResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    // Update only allowed fields
    if (dto.username) user.username = dto.username;
    // ... other allowed fields

    await this.userRepository.save(user);
    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }
}
```

---

### Step 0.10: Create Profile DTOs

**Status:** [ ]
**File:** `src/users/dto/profile.dto.ts`
**Description:** DTOs for profile operations
**Dependencies:** Step 0.9
**Validation:** DTOs validate input correctly

**New file:** `src/users/dto/profile.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, IsEmail } from 'class-validator';
import { PasswordStrengthValidator } from '../../auth/validators/password-strength.validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'newusername', required: false })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ example: 'john.doe@example.com', required: false })
  @IsString()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewP@ssw0rd123', description: 'Must meet password strength requirements' })
  @IsString()
  @MinLength(8)
  @Validate(PasswordStrengthValidator)
  newPassword: string;
}
```

---

### Step 0.11: Add Profile Endpoints to AuthController

**Status:** [ ]
**File:** `src/auth/auth.controller.ts`
**Description:** Add profile endpoints for user self-service
**Dependencies:** Step 0.9, Step 0.10
**Validation:** Profile endpoints work correctly

**Add to AuthController:**

```typescript
import { ProfileService } from '../users/profile.service';
import { UpdateProfileDto, ChangePasswordDto } from '../users/dto/profile.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Body() dto: UpdateProfileDto, @Request() req: any) {
    return this.profileService.updateProfile(req.user.sub, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(@Body() dto: ChangePasswordDto, @Request() req: any) {
    return this.profileService.changePassword(req.user.sub, dto);
  }
}
```

---

## Phase 0E: User Self-Service Isolation

### Step 0.12: Update UsersService for Complete User Isolation

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Prevent users from accessing ANY other users' data
**Dependencies:** None
**Validation:** Users can only access their own data or admin-managed users

**Key Changes:**

```typescript
async findOne(id: string, currentUser: any) {
  const isOwnProfile = id === currentUser.sub;
  const isAdmin = currentUser.roles?.includes('SUPER_ADMIN') ||
                  currentUser.roles?.includes('COMPANY_ADMIN');

  if (!isOwnProfile && !isAdmin) {
    throw new ForbiddenException('You can only access your own profile');
  }

  // ... existing tenant isolation check ...
}
```

**Updated Access Rules:**

| Requester | Target | Access |
|-----------|--------|--------|
| Regular User (CLIENT) | Own profile | ✅ Allowed |
| Regular User (CLIENT) | Other user (same tenant) | ❌ Blocked |
| Regular User (CLIENT) | Other user (different tenant) | ❌ Blocked |
| COMPANY_ADMIN | Any user (same tenant) | ✅ Allowed |
| COMPANY_ADMIN | Any user (different tenant) | ❌ Blocked |
| SUPER_ADMIN | Any user | ✅ Allowed |

---

## Phase 1: Role Hierarchy Foundation

### Step 1.1: Create Role Hierarchy Constants

**Status:** [ ]
**File:** `src/common/constants/roles.ts`
**Description:** Define privilege levels and role hierarchy constants
**Dependencies:** None
**Validation:** File created with exported constants

```typescript
export const RoleHierarchy = {
  SUPER_ADMIN: 3,
  COMPANY_ADMIN: 2,
  CLIENT: 1,
} as const;

export const PROTECTED_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN'] as const;
export const ADMIN_MANAGEMENT_PERMISSION = 'MANAGE_COMPANY_ADMINS';
```

---

### Step 1.2: Create Authorization Utilities

**Status:** [ ]
**File:** `src/common/utils/authorization.ts`
**Description:** Create reusable authorization helper functions
**Dependencies:** Step 1.1
**Validation:** All utility functions working correctly

**Functions to create:**

- `getRoleLevel(role: string): number`
- `hasHigherOrEqualPrivilege(userRoles: string[], targetRole: string): boolean`
- `isProtectedRole(userRoles: string[]): boolean`
- `isSuperAdmin(userRoles: string[]): boolean`
- `canAccessUserData(currentUser: any, targetUser: any, targetUserRoles: string[]): { allowed: boolean; reason: string }`
- `requiresAdminManagementPermission(currentUser: any): boolean`

---

### Step 1.3: Update JWT Strategy

**Status:** [ ]
**File:** `src/auth/strategies/jwt.strategy.ts`
**Description:** Include role hierarchy level in JWT payload for quick comparisons
**Dependencies:** Step 1.1
**Validation:** JWT payload includes `roleLevel` field

**Changes:**

- Extract `roleLevel` from user roles
- Include in validate() return object
- Update login response to expose role level

---

## Phase 2: Enhanced Authorization Guards

### Step 2.1: Update RolesGuard

**Status:** [ ]
**File:** `src/common/guards/roles.guard.ts`
**Description:** Add hierarchical role checking capabilities
**Dependencies:** Phase 1 complete
**Validation:** Guards work with both traditional and hierarchical checks

**Enhancements:**

- Support `RoleAtLeast` decorator option
- Allow minimum role level requirements
- Maintain backward compatibility with existing `@Roles()` decorator

---

### Step 2.2: Create PrivilegedRoleGuard

**Status:** [ ]
**File:** `src/common/guards/privileged-role.guard.ts`
**Description:** Explicit protection for SUPER_ADMIN accounts
**Dependencies:** Step 1.2, Step 2.1
**Validation:** Only SUPER_ADMIN can access SUPER_ADMIN data

**Logic:**

- Check if target user has SUPER_ADMIN role
- If yes, require current user to also have SUPER_ADMIN role
- Throw ForbiddenException if not authorized

---

### Step 2.3: Create CompanyAdminGuard

**Status:** [ ]
**File:** `src/common/guards/company-admin.guard.ts`
**Description:** Protect company admin management with permission checks
**Dependencies:** Step 1.2
**Validation:** Company admin management requires appropriate permission

**Logic:**

- Check if operation targets a COMPANY_ADMIN
- If yes, require `MANAGE_COMPANY_ADMINS` permission
- Allow SUPER_ADMIN bypass

---

## Phase 3: Service-Level Authorization

### Step 3.1: Create Authorization Service

**Status:** [ ]
**File:** `src/auth/authorization.service.ts`
**Description:** Centralized authorization logic for reuse across services
**Dependencies:** Step 1.2
**Validation:** Service created with all required methods

**Methods:**

- `canManageUser(requester: any, targetUser: User): AuthorizationResult`
- `canViewUser(requester: any, targetUser: User): AuthorizationResult`
- `canManageCompanyAdmins(requester: any): boolean`
- `canAccessTenant(requester: any, tenantId: string): boolean`
- `filterAccessibleUsers(requester: any, users: User[]): User[]`

---

### Step 3.2: Update UsersService - findOne

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Add role-aware authorization to findOne method
**Dependencies:** Step 3.1
**Validation:** All access scenarios handled correctly

**Changes to `findOne(id, currentUser)`:**

1. Check if target user is SUPER_ADMIN → only SUPER_ADMIN can access
2. Check if target user is COMPANY_ADMIN → requires MANAGE_COMPANY_ADMINS
3. Check tenant isolation (existing logic)
4. Return appropriate authorization result

---

### Step 3.3: Update UsersService - findAll

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Filter findAll results based on permissions
**Dependencies:** Step 3.1
**Validation:** Company admin only sees users they can manage

**Changes to `findAll(query, currentUser)`:**

- SUPER_ADMIN: sees all users
- COMPANY_ADMIN with MANAGE_COMPANY_ADMINS: sees all tenant users
- COMPANY_ADMIN without MANAGE_COMPANY_ADMINS: sees only regular users (not company admins)
- Apply tenant filter (existing logic)

---

### Step 3.4: Update UsersService - update

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Add authorization to update method
**Dependencies:** Step 3.1
**Validation:** Update blocked for unauthorized access

**Changes to `update(id, dto, currentUser)`:**

1. Check SUPER_ADMIN protection
2. Check COMPANY_ADMIN management permission
3. Prevent privilege escalation (e.g., regular user trying to add COMPANY_ADMIN role)
4. Validate tenant isolation

---

### Step 3.5: Update UsersService - remove

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Add authorization to remove (deactivate) method
**Dependencies:** Step 3.1
**Validation:** Remove blocked for unauthorized access

**Changes to `remove(id, currentUser)`:**

1. Check SUPER_ADMIN protection (cannot deactivate)
2. Check COMPANY_ADMIN management permission
3. Apply tenant isolation
4. Log deactivation attempt

---

### Step 3.6: Update UsersService - create

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Validate user creation permissions
**Dependencies:** Step 3.1
**Validation:** Creation respects permission boundaries

**Changes to `create(dto, currentUser)`:**

1. Prevent creating SUPER_ADMIN users (except by SUPER_ADMIN)
2. Validate COMPANY_ADMIN creation requires MANAGE_COMPANY_ADMINS
3. Prevent privilege escalation in dto
4. Validate tenant assignment

---

## Phase 4: Controller-Level Guards

### Step 4.1: Update UsersController Endpoints

**Status:** [ ]
**File:** `src/users/users.controller.ts`
**Description:** Apply appropriate guards to controller endpoints
**Dependencies:** Phase 3 complete
**Validation:** All endpoints have correct protection

**Endpoints to update:**

- `GET /users` - Add filtering based on permissions
- `GET /users/:id` - Add PrivilegedRoleGuard for admin users
- `POST /users` - Validate creation permissions
- `PATCH /users/:id` - Add authorization checks
- `DELETE /users/:id` - Add authorization checks

---

### Step 4.2: Create Admin Management Endpoints

**Status:** [ ]
**File:** `src/users/users.controller.ts`
**Description:** Separate endpoints for company admin management
**Dependencies:** Step 4.1
**Validation:** Admin management requires MANAGE_COMPANY_ADMINS

**New endpoints:**

- `GET /users/admins` - List all company admins (requires permission)
- `GET /users/admins/:id` - Get specific admin details (requires permission)
- `POST /users/admins` - Create company admin (requires permission)

---

## Phase 5: Decorators & Enhanced Types

### Step 5.1: Create ProtectedRole Decorator

**Status:** [ ]
**File:** `src/common/decorators/protected-role.decorator.ts`
**Description:** Mark endpoints that protect privileged roles
**Dependencies:** Step 1.1
**Validation:** Decorator works with guard

**Usage:**

```typescript
@ProtectedRole()
@Patch('/users/:id')
updateUser(...)
```

---

### Step 5.2: Create RequirePermission Decorator

**Status:** [ ]
**File:** `src/common/decorators/permissions.decorator.ts`
**Description:** Enhanced permission checking decorator
**Dependencies:** None (existing file)
**Validation:** Permission checks work correctly

**Enhancements:**

- Add `anyOf` parameter (existing behavior)
- Add `allOf` parameter (new - requires all permissions)
- Add `permissionLevel` parameter for hierarchical checks

---

### Step 5.3: Create RoleAtLeast Decorator

**Status:** [ ]
**File:** `src/common/decorators/roles.decorator.ts`
**Description:** Require minimum role level
**Dependencies:** Step 1.1
**Validation:** Minimum role level enforced

**Usage:**

```typescript
@RoleAtLeast('COMPANY_ADMIN')
@Patch('/users/:id')
updateUser(...)
```

---

## Phase 6: Database & Entity Enhancements

### Step 6.1: Add Helper Methods to User Entity

**Status:** [ ]
**File:** `src/database/entities/user.entity.ts`
**Description:** Add convenience methods for role checking
**Dependencies:** Step 1.1
**Validation:** Methods work correctly

**Add methods:**

- `getRoleNames(): string[]`
- `hasRole(roleName: string): boolean`
- `hasPermission(permissionKey: string): boolean`
- `isSuperAdmin(): boolean`
- `isCompanyAdmin(): boolean`
- `getRoleLevel(): number`

---

### Step 6.2: Add User Tracking Columns

**Status:** [ ]
**File:** `src/database/entities/user.entity.ts`
**Description:** Add columns for tracking user activity and ownership
**Dependencies:** None
**Validation:** New columns added and tracked

**Add columns:**
```typescript
@Column({ name: 'last_login_at', nullable: true })
lastLoginAt: Date;

@Column({ name: 'login_attempts', default: 0 })
loginAttempts: number;

@Column({ name: 'locked_until', nullable: true })
lockedUntil: Date;

@Column({ name: 'password_changed_at' })
passwordChangedAt: Date;

@Column({ name: 'owned_by', nullable: true })
ownedBy: string;  // User ID of the creator
```

---

### Step 6.3: Create RefreshToken Entity

**Status:** [ ]
**File:** `src/database/entities/refresh-token.entity.ts`
**Description:** Entity for storing refresh tokens
**Dependencies:** Step 0.6
**Validation:** Entity created and linked

```typescript
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;
}
```

---

## Phase 7: Testing

### Step 7.1: Unit Tests - Authentication

**Status:** [ ]
**File:** `test/auth/`
**Description:** Test authentication functionality
**Dependencies:** Phase 0 complete
**Validation:** All test cases pass

**Test files:**
- `auth.service.spec.ts` - Login, logout, token refresh
- `profile.service.spec.ts` - Profile management
- `password-validator.spec.ts` - Password strength validation
- `rate-limiting.spec.ts` - Login rate limiting

---

### Step 7.2: Unit Tests - Authorization Utilities

**Status:** [ ]
**File:** `test/common/utils/authorization.spec.ts`
**Description:** Test authorization utility functions
**Dependencies:** Step 1.2
**Validation:** All test cases pass

**Test cases:**
- Role level comparisons
- Protected role detection
- Permission checks
- Cross-tenant scenarios

---

### Step 7.3: Unit Tests - Guards

**Status:** [ ]
**File:** `test/common/guards/`
**Description:** Test authorization guards
**Dependencies:** Phase 2
**Validation:** All guard scenarios tested

**Test files:**
- `roles.guard.spec.ts`
- `privileged-role.guard.spec.ts`
- `company-admin.guard.spec.ts`

---

### Step 7.4: Integration Tests - UsersService

**Status:** [ ]
**File:** `test/users/users.service.spec.ts`
**Description:** Test service-level authorization
**Dependencies:** Phase 3
**Validation:** All access scenarios tested

**Test scenarios:**
- SUPER_ADMIN access to all users
- Company admin access within tenant
- Cross-tenant access blocked
- Admin management permission required
- Privilege escalation prevented
- User self-service isolation

---

### Step 7.5: API Tests - End-to-End

**Status:** [ ]
**File:** `test/users/users.e2e-spec.ts`
**Description:** Test full API access scenarios
**Dependencies:** Phase 4
**Validation:** All endpoints protected correctly

**Test cases:**
- Login as different role types
- Token refresh flow
- Profile update as regular user
- Attempt unauthorized access
- Verify data isolation
- Test privilege escalation attempts

---

## Phase 8: Documentation & Cleanup

### Step 8.1: Update README

**Status:** [ ]
**File:** `README.md`
**Description:** Document new authentication and authorization system
**Dependencies:** All implementation complete
**Validation:** Documentation accurate and complete

**Sections to add:**
- Authentication endpoints reference
- Authorization model explanation
- Role hierarchy diagram
- Access control matrix
- New decorators and guards usage
- Migration guide

---

### Step 8.2: API Documentation

**Status:** [ ]
**File:** `docs/api/auth-api.md`
**Description:** Document all auth API endpoints
**Dependencies:** Phase 0 complete
**Validation:** Documentation complete

**Endpoints to document:**
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/profile`
- `PATCH /auth/profile`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

---

### Step 8.3: Code Review Checklist

**Status:** [ ]
**File:** `docs/authorization-checklist.md`
**Description:** Checklist for future authorization reviews
**Dependencies:** All implementation complete
**Validation:** Checklist comprehensive

**Items to include:**
- New endpoints must use appropriate guards
- Service methods must check authorization
- Role escalation paths must be blocked
- Tenant isolation maintained
- Password strength validated
- Login rate limiting enabled

---

## Progress Tracking

### Phase Completion

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| Phase 0 | Authentication Foundation | [ ] | | |
| Phase 0B | Token Management | [ ] | | |
| Phase 0C | Password Management | [ ] | | |
| Phase 0D | Profile Management | [ ] | | |
| Phase 0E | User Isolation | [ ] | | |
| Phase 1 | Role Hierarchy | [ ] | | |
| Phase 2 | Enhanced Guards | [ ] | | |
| Phase 3 | Service Authorization | [ ] | | |
| Phase 4 | Controller Guards | [ ] | | |
| Phase 5 | Decorators | [ ] | | |
| Phase 6 | Database | [ ] | | |
| Phase 7 | Testing | [ ] | | |
| Phase 8 | Documentation | [ ] | | |

### Step Completion

#### Phase 0: Authentication Foundation
- [ ] Step 0.1: Tenant Validation in Login
- [ ] Step 0.2: Rate Limiting on Login
- [ ] Step 0.3: Enhance Login Response
- [ ] Step 0.4: Login Attempt Tracking
- [ ] Step 0.5: Login DTO with Tenant

#### Phase 0B: Token Management
- [ ] Step 0.6: Token Refresh Mechanism
- [ ] Step 0.6: Logout & Token Revocation

#### Phase 0C: Password Management
- [ ] Step 0.7: Password Strength Validation
- [ ] Step 0.8: Password Reset Flow

#### Phase 0D: Profile Management
- [ ] Step 0.9: Profile Service
- [ ] Step 0.10: Profile DTOs
- [ ] Step 0.11: Profile Endpoints

#### Phase 0E: User Isolation
- [ ] Step 0.12: Complete User Isolation

#### Phase 1: Role Hierarchy
- [ ] Step 1.1: Role Hierarchy Constants
- [ ] Step 1.2: Authorization Utilities
- [ ] Step 1.3: JWT Strategy Update

#### Phase 2: Enhanced Guards
- [ ] Step 2.1: RolesGuard Update
- [ ] Step 2.2: PrivilegedRoleGuard
- [ ] Step 2.3: CompanyAdminGuard

#### Phase 3: Service Authorization
- [ ] Step 3.1: Authorization Service
- [ ] Step 3.2: UsersService.findOne
- [ ] Step 3.3: UsersService.findAll
- [ ] Step 3.4: UsersService.update
- [ ] Step 3.5: UsersService.remove
- [ ] Step 3.6: UsersService.create

#### Phase 4: Controller Guards
- [ ] Step 4.1: UsersController Endpoints
- [ ] Step 4.2: Admin Management Endpoints

#### Phase 5: Decorators
- [ ] Step 5.1: ProtectedRole Decorator
- [ ] Step 5.2: RequirePermission Decorator
- [ ] Step 5.3: RoleAtLeast Decorator

#### Phase 6: Database
- [ ] Step 6.1: User Entity Methods
- [ ] Step 6.2: User Tracking Columns
- [ ] Step 6.3: RefreshToken Entity

#### Phase 7: Testing
- [ ] Step 7.1: Unit Tests - Authentication
- [ ] Step 7.2: Unit Tests - Utilities
- [ ] Step 7.3: Unit Tests - Guards
- [ ] Step 7.4: Integration Tests
- [ ] Step 7.5: API Tests

#### Phase 8: Documentation
- [ ] Step 8.1: Update README
- [ ] Step 8.2: API Documentation
- [ ] Step 8.3: Code Review Checklist

---

## API Endpoints Summary

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Login with username/password | Public |
| POST | `/auth/logout` | Logout and invalidate tokens | Authenticated |
| POST | `/auth/refresh` | Refresh access token | Public (with refresh token) |
| GET | `/auth/profile` | Get current user profile | Authenticated |
| PATCH | `/auth/profile` | Update current user profile | Authenticated |
| POST | `/auth/change-password` | Change password | Authenticated |
| POST | `/auth/forgot-password` | Request password reset | Public |
| POST | `/auth/reset-password` | Reset password with token | Public |

### User Management Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/users` | List users (tenant-scoped) | COMPANY_ADMIN+ |
| GET | `/users/:id` | Get user by ID | COMPANY_ADMIN+ |
| POST | `/users` | Create user | COMPANY_ADMIN+ |
| PATCH | `/users/:id` | Update user | COMPANY_ADMIN+ |
| DELETE | `/users/:id` | Deactivate user | COMPANY_ADMIN+ |
| GET | `/users/admins` | List company admins | MANAGE_COMPANY_ADMINS |
| POST | `/users/admins` | Create company admin | MANAGE_COMPANY_ADMINS |

---

## Access Control Matrix

### Authentication

| Operation | Public | Authenticated User | COMPANY_ADMIN | SUPER_ADMIN |
|-----------|--------|-------------------|---------------|-------------|
| Login | ✅ | N/A | N/A | N/A |
| Logout | ❌ | ✅ | ✅ | ✅ |
| Refresh Token | ✅* | N/A | N/A | N/A |
| Get Profile | ❌ | ✅ (own) | ✅ (same tenant) | ✅ (all) |
| Update Profile | ❌ | ✅ (own) | ❌ | ❌ |
| Change Password | ❌ | ✅ (own) | ❌ | ❌ |

*With valid refresh token

### Profile Operations

| Endpoint | CLIENT | COMPANY_ADMIN | SUPER_ADMIN |
|----------|--------|---------------|-------------|
| `GET /auth/profile` | ✅ Own | ✅ Own | ✅ Own |
| `PATCH /auth/profile` | ✅ Own | ✅ Own | ✅ Own |
| `POST /auth/change-password` | ✅ Own | ✅ Own | ✅ Own |
| `GET /users/:id` | ❌ | ✅ Within tenant | ✅ All |
| `PATCH /users/:id` | ❌ | ✅ Within tenant | ✅ All |
| `DELETE /users/:id` | ❌ | ✅ Within tenant | ✅ All |

### Admin Operations

| Operation | SUPER_ADMIN | COMPANY_ADMIN (with MANAGE_COMPANY_ADMINS) | COMPANY_ADMIN (without) | CLIENT |
|-----------|-------------|---------------------------------------------|--------------------------|--------|
| View SUPER_ADMIN | ✅ | ❌ | ❌ | ❌ |
| View COMPANY_ADMIN | ✅ | ✅ (same tenant) | ❌ | ❌ |
| View Regular User | ✅ | ✅ (same tenant) | ✅ (same tenant) | ❌ |
| Create SUPER_ADMIN | ✅ | ❌ | ❌ | ❌ |
| Create COMPANY_ADMIN | ✅ | ✅ (same tenant) | ❌ | ❌ |
| Create Regular User | ✅ | ✅ (same tenant) | ✅ (same tenant) | ❌ |
| Delete SUPER_ADMIN | ❌ | ❌ | ❌ | ❌ |
| Delete COMPANY_ADMIN | ✅ | ✅ (same tenant) | ❌ | ❌ |

---

## Commands to Run

### After completing all steps:

```bash
# Run database migration
npm run migration:run

# Run database seed
npm run seed:db

# Run tests
npm test

# Run specific test file
npm test -- test/auth/auth.service.spec.ts

# Run e2e tests
npm run test:e2e

# Lint code
npm run lint

# Type check
npm run typecheck
```

---

## Security Checklist

- [ ] Login requires valid, active tenant
- [ ] Login has rate limiting (5 attempts/minute)
- [ ] Login tracks failed attempts
- [ ] Password meets strength requirements
- [ ] Password change requires current password
- [ ] JWT tokens have short expiry (15 min)
- [ ] Refresh tokens are stored server-side
- [ ] Logout revokes refresh token
- [ ] Users can only access own profile
- [ ] Admins cannot access SUPER_ADMIN data
- [ ] Admin operations require permissions
- [ ] Privilege escalation is prevented
- [ ] Cross-tenant access is blocked
- [ ] All endpoints have proper guards

---

**Plan Version:** 2.0 (Comprehensive)
**Created:** 2026-01-22
**Last Updated:** 2026-01-22

### Step 1.1: Create Role Hierarchy Constants

**Status:** [ ]
**File:** `src/common/constants/roles.ts`
**Description:** Define privilege levels and role hierarchy constants
**Dependencies:** None
**Validation:** File created with exported constants

```typescript
export const RoleHierarchy = {
  SUPER_ADMIN: 3,
  COMPANY_ADMIN: 2,
  CLIENT: 1,
} as const;

export const PROTECTED_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN'] as const;
export const ADMIN_MANAGEMENT_PERMISSION = 'MANAGE_COMPANY_ADMINS';
```

---

### Step 1.2: Create Authorization Utilities

**Status:** [ ]
**File:** `src/common/utils/authorization.ts`
**Description:** Create reusable authorization helper functions
**Dependencies:** Step 1.1
**Validation:** All utility functions working correctly

**Functions to create:**

- `getRoleLevel(role: string): number`
- `hasHigherOrEqualPrivilege(userRoles: string[], targetRole: string): boolean`
- `isProtectedRole(userRoles: string[]): boolean`
- `isSuperAdmin(userRoles: string[]): boolean`
- `canAccessUserData(currentUser: any, targetUser: any, targetUserRoles: string[]): { allowed: boolean; reason: string }`
- `requiresAdminManagementPermission(currentUser: any): boolean`

---

### Step 1.3: Update JWT Strategy

**Status:** [ ]
**File:** `src/auth/strategies/jwt.strategy.ts`
**Description:** Include role hierarchy level in JWT payload for quick comparisons
**Dependencies:** Step 1.1
**Validation:** JWT payload includes `roleLevel` field

**Changes:**

- Extract `roleLevel` from user roles
- Include in validate() return object
- Update login response to expose role level

---

## Phase 2: Enhanced Authorization Guards

### Step 2.1: Update RolesGuard

**Status:** [ ]
**File:** `src/common/guards/roles.guard.ts`
**Description:** Add hierarchical role checking capabilities
**Dependencies:** Phase 1 complete
**Validation:** Guards work with both traditional and hierarchical checks

**Enhancements:**

- Support `RoleAtLeast` decorator option
- Allow minimum role level requirements
- Maintain backward compatibility with existing `@Roles()` decorator

---

### Step 2.2: Create PrivilegedRoleGuard

**Status:** [ ]
**File:** `src/common/guards/privileged-role.guard.ts`
**Description:** Explicit protection for SUPER_ADMIN accounts
**Dependencies:** Step 1.2, Step 2.1
**Validation:** Only SUPER_ADMIN can access SUPER_ADMIN data

**Logic:**

- Check if target user has SUPER_ADMIN role
- If yes, require current user to also have SUPER_ADMIN role
- Throw ForbiddenException if not authorized

---

### Step 2.3: Create CompanyAdminGuard

**Status:** [ ]
**File:** `src/common/guards/company-admin.guard.ts`
**Description:** Protect company admin management with permission checks
**Dependencies:** Step 1.2
**Validation:** Company admin management requires appropriate permission

**Logic:**

- Check if operation targets a COMPANY_ADMIN
- If yes, require `MANAGE_COMPANY_ADMINS` permission
- Allow SUPER_ADMIN bypass

---

## Phase 3: Service-Level Authorization

### Step 3.1: Create Authorization Service

**Status:** [ ]
**File:** `src/auth/authorization.service.ts`
**Description:** Centralized authorization logic for reuse across services
**Dependencies:** Step 1.2
**Validation:** Service created with all required methods

**Methods:**

- `canManageUser(requester: any, targetUser: User): AuthorizationResult`
- `canViewUser(requester: any, targetUser: User): AuthorizationResult`
- `canManageCompanyAdmins(requester: any): boolean`
- `canAccessTenant(requester: any, tenantId: string): boolean`
- `filterAccessibleUsers(requester: any, users: User[]): User[]`

---

### Step 3.2: Update UsersService - findOne

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Add role-aware authorization to findOne method
**Dependencies:** Step 3.1
**Validation:** All access scenarios handled correctly

**Changes to `findOne(id, currentUser)`:**

1. Check if target user is SUPER_ADMIN → only SUPER_ADMIN can access
2. Check if target user is COMPANY_ADMIN → requires MANAGE_COMPANY_ADMINS
3. Check tenant isolation (existing logic)
4. Return appropriate authorization result

---

### Step 3.3: Update UsersService - findAll

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Filter findAll results based on user permissions
**Dependencies:** Step 3.1
**Validation:** Company admin only sees users they can manage

**Changes to `findAll(query, currentUser)`:**

- SUPER_ADMIN: sees all users
- COMPANY_ADMIN with MANAGE_COMPANY_ADMINS: sees all tenant users
- COMPANY_ADMIN without MANAGE_COMPANY_ADMINS: sees only regular users (not company admins)
- Apply tenant filter (existing logic)

---

### Step 3.4: Update UsersService - update

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Add authorization to update method
**Dependencies:** Step 3.1
**Validation:** Update blocked for unauthorized access

**Changes to `update(id, dto, currentUser)`:**

1. Check SUPER_ADMIN protection
2. Check COMPANY_ADMIN management permission
3. Prevent privilege escalation (e.g., regular user trying to add COMPANY_ADMIN role)
4. Validate tenant isolation

---

### Step 3.5: Update UsersService - remove

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Add authorization to remove (deactivate) method
**Dependencies:** Step 3.1
**Validation:** Remove blocked for unauthorized access

**Changes to `remove(id, currentUser)`:**

1. Check SUPER_ADMIN protection (cannot deactivate)
2. Check COMPANY_ADMIN management permission
3. Apply tenant isolation
4. Log deactivation attempt

---

### Step 3.6: Update UsersService - create

**Status:** [ ]
**File:** `src/users/users.service.ts`
**Description:** Validate user creation permissions
**Dependencies:** Step 3.1
**Validation:** Creation respects permission boundaries

**Changes to `create(dto, currentUser)`:**

1. Prevent creating SUPER_ADMIN users (except by SUPER_ADMIN)
2. Validate COMPANY_ADMIN creation requires MANAGE_COMPANY_ADMINS
3. Prevent privilege escalation in dto
4. Validate tenant assignment

---

## Phase 4: Controller-Level Guards

### Step 4.1: Update UsersController Endpoints

**Status:** [ ]
**File:** `src/users/users.controller.ts`
**Description:** Apply appropriate guards to controller endpoints
**Dependencies:** Phase 3 complete
**Validation:** All endpoints have correct protection

**Endpoints to update:**

- `GET /users` - Add filtering based on permissions
- `GET /users/:id` - Add PrivilegedRoleGuard for admin users
- `POST /users` - Validate creation permissions
- `PATCH /users/:id` - Add authorization checks
- `DELETE /users/:id` - Add authorization checks

---

### Step 4.2: Create Admin Management Endpoints

**Status:** [ ]
**File:** `src/users/users.controller.ts`
**Description:** Separate endpoints for company admin management
**Dependencies:** Step 4.1
**Validation:** Admin management requires MANAGE_COMPANY_ADMINS

**New endpoints:**

- `GET /users/admins` - List all company admins (requires permission)
- `GET /users/admins/:id` - Get specific admin details (requires permission)
- `POST /users/admins` - Create company admin (requires permission)

---

## Phase 5: Decorators & Enhanced Types

### Step 5.1: Create ProtectedRole Decorator

**Status:** [ ]
**File:** `src/common/decorators/protected-role.decorator.ts`
**Description:** Mark endpoints that protect privileged roles
**Dependencies:** Step 1.1
**Validation:** Decorator works with guard

**Usage:**

```typescript
@ProtectedRole()
@Patch('/users/:id')
updateUser(...)
```

---

### Step 5.2: Create RequirePermission Decorator

**Status:** [ ]
**File:** `src/common/decorators/permissions.decorator.ts`
**Description:** Enhanced permission checking decorator
**Dependencies:** None (existing file)
**Validation:** Permission checks work correctly

**Enhancements:**

- Add `anyOf` parameter (existing behavior)
- Add `allOf` parameter (new - requires all permissions)
- Add `permissionLevel` parameter for hierarchical checks

---

### Step 5.3: Create RoleAtLeast Decorator

**Status:** [ ]
**File:** `src/common/decorators/roles.decorator.ts`
**Description:** Require minimum role level
**Dependencies:** Step 1.1
**Validation:** Minimum role level enforced

**Usage:**

```typescript
@RoleAtLeast('COMPANY_ADMIN')
@Patch('/users/:id')
updateUser(...)
```

---

## Phase 6: Database & Entity Enhancements

### Step 6.1: Add Helper Methods to User Entity

**Status:** [ ]
**File:** `src/database/entities/user.entity.ts`
**Description:** Add convenience methods for role checking
**Dependencies:** Step 1.1
**Validation:** Methods work correctly

**Add methods:**

- `getRoleNames(): string[]`
- `hasRole(roleName: string): boolean`
- `hasPermission(permissionKey: string): boolean`
- `isSuperAdmin(): boolean`
- `isCompanyAdmin(): boolean`
- `getRoleLevel(): number`

---

### Step 6.2: Add Database Constraints

**Status:** [ ]
**File:** `src/database/migrations/` (create new migration)
**Description:** Add database-level constraints for data integrity
**Dependencies:** All previous steps
**Validation:** Constraints applied successfully

**Constraints to add:**

- Prevent SUPER_ADMIN users from having tenant_id (via application logic)
- Add triggers or constraints for critical validations

---

## Phase 7: Testing

### Step 7.1: Unit Tests - Authorization Utilities

**Status:** [ ]
**File:** `test/common/utils/authorization.spec.ts`
**Description:** Test authorization utility functions
**Dependencies:** Step 1.2
**Validation:** All test cases pass

**Test cases:**

- Role level comparisons
- Protected role detection
- Permission checks
- Cross-tenant scenarios

---

### Step 7.2: Unit Tests - Guards

**Status:** [ ]
**File:** `test/common/guards/`
**Description:** Test authorization guards
**Dependencies:** Phase 2
**Validation:** All guard scenarios tested

**Test files:**

- `roles.guard.spec.ts`
- `privileged-role.guard.spec.ts`
- `company-admin.guard.spec.ts`

---

### Step 7.3: Integration Tests - UsersService

**Status:** [ ]
**File:** `test/users/users.service.spec.ts`
**Description:** Test service-level authorization
**Dependencies:** Phase 3
**Validation:** All access scenarios tested

**Test scenarios:**

- SUPER_ADMIN access to all users
- Company admin access within tenant
- Cross-tenant access blocked
- Admin management permission required
- Privilege escalation prevented

---

### Step 7.4: API Tests - End-to-End

**Status:** [ ]
**File:** `test/users/users.e2e-spec.ts`
**Description:** Test full API access scenarios
**Dependencies:** Phase 4
**Validation:** All endpoints protected correctly

**Test cases:**

- Login as different role types
- Attempt unauthorized access
- Verify data isolation
- Test privilege escalation attempts

---

## Phase 8: Documentation & Cleanup

### Step 8.1: Update README

**Status:** [ ]
**File:** `README.md`
**Description:** Document new authorization system
**Dependencies:** All implementation complete
**Validation:** Documentation accurate and complete

**Sections to add:**

- Role hierarchy explanation
- Access control matrix
- New decorators and guards usage
- Migration guide

---

### Step 8.2: Code Review Checklist

**Status:** [ ]
**File:** `docs/authorization-checklist.md`
**Description:** Checklist for future authorization reviews
**Dependencies:** All implementation complete
**Validation:** Checklist comprehensive

**Items to include:**

- New endpoints must use appropriate guards
- Service methods must check authorization
- Role escalation paths must be blocked
- Tenant isolation maintained

---

### Step 8.3: Cleanup Temporary Code

**Status:** [ ]
**File:** Various
**Description:** Remove temporary hacks and comments
**Dependencies:** All implementation complete
**Validation:** Code clean and documented

**Areas to review:**

- Remove debug logging
- Clean up commented code
- Ensure all TODO comments addressed
- Verify no hardcoded values

---

## Progress Tracking

### Phase Completion

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| Phase 0 | Authentication Foundation | [ ] | | |
| Phase 0B | Token Management | [ ] | | |
| Phase 0C | Password Management | [ ] | | |
| Phase 0D | Profile Management | [ ] | | |
| Phase 0E | User Isolation | [ ] | | |
| Phase 1 | Role Hierarchy | [ ] | | |
| Phase 2 | Enhanced Guards | [ ] | | |
| Phase 3 | Service Authorization | [ ] | | |
| Phase 4 | Controller Guards | [ ] | | |
| Phase 5 | Decorators | [ ] | | |
| Phase 6 | Database | [ ] | | |
| Phase 7 | Testing | [ ] | | |
| Phase 8 | Documentation | [ ] | | |

### Step Completion

#### Phase 0: Authentication Foundation
- [ ] Step 0.1: Tenant Validation in Login
- [ ] Step 0.2: Rate Limiting on Login
- [ ] Step 0.3: Enhance Login Response
- [ ] Step 0.4: Login Attempt Tracking
- [ ] Step 0.5: Login DTO with Tenant

#### Phase 0B: Token Management
- [ ] Step 0.6: Token Refresh Mechanism
- [ ] Step 0.6: Logout & Token Revocation

#### Phase 0C: Password Management
- [ ] Step 0.7: Password Strength Validation
- [ ] Step 0.8: Password Reset Flow

#### Phase 0D: Profile Management
- [ ] Step 0.9: Profile Service
- [ ] Step 0.10: Profile DTOs
- [ ] Step 0.11: Profile Endpoints

#### Phase 0E: User Isolation
- [ ] Step 0.12: Complete User Isolation

#### Phase 1: Role Hierarchy
- [ ] Step 1.1: Role Hierarchy Constants
- [ ] Step 1.2: Authorization Utilities
- [ ] Step 1.3: JWT Strategy Update

#### Phase 2: Enhanced Guards
- [ ] Step 2.1: RolesGuard Update
- [ ] Step 2.2: PrivilegedRoleGuard
- [ ] Step 2.3: CompanyAdminGuard

#### Phase 3: Service Authorization
- [ ] Step 3.1: Authorization Service
- [ ] Step 3.2: UsersService.findOne
- [ ] Step 3.3: UsersService.findAll
- [ ] Step 3.4: UsersService.update
- [ ] Step 3.5: UsersService.remove
- [ ] Step 3.6: UsersService.create

#### Phase 4: Controller Guards
- [ ] Step 4.1: UsersController Endpoints
- [ ] Step 4.2: Admin Management Endpoints

#### Phase 5: Decorators
- [ ] Step 5.1: ProtectedRole Decorator
- [ ] Step 5.2: RequirePermission Decorator
- [ ] Step 5.3: RoleAtLeast Decorator

#### Phase 6: Database
- [ ] Step 6.1: User Entity Methods
- [ ] Step 6.2: User Tracking Columns
- [ ] Step 6.3: RefreshToken Entity

#### Phase 7: Testing
- [ ] Step 7.1: Unit Tests - Authentication
- [ ] Step 7.2: Unit Tests - Utilities
- [ ] Step 7.3: Unit Tests - Guards
- [ ] Step 7.4: Integration Tests
- [ ] Step 7.5: API Tests

#### Phase 8: Documentation
- [ ] Step 8.1: Update README
- [ ] Step 8.2: API Documentation
- [ ] Step 8.3: Code Review Checklist

---

## Access Control Matrix (Reference)

| Operation            | SUPER_ADMIN | COMPANY_ADMIN (with MANAGE_COMPANY_ADMINS) | COMPANY_ADMIN (without) | CLIENT |
| -------------------- | ----------- | ------------------------------------------ | ----------------------- | ------ |
| View SUPER_ADMIN     | ✅          | ❌                                         | ❌                      | ❌     |
| View COMPANY_ADMIN   | ✅          | ✅ (same tenant)                           | ❌                      | ❌     |
| View Regular User    | ✅          | ✅ (same tenant)                           | ✅ (same tenant)        | ❌     |
| Create SUPER_ADMIN   | ✅          | ❌                                         | ❌                      | ❌     |
| Create COMPANY_ADMIN | ✅          | ✅ (same tenant)                           | ❌                      | ❌     |
| Create Regular User  | ✅          | ✅ (same tenant)                           | ✅ (same tenant)        | ❌     |
| Update SUPER_ADMIN   | ✅          | ❌                                         | ❌                      | ❌     |
| Update COMPANY_ADMIN | ✅          | ✅ (same tenant)                           | ❌                      | ❌     |
| Update Regular User  | ✅          | ✅ (same tenant)                           | ✅ (same tenant)        | ❌     |
| Delete SUPER_ADMIN   | ❌          | ❌                                         | ❌                      | ❌     |
| Delete COMPANY_ADMIN | ✅          | ✅ (same tenant)                           | ❌                      | ❌     |
| Delete Regular User  | ✅          | ✅ (same tenant)                           | ✅ (same tenant)        | ❌     |

---

## Notes

### Key Design Principles

1. **Explicit over implicit** - All authorization checks should be intentional
2. **Defense in depth** - Multiple layers of protection
3. **Fail secure** - Default to denied access
4. **Centralized logic** - Authorization service for consistency
5. **Testable** - Every authorization rule must be testable

### Backward Compatibility

- Existing `@Roles()` decorator continues to work
- Existing `@Permissions()` decorator continues to work
- Tenant isolation remains in place
- No breaking changes to API contracts

### Performance Considerations

- Role level included in JWT to avoid database lookups
- Authorization checks are lightweight comparisons
- Caching of permission checks where appropriate

---

## Commands to Run

### After completing all steps:

```bash
# Run tests
npm test

# Run specific test file
npm test -- test/common/utils/authorization.spec.ts

# Run e2e tests
npm run test:e2e

# Lint code
npm run lint

# Type check
npm run typecheck
```

---

**Plan Version:** 1.0
**Created:** 2026-01-22
**Last Updated:** 2026-01-22
