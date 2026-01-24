# Tenant-Scoped Username Uniqueness

## Problem Statement

Currently, the `users` table has a **global unique constraint** on `username`:

```typescript
// user.entity.ts line 20
@Column({ unique: true, length: 255 })
username: string;
```

This means:
- User `john.doe` in **Tenant A** blocks `john.doe` from being created in **Tenant B**
- This is problematic for multi-tenant SaaS where each tenant should have isolated user namespaces

### Desired Behavior

| Scenario | Current | Desired |
|----------|---------|---------|
| `john.doe` in Tenant A, `john.doe` in Tenant B | ❌ Blocked | ✅ Allowed |
| `john.doe` twice in Tenant A | ❌ Blocked | ❌ Blocked |
| `john.doe` with `tenantId: null` (Super Admin) | ✅ Globally unique | ✅ Globally unique |

---

## Proposed Solution

### Option 1: Composite Unique Constraint (Recommended)

Replace the global unique constraint with a **composite unique index** on `(username, tenant_id)`.

#### [MODIFY] [user.entity.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/database/entities/user.entity.ts)

```typescript
import { Entity, Index, ... } from 'typeorm';

@Entity('users')
@Index('IDX_users_username_tenant', ['username', 'tenantId'], { unique: true })
export class User {
  // Remove unique: true from username column
  @Column({ length: 255 })
  username: string;

  // ... rest unchanged
}
```

> [!WARNING]
> **PostgreSQL NULL handling**: In PostgreSQL, `(username, NULL)` and `(username, NULL)` are considered **different** due to how NULL works in unique constraints. This means two super admins could have the same username, which may or may not be desired.

#### Handling NULL tenantId (Super Admins)

For global users (Super Admins with `tenantId: null`), we have two options:

**Option A: Partial Unique Index** (PostgreSQL-specific)
```sql
-- Separate index for global users
CREATE UNIQUE INDEX IDX_users_username_global ON users (username) WHERE tenant_id IS NULL;
```

**Option B: Application-level validation** (Database-agnostic)
```typescript
// In users.service.ts
const existingUser = await this.userRepository.findOne({
  where: tenantId 
    ? { username, tenantId }
    : { username, tenantId: IsNull() }
});
```

---

### Database Migration Required

#### [NEW] Migration to update unique constraint

```typescript
// src/database/migrations/XXXXXX-tenant-scoped-username.ts
export class TenantScopedUsername implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing global unique constraint
    await queryRunner.dropIndex('users', 'IDX_users_username');
    
    // Add composite unique index
    await queryRunner.createIndex('users', new TableIndex({
      name: 'IDX_users_username_tenant',
      columnNames: ['username', 'tenant_id'],
      isUnique: true,
    }));
    
    // For global users (NULL tenant_id), add partial index (PostgreSQL)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_username_global" 
      ON "users" ("username") 
      WHERE "tenant_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_username_global"');
    await queryRunner.dropIndex('users', 'IDX_users_username_tenant');
    await queryRunner.createIndex('users', new TableIndex({
      name: 'IDX_users_username',
      columnNames: ['username'],
      isUnique: true,
    }));
  }
}
```

---

## Code Changes Required

### 1. User Entity

#### [MODIFY] [user.entity.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/database/entities/user.entity.ts)

```diff
+@Index('IDX_users_username_tenant', ['username', 'tenantId'], { unique: true })
 @Entity('users')
 export class User {
-  @Column({ unique: true, length: 255 })
+  @Column({ length: 255 })
   username: string;
```

---

### 2. Users Service - Create User

#### [MODIFY] [users.service.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/users/users.service.ts)

Update the duplicate check to be tenant-scoped:

```typescript
async create(createUserDto: CreateUserDto, currentUser: any) {
  const targetTenantId = createUserDto.tenantId || currentUser.tenantId;
  
  // Check uniqueness within the same tenant
  const existingUser = await this.userRepository.findOne({
    where: targetTenantId
      ? { username: createUserDto.username, tenantId: targetTenantId }
      : { username: createUserDto.username, tenantId: IsNull() },
  });

  if (existingUser) {
    throw new ConflictException('Username already exists in this tenant');
  }
  
  // ... rest of create logic
}
```

---

### 3. Profile Service - Update Username

#### [MODIFY] [profile.service.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/users/profile.service.ts)

Update username uniqueness check to be tenant-scoped:

