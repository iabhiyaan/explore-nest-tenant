# Seed Data Implementation Plan

## Overview

### What This Plan Tries to Solve

This plan implements comprehensive seed data for the database to support realistic testing scenarios, development workflows, and demo environments. It follows the existing pattern in `src/database/seed.ts` and populates the database with:

- Multiple tenants (companies)
- Multiple users per tenant with different roles
- Proper user profile data (firstName, lastName, email, etc.)
- Cross-tenant scenarios for testing isolation

### Seed Data Structure

#### Pattern Used

This plan follows the existing seed.ts pattern:
1. Connect to database
2. Create tables (if not exist)
3. Seed permissions
4. Seed roles
5. Seed tenants
6. Seed role-permissions
7. Seed users with profile data
8. Seed user-roles

---

## Phase 1: Database Schema Updates

### Step 1.1: Add New Columns to Users Table

**Status:** [ ]
**File:** `src/database/seed.ts`
**Description:** Update CREATE TABLE statement to include new profile columns
**Dependencies:** None
**Validation:** Table creation includes all required columns

**Add to users table creation:**
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tenant_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  last_login_at TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  password_changed_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
)
```

**Note:** For TypeORM entities, columns are already added to `src/database/entities/user.entity.ts`

---

## Phase 2: Seed Data Definition

### Step 2.1: Define Tenant Data

**Status:** [ ]
**File:** `src/database/seed.ts`
**Description:** Define multiple tenants with realistic company names
**Dependencies:** None
**Validation:** Multiple tenants created with proper structure

**Tenant Data:**
```typescript
const tenants = [
  {
    name: 'Acme Corporation',
    description: 'Primary demo company',
    domain: 'acme.com',
  },
  {
    name: 'TechCorp Solutions',
    description: 'Secondary demo company',
    domain: 'techcorp.com',
  },
  {
    name: 'Global Industries',
    description: 'Enterprise customer',
    domain: 'globalindustries.com',
  },
];
```

---

### Step 2.2: Define User Data Structure

**Status:** [ ]
**File:** `src/database/seed.ts`
**Description:** Define user data with all profile fields
**Dependencies:** Step 2.1
**Validation:** User data includes all required profile fields

**User Data Structure:**
```typescript
interface SeedUser {
  username: string;
  password: string;
  roleName: string;
  tenantName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}