```typescript
if (dto.username && dto.username !== user.username) {
  const existingUser = await this.userRepository.findOne({
    where: user.tenantId
      ? { username: dto.username, tenantId: user.tenantId }
      : { username: dto.username, tenantId: IsNull() },
  });

  if (existingUser) {
    throw new ConflictException('Username already taken in this tenant');
  }
  
  user.username = dto.username;
}
```

---

### 4. Auth Service - Login

The current login logic already handles tenant-scoped user lookup correctly:

```typescript
// auth.service.ts lines 39-45 - Already correct!
const userWhere: any = { username: loginDto.username };
if (loginDto.tenantId) {
  userWhere.tenantId = loginDto.tenantId;
} else {
  userWhere.tenantId = IsNull();
}
```

No changes needed here.

---

## Login Identifier Options

### Option A: Username (Current)

Users login with `username` + `password`. Tenant determined by URL (slug/domain).

**Pros**: Simple, familiar  
**Cons**: Username might not be memorable across tenants

### Option B: Email-based Login

Change login identifier from `username` to `email`.

```typescript
// login.dto.ts
@IsEmail()
email: string;

// auth.service.ts
const userWhere = { email: loginDto.email, tenantId: resolvedTenantId };
```

**Pros**: Email is familiar, users remember it  
**Cons**: Email also needs tenant-scoped uniqueness (same person could be in multiple tenants with same email)

### Option C: Support Both (Recommended)

Allow login with either `username` OR `email`:

```typescript
// login.dto.ts
@IsString()
@IsNotEmpty()
identifier: string; // Can be username or email

// auth.service.ts
const userWhere = resolvedTenantId
  ? [
      { username: loginDto.identifier, tenantId: resolvedTenantId },
      { email: loginDto.identifier, tenantId: resolvedTenantId },
    ]
  : [
      { username: loginDto.identifier, tenantId: IsNull() },
      { email: loginDto.identifier, tenantId: IsNull() },
    ];

const user = await this.userRepository.findOne({ where: userWhere });
```

---

## Security Considerations

### 1. Username Enumeration

**Risk**: Attacker could determine if a username exists in a tenant via error messages.

**Mitigation**: Use generic error message:
```typescript
throw new UnauthorizedException('Invalid credentials');
// NOT: 'Username not found in this tenant'
```

### 2. Cross-Tenant Username Collision Attack

**Risk**: Attacker creates common usernames (admin, user, john) in their tenant hoping target tenant users will accidentally login to wrong tenant.

**Mitigation**: 
- Tenant is determined by URL, not user input
- Users can't accidentally login to wrong tenant
- Display tenant name on login page before submission

---

## Implementation Order

### Phase 1: Database Changes
1. [ ] Create migration for composite unique index
2. [ ] Update user entity to use composite index
3. [ ] Test migration up/down

### Phase 2: Application Changes
4. [ ] Update `users.service.ts` create method with tenant-scoped check
5. [ ] Update `profile.service.ts` username change with tenant-scoped check
6. [ ] Verify auth service already handles tenant-scoped lookup

### Phase 3: Verification
7. [ ] Test creating same username in different tenants
8. [ ] Test creating duplicate username in same tenant (should fail)
9. [ ] Test super admin username uniqueness (global)
10. [ ] Test login with tenant-scoped users

---

## Verification Plan

### Manual Testing

#### 1. Same Username in Different Tenants
```bash
# Create user in Tenant A
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <company_admin_a_token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "john.doe", "password": "password123"}'
# Expect: 201 Created

# Create same username in Tenant B
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <company_admin_b_token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "john.doe", "password": "password123"}'
# Expect: 201 Created (DIFFERENT from current behavior)
```

#### 2. Duplicate Username in Same Tenant
```bash
# Create user in Tenant A
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <company_admin_a_token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "jane.doe", "password": "password123"}'
# Expect: 201 Created

# Try same username again in Tenant A
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <company_admin_a_token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "jane.doe", "password": "password123"}'
# Expect: 409 Conflict "Username already exists in this tenant"
```

#### 3. Login Isolation
```bash
# Login john.doe via Tenant A's subdomain
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john.doe", "password": "passwordA", "tenantSlug": "tenant-a"}'
# Expect: 200 with Tenant A's john.doe token

# Login john.doe via Tenant B's subdomain
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john.doe", "password": "passwordB", "tenantSlug": "tenant-b"}'
# Expect: 200 with Tenant B's john.doe token (DIFFERENT user)
```

---

## Open Questions

> [!IMPORTANT]
> Please confirm your preference:

1. **Email requirement**: Should `email` be required for users, or remain optional?
2. **Login identifier**: Username only, email only, or support both?
3. **Super Admin usernames**: Should they be globally unique (separate from tenants)?