```

---

### Step 2.3: Define Realistic User Data

**Status:** [ ]
**File:** `src/database/seed.ts`
**Description:** Populate seed data with realistic user information
**Dependencies:** Step 2.2
**Validation:** User data is realistic and varied

#### Tenant 1: Acme Corporation

**Super Admin (Global)**
| Field | Value |
|-------|-------|
| username | `superadmin` |
| password | `Admin@123` |
| role | SUPER_ADMIN |
| tenant | None (global) |
| firstName | System |
| lastName | Administrator |
| email | admin@system.com |

**Company Admins**
| username | password | firstName | lastName | email |
|----------|----------|-----------|----------|-------|
| `admin.smith` | `Admin@123` | John | Smith | john.smith@acme.com |
| `admin.jones` | `Admin@123` | Sarah | Jones | sarah.jones@acme.com |

**Regular Users**
| username | password | firstName | lastName | email | department |
|----------|----------|-----------|----------|-------|------------|
| `user.alice` | `User@123` | Alice | Johnson | alice.johnson@acme.com | Engineering |
| `user.bob` | `User@123` | Bob | Williams | bob.williams@acme.com | Engineering |
| `user.carol` | `User@123` | Carol | Davis | carol.davis@acme.com | Marketing |
| `user.david` | `User@123` | David | Miller | david.miller@acme.com | Sales |
| `user.emma` | `User@123` | Emma | Wilson | emma.wilson@acme.com | HR |
| `user.frank` | `User@123` | Frank | Moore | frank.moore@acme.com | Engineering |
| `user.grace` | `User@123` | Grace | Taylor | grace.taylor@acme.com | Finance |
| `user.henry` | `User@123` | Henry | Anderson | henry.anderson@acme.com | Operations |

#### Tenant 2: TechCorp Solutions

**Company Admin**
| username | password | firstName | lastName | email |
|----------|----------|-----------|----------|-------|
| `admin.chen` | `Admin@123` | Michael | Chen | michael.chen@techcorp.com |

**Regular Users**
| username | password | firstName | lastName | email | department |
|----------|----------|-----------|----------|-------|------------|
| `user.lisa` | `User@123` | Lisa | Wang | lisa.wang@techcorp.com | Engineering |
| `user.kevin` | `User@123` | Kevin | Brown | kevin.brown@techcorp.com | Product |
| `user.maria` | `User@123` | Maria | Garcia | maria.garcia@techcorp.com | Design |
| `user.james` | `User@123` | James | Martinez | james.martinez@techcorp.com | Engineering |
| `user.patricia` | `User@123` | Patricia | Lee | patricia.lee@techcorp.com | QA |

#### Tenant 3: Global Industries

**Company Admin**
| username | password | firstName | lastName | email |
|----------|----------|-----------|----------|-------|
| `admin.patel` | `Admin@123` | Raj | Patel | raj.patel@globalindustries.com |

**Regular Users**
| username | password | firstName | lastName | email | department |
|----------|----------|-----------|----------|-------|------------|
| `user.thomas` | `User@123` | Thomas | Johnson | thomas.johnson@globalindustries.com | IT |
| `user.jennifer` | `User@123` | Jennifer | White | jennifer.white@globalindustries.com | Security |
| `user.robert` | `User@123` | Robert | Harris | robert.harris@globalindustries.com | Operations |
| `user.amanda` | `User@123` | Amanda | Clark | amanda.clark@globalindustries.com | Compliance |

---

## Phase 3: Implementation

### Step 3.1: Update Seed Function

**Status:** [ ]
**File:** `src/database/seed.ts`
**Description:** Update seed function to include new user data
**Dependencies:** Phase 2 complete
**Validation:** Seed function creates all defined users

**Implementation Pattern:**
```typescript
async function seed() {
  console.log('🌱 Starting database seed...');

  await dataSource.initialize();
  console.log('✅ Database connected');

  await createTables();

  // Seed permissions (existing)
  const permissions = [/* ... */];
  for (const perm of permissions) {
    await dataSource.query(
      `INSERT INTO permissions (key, description) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [perm.key, perm.description],
    );
  }

  // Seed roles (existing)
  const roles = [/* ... */];
  for (const role of roles) {
    await dataSource.query(
      `INSERT INTO roles (name, tenant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [role.name, role.tenant_id],
    );
  }

  // Seed tenants (NEW)
  const tenants = [
    { name: 'Acme Corporation', domain: 'acme.com' },
    { name: 'TechCorp Solutions', domain: 'techcorp.com' },
    { name: 'Global Industries', domain: 'globalindustries.com' },
  ];

  for (const tenant of tenants) {
    await dataSource.query(
      `INSERT INTO tenants (name, domain, is_active) VALUES ($1, $2, true) ON CONFLICT DO NOTHING`,
      [tenant.name, tenant.domain],
    );
  }

  // Get tenant IDs (NEW)
  const tenantMap: Record<string, string> = {};
  const tenantResult = await dataSource.query(`SELECT id, name FROM tenants`);
  tenantResult.forEach((t: any) => {
    tenantMap[t.name] = t.id;
  });

  // Seed role-permissions (existing)
  const rolePerms = [/* ... */];
  for (const rp of rolePerms) {
    await dataSource.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [rp.roleId, rp.permissionId],
    );
  }

  // Seed users (ENHANCED)
  const users = [
    // Super Admin
    {
      username: 'superadmin',
      password: 'Admin@123',
      roleName: 'SUPER_ADMIN',
      tenantId: null,
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@system.com',
    },
    // Acme Corporation Users
    {
      username: 'admin.smith',
      password: 'Admin@123',
      roleName: 'COMPANY_ADMIN',
      tenantName: 'Acme Corporation',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@acme.com',
    },
    // ... more users
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const tenantId = user.tenantId || tenantMap[user.tenantName];

    await dataSource.query(
      `INSERT INTO users (
        username, password_hash, tenant_id, is_active,
        first_name, last_name, email, phone,
        password_changed_at
      ) VALUES ($1, $2, $3, true, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        updated_at = NOW()`,
      [
        user.username,
        passwordHash,
        tenantId,
        user.firstName,
        user.lastName,
        user.email,
        user.phone || null,
      ],
    );

    // Assign role
    const userRows = await dataSource.query(
      `SELECT id FROM users WHERE username = $1 LIMIT 1`,
      [user.username],
    );

    if (userRows[0]) {
      const roleRows = await dataSource.query(
        `SELECT id FROM roles WHERE name = $1 AND (tenant_id IS NULL OR tenant_id = $2) LIMIT 1`,
        [user.roleName, tenantId],
      );

      if (roleRows[0]) {
        await dataSource.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userRows[0].id, roleRows[0].id],
        );
      }
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('Default users:');
  console.log('  superadmin / Admin@123 (SUPER_ADMIN - global)');
  console.log('  admin.smith / Admin@123 (COMPANY_ADMIN - Acme Corp)');
  console.log('  ...');
  console.log('');
  console.log('Tenants created:');
  tenants.forEach(t => console.log(`  - ${t.name}`));

  await dataSource.destroy();
}
```

---

### Step 3.2: Create Helper Functions

**Status:** [ ]
**File:** `src/database/seed.ts`
**Description:** Create helper functions to reduce code duplication
**Dependencies:** Step 3.1
**Validation:** Helper functions work correctly

**Helper functions:**
```typescript
async function seedUser(
  dataSource: DataSource,
  user: SeedUser,
  tenantMap: Record<string, string>,
  roleMap: Record<string, number>,
): Promise<void> {
  const passwordHash = await bcrypt.hash(user.password, 10);
  const tenantId = user.tenantId || tenantMap[user.tenantName];

  await dataSource.query(
    `INSERT INTO users (
      username, password_hash, tenant_id, is_active,
      first_name, last_name, email, phone,
      password_changed_at
    ) VALUES ($1, $2, $3, true, $4, $5, $6, $7, NOW())
    ON CONFLICT (username) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      updated_at = NOW()`,
    [user.username, passwordHash, tenantId, user.firstName, user.lastName, user.email, user.phone || null],
  );

  const userRows = await dataSource.query(
    `SELECT id FROM users WHERE username = $1 LIMIT 1`,
    [user.username],
  );

  if (userRows[0] && roleMap[user.roleName]) {
    await dataSource.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userRows[0].id, roleMap[user.roleName]],
    );
  }
}
```

---

## Phase 4: Testing Data

### Step 4.1: Create Test Data Scenarios

**Status:** [ ]
**File:** `src/database/seed.ts`
**Description:** Add data for testing specific scenarios
**Dependencies:** Phase 3 complete
**Validation:** Test scenarios can be reproduced

**Test Scenarios:**

#### Scenario 1: Cross-Tenant Access Attempt
- User from Acme Corp tries to access TechCorp data (should fail)
- User: `user.alice` from Acme Corp
- Target: `user.lisa` from TechCorp

#### Scenario 2: Role Escalation Attempt
- Regular user tries to add COMPANY_ADMIN role (should be blocked)
- User: `user.bob` tries to escalate

#### Scenario 3: Deactivated Tenant
- Create deactivated tenant for testing login blocking
- Tenant: "Inactive Corp" (is_active = false)

#### Scenario 4: Locked Account
- Simulate locked account after failed login attempts
- User: `user.david` with login_attempts > 5

---

## Phase 5: Documentation

### Step 5.1: Document Seed Data

**Status:** [ ]
**File:** `src/database/seed.ts`
**Description:** Add comments documenting seed data structure
**Dependencies:** Phase 3 complete
**Validation:** Documentation is clear and helpful

**Add header comment:**
```typescript
/**
 * Database Seed Script
 *
 * This script populates the database with initial data for development,
 * testing, and demonstration purposes.
 *
 * Seed Data Structure:
 * - 3 Tenants: Acme Corporation, TechCorp Solutions, Global Industries
 * - 1 Super Admin (global, no tenant)
 * - 4 Company Admins (one per tenant, plus additional for Acme Corp)
 * - 18 Regular Users (distributed across tenants)
 *
 * Password Convention:
 * - Admin accounts: Admin@123
 * - User accounts: User@123
 *
 * For testing, use:
 * - Login as: username / password
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
// ...
```

---

## Progress Tracking

### Phase Completion

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: Schema Updates | [ ] | | |
| Phase 2: Data Definition | [ ] | | |
| Phase 3: Implementation | [ ] | | |
| Phase 4: Test Data | [ ] | | |
| Phase 5: Documentation | [ ] | | |

### Step Completion

#### Phase 1: Schema Updates
- [ ] Step 1.1: Add New Columns to Users Table

#### Phase 2: Data Definition
- [ ] Step 2.1: Define Tenant Data
- [ ] Step 2.2: Define User Data Structure
- [ ] Step 2.3: Define Realistic User Data

#### Phase 3: Implementation
- [ ] Step 3.1: Update Seed Function
- [ ] Step 3.2: Create Helper Functions

#### Phase 4: Testing Data
- [ ] Step 4.1: Create Test Data Scenarios

#### Phase 5: Documentation
- [ ] Step 5.1: Document Seed Data

---

## Seed Data Summary

### Users Overview

| Role | Count | Password | Purpose |
|------|-------|----------|---------|
| SUPER_ADMIN | 1 | Admin@123 | System administration |
| COMPANY_ADMIN | 4 | Admin@123 | Tenant administration |
| CLIENT | 18 | User@123 | Regular users |

### Users by Tenant

| Tenant | Admins | Users | Total |
|--------|--------|-------|-------|
| Global (No Tenant) | 1 | 0 | 1 |
| Acme Corporation | 2 | 8 | 10 |
| TechCorp Solutions | 1 | 5 | 6 |
| Global Industries | 1 | 4 | 5 |
| **Total** | **5** | **17** | **22** |

### Profile Data Included

| Field | Included | Example |
|-------|----------|---------|
| username | ✅ | `user.alice` |
| firstName | ✅ | `Alice` |
| lastName | ✅ | `Johnson` |
| email | ✅ | `alice.johnson@acme.com` |
| phone | ✅ (optional) | `+1-555-0123` |
| tenantId | ✅ | UUID reference |
| isActive | ✅ | `true` |
| passwordChangedAt | ✅ | `NOW()` |

---

## Commands to Run

### Run Seed
```bash
# Run database seed
npm run seed:db

# Or directly with ts-node
npx ts-node src/database/seed.ts
```

### Verify Seed
```bash
# Check users
psql -d cloud_sansar -c "SELECT id, username, tenant_id, is_active FROM users;"

# Check tenants
psql -d cloud_sansar -c "SELECT id, name, is_active FROM tenants;"

# Check user roles
psql -d cloud_sansar -c "SELECT u.username, r.name as role FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id;"
```

---

## Security Notes

### Password Policy for Seed Data

- **Admin accounts:** `Admin@123` (meets complexity requirements)
- **User accounts:** `User@123` (meets complexity requirements)

**For production, these should be changed:**
- Use environment variables for default passwords
- Require password change on first login
- Use strong, unique passwords per environment

### Seed Data Access

- Seed data is for development/testing only
- Never use in production without changing defaults
- Consider using data masking for sensitive fields in non-production environments

---

**Plan Version:** 1.0
**Created:** 2026-01-22
**Last Updated:** 2026-01-22
