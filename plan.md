# Multi-Tenant SaaS Backend - Rebuild Plan

## Application Overview

**Type**: Multi-tenant SaaS Backend API
**Framework**: NestJS (Node.js)
**Database**: PostgreSQL 14+
**ORM**: TypeORM
**Authentication**: JWT (JSON Web Tokens)
**Authorization**: RBAC (Role-Based Access Control) + PBAC (Permission-Based Access Control)

---

## Current State Assessment

### ✅ Already Developed

**Core Infrastructure**:

- NestJS project structure with proper modules
- TypeORM entities for all core tables
- JWT authentication with Passport strategies
- Role and permission guards
- Tenant isolation via guards and interceptors
- Swagger API documentation setup
- Database seeding script

**Modules**:

- Auth module (login, profile)
- Users module (CRUD with tenant scoping)
- Tenants module (CRUP for super admin)
- Company Admin Management module

### ⚠️ Issues to Fix (Why code needs rebuilding)

1. **Seed File Path Issue**: Seed imports from `__dirname + '/entities/*.entity{.ts,.js}'` but entities are in `src/database/entities/`
2. **Migration Scripts**: Placed in `src/database/migrations/` but importing from wrong paths
3. **Console Logging**: Guard files have excessive `console.log` statements for debugging
4. **Error Handling**: Using `throw new Error()` instead of proper NestJS exceptions
5. **Soft Delete**: Only implemented for users, not consistent across entities
6. **Role-Permission Mapping**: COMPANY_ADMIN and CLIENT roles look for tenant-specific roles but base roles are global (tenant_id: null)
7. **Tenant Scoping**: Role scoping logic is incomplete - COMPANY_ADMIN should have own tenant-scoped role
8. **No Validation**: Some DTOs lack proper class-validator decorators
9. **Password Handling**: Password field in DTOs should be excluded from responses
10. **No Pagination**: List endpoints don't support pagination
11. **No Audit Trail**: No created_by, updated_by fields
12. **Module Structure**: Some modules lack proper exports for cross-module functionality

---

## Database Schema (Tables)

### 1. `users` Table

| Column        | Type         | Constraints      | Description            |
| ------------- | ------------ | ---------------- | ---------------------- |
| id            | UUID         | PK               | Primary key            |
| username      | VARCHAR(255) | UNIQUE, NOT NULL | Login username         |
| password_hash | VARCHAR(255) | NOT NULL         | BCrypt hashed password |
| tenant_id     | UUID         | FK → tenants.id  | NULL for SUPER_ADMIN   |
| is_active     | BOOLEAN      | DEFAULT TRUE     | Soft delete flag       |
| created_at    | TIMESTAMP    | DEFAULT NOW()    | Creation timestamp     |

**Relationships**:

- Many-to-One with `tenants` (optional)
- One-to-Many with `user_roles`

### 2. `tenants` Table

| Column     | Type         | Constraints   | Description               |
| ---------- | ------------ | ------------- | ------------------------- |
| id         | UUID         | PK            | Primary key               |
| name       | VARCHAR(255) | NOT NULL      | Company/organization name |
| is_active  | BOOLEAN      | DEFAULT TRUE  | Soft delete flag          |
| created_at | TIMESTAMP    | DEFAULT NOW() | Creation timestamp        |

**Relationships**:

- One-to-Many with `users`
- One-to-Many with `roles` (tenant-specific roles)

### 3. `roles` Table

| Column    | Type        | Constraints               | Description                                    |
| --------- | ----------- | ------------------------- | ---------------------------------------------- |
| id        | SERIAL      | PK                        | Primary key                                    |
| name      | VARCHAR(50) | UNIQUE (global), NOT NULL | Role name (SUPER_ADMIN, COMPANY_ADMIN, CLIENT) |
| tenant_id | UUID        | FK → tenants.id           | NULL for global roles                          |

**Relationships**:

- Many-to-One with `tenants` (optional)
- One-to-Many with `role_permissions`
- One-to-Many with `user_roles`

### 4. `permissions` Table

| Column      | Type         | Constraints      | Description                                |
| ----------- | ------------ | ---------------- | ------------------------------------------ |
| id          | SERIAL       | PK               | Primary key                                |
| key         | VARCHAR(100) | UNIQUE, NOT NULL | Permission identifier (e.g., MANAGE_USERS) |
| description | VARCHAR(255) | NOT NULL         | Human-readable description                 |

**Relationships**:

- One-to-Many with `role_permissions`

### 5. `role_permissions` Table (Junction)

| Column        | Type   | Constraints                   | Description             |
| ------------- | ------ | ----------------------------- | ----------------------- |
| id            | SERIAL | PK                            | Primary key             |
| role_id       | INT    | FK → roles.id, NOT NULL       | Reference to role       |
| permission_id | INT    | FK → permissions.id, NOT NULL | Reference to permission |

**Constraints**:

- Unique on (role_id, permission_id)

**Relationships**:

- Many-to-One with `roles`
- Many-to-One with `permissions`

### 6. `user_roles` Table (Junction)

| Column  | Type   | Constraints             | Description       |
| ------- | ------ | ----------------------- | ----------------- |
| id      | SERIAL | PK                      | Primary key       |
| user_id | UUID   | FK → users.id, NOT NULL | Reference to user |
| role_id | INT    | FK → roles.id, NOT NULL | Reference to role |

**Constraints**:

- Unique on (user_id, role_id)

**Relationships**:

- Many-to-One with `users`
- Many-to-One with `roles`

---

## API Routes

### Authentication (`/auth`)

| Method | Endpoint        | Auth | Roles | Permissions | Description                  |
| ------ | --------------- | ---- | ----- | ----------- | ---------------------------- |
| POST   | `/auth/login`   | ❌   | -     | -           | Login with username/password |
| GET    | `/auth/profile` | JWT  | All   | -           | Get current user profile     |

### Tenants (`/tenants`) - Super Admin Only

| Method | Endpoint       | Auth | Roles       | Permissions      | Description        |
| ------ | -------------- | ---- | ----------- | ---------------- | ------------------ |
| POST   | `/tenants`     | JWT  | SUPER_ADMIN | MANAGE_COMPANIES | Create new tenant  |
| GET    | `/tenants`     | JWT  | SUPER_ADMIN | VIEW_COMPANIES   | List all tenants   |
| GET    | `/tenants/:id` | JWT  | SUPER_ADMIN | VIEW_COMPANIES   | Get tenant by ID   |
| PATCH  | `/tenants/:id` | JWT  | SUPER_ADMIN | MANAGE_COMPANIES | Update tenant      |
| DELETE | `/tenants/:id` | JWT  | SUPER_ADMIN | MANAGE_COMPANIES | Soft delete tenant |

### Users (`/users`) - Tenant Scoped

| Method | Endpoint     | Auth | Roles                      | Permissions  | Description             |
| ------ | ------------ | ---- | -------------------------- | ------------ | ----------------------- |
| POST   | `/users`     | JWT  | SUPER_ADMIN, COMPANY_ADMIN | MANAGE_USERS | Create new user         |
| GET    | `/users`     | JWT  | SUPER_ADMIN, COMPANY_ADMIN | VIEW_USERS   | List users (own tenant) |
| GET    | `/users/:id` | JWT  | SUPER_ADMIN, COMPANY_ADMIN | VIEW_USERS   | Get user by ID          |
| PATCH  | `/users/:id` | JWT  | SUPER_ADMIN, COMPANY_ADMIN | MANAGE_USERS | Update user             |
| DELETE | `/users/:id` | JWT  | SUPER_ADMIN, COMPANY_ADMIN | MANAGE_USERS | Soft delete user        |

### Company Admin Management (`/company-admin-management`) - Super Admin Only

| Method | Endpoint                              | Auth | Roles       | Permissions           | Description                   |
| ------ | ------------------------------------- | ---- | ----------- | --------------------- | ----------------------------- |
| POST   | `/company-admin-management`           | JWT  | SUPER_ADMIN | MANAGE_COMPANY_ADMINS | Create company admin          |
| GET    | `/company-admin-management/:tenantId` | JWT  | SUPER_ADMIN | VIEW_COMPANY_ADMINS   | Get company admins for tenant |

---

## Dependencies (package.json)

### Core Dependencies

| Package                  | Version | Purpose                  |
| ------------------------ | ------- | ------------------------ |
| @nestjs/common           | ^11.0.1 | NestJS core utilities    |
| @nestjs/core             | ^11.0.1 | NestJS core framework    |
| @nestjs/platform-express | ^11.0.1 | Express adapter          |
| @nestjs/typeorm          | ^11.0.0 | TypeORM integration      |
| @nestjs/config           | ^4.0.2  | Configuration management |
| @nestjs/jwt              | ^11.0.2 | JWT module               |
| @nestjs/passport         | ^11.0.5 | Passport integration     |
| @nestjs/swagger          | ^11.2.5 | API documentation        |

### Database & Auth

| Package        | Version | Purpose                          |
| -------------- | ------- | -------------------------------- |
| typeorm        | ^0.3.28 | ORM for PostgreSQL               |
| pg             | ^8.17.1 | PostgreSQL driver                |
| bcrypt         | ^6.0.0  | Password hashing                 |
| passport       | ^0.7.0  | Authentication middleware        |
| passport-jwt   | ^4.0.1  | JWT strategy                     |
| passport-local | ^1.0.0  | Local username/password strategy |

### Validation & Utilities

| Package           | Version | Purpose            |
| ----------------- | ------- | ------------------ |
| class-validator   | ^0.14.3 | DTO validation     |
| class-transformer | ^0.5.1  | DTO transformation |
| uuid              | ^13.0.0 | UUID generation    |

### Dev Dependencies

| Package            | Version | Purpose              |
| ------------------ | ------- | -------------------- |
| @nestjs/cli        | ^11.0.0 | NestJS CLI           |
| @nestjs/schematics | ^11.0.0 | Code generation      |
| @nestjs/testing    | ^11.0.1 | Unit testing         |
| typescript         | ^5.7.3  | TypeScript compiler  |
| ts-node            | ^10.9.2 | TypeScript execution |
| jest               | ^30.0.0 | Testing framework    |
| ts-jest            | ^29.2.5 | Jest + TypeScript    |
| eslint             | ^9.18.0 | Linting              |
| prettier           | ^3.4.2  | Code formatting      |

---

## Seed Data Structure

### 1. Permissions (10 total)

| Key                   | Description                  |
| --------------------- | ---------------------------- |
| MANAGE_COMPANIES      | Can manage companies/tenants |
| VIEW_COMPANIES        | Can view companies/tenants   |
| MANAGE_USERS          | Can manage users             |
| VIEW_USERS            | Can view users               |
| MANAGE_COMPANY_ADMINS | Can manage company admins    |
| VIEW_COMPANY_ADMINS   | Can view company admins      |
| MANAGE_ROLES          | Can manage roles             |
| VIEW_ROLES            | Can view roles               |
| MANAGE_PERMISSIONS    | Can manage permissions       |
| VIEW_PERMISSIONS      | Can view permissions         |

### 2. Roles (3 global roles)

| Name          | Tenant | Description                              |
| ------------- | ------ | ---------------------------------------- |
| SUPER_ADMIN   | NULL   | Platform administrator - all permissions |
| COMPANY_ADMIN | NULL   | Company administrator - tenant-scoped    |
| CLIENT        | NULL   | End customer - minimal permissions       |

### 3. Role-Permission Mappings

| Role          | Permissions                                            |
| ------------- | ------------------------------------------------------ |
| SUPER_ADMIN   | ALL 10 permissions                                     |
| COMPANY_ADMIN | MANAGE_USERS, VIEW_USERS, VIEW_ROLES, VIEW_PERMISSIONS |
| CLIENT        | VIEW_USERS                                             |

### 4. Default Users

| Username     | Password  | Role          | Tenant    |
| ------------ | --------- | ------------- | --------- |
| superadmin   | admin123  | SUPER_ADMIN   | NULL      |
| companyadmin | admin123  | COMPANY_ADMIN | Acme Corp |
| clientuser   | client123 | CLIENT        | Acme Corp |

### 5. Default Tenant

| Name      | Status |
| --------- | ------ |
| Acme Corp | Active |

---

## Rebuild Tasks Summary

### Phase 1: Foundation & Entity Fixes

- [ ] Fix entity paths in database module
- [ ] Add soft delete to all entities (using TypeORM `@DeleteDateColumn`)
- [ ] Add audit fields (created_by, updated_by) to entities
- [ ] Fix tenant-scoped role creation logic
- [ ] Add proper unique constraints and indexes

### Phase 2: Service Layer Improvements

- [ ] Replace `throw new Error()` with proper NestJS exceptions
- [ ] Add pagination to all list endpoints
- [ ] Implement proper password hashing with salt rounds
- [ ] Add password change/reset functionality
- [ ] Implement proper transaction handling for multi-table operations

### Phase 3: Controller & Guard Cleanup

- [ ] Remove all console.log statements from guards
- [ ] Add proper API response wrappers
- [ ] Implement consistent error response format
- [ ] Add request validation at controller level
- [ ] Improve Swagger documentation with proper schemas

### Phase 4: DTO & Validation

- [ ] Add class-validator decorators to all DTOs
- [ ] Implement password strength validation
- [ ] Add unique constraint validation messages
- [ ] Implement proper relation DTOs for nested responses
- [ ] Add query parameter validation (pagination, sorting, filtering)

### Phase 5: Module & Architecture

- [ ] Add proper module exports for shared services
- [ ] Implement cross-module service injection
- [ ] Add feature flags for tenant-specific functionality
- [ ] Implement proper module boundaries
- [ ] Add health check endpoints

### Phase 6: Testing & Documentation

- [ ] Write unit tests for all services
- [ ] Write e2e tests for all API endpoints
- [ ] Add integration tests for authentication flow
- [ ] Document all API endpoints with examples
- [ ] Add migration scripts for production deployment

---

## Environment Variables

```env
# Application
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=multi_tenant_saas

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Optional: API Documentation
SWAGGER_PATH=api
```

---

## Recommended Improvements (Post-Rebuild)

1. **Rate Limiting**: Add @nestjs/throttler for API rate limiting
2. **Logging**: Implement structured logging with Winston/Pino
3. **Caching**: Add Redis caching for frequently accessed data
4. **File Upload**: Support for file uploads (avatars, documents)
5. **Email**: Email service for notifications and password reset
6. **API Versioning**: Implement /api/v1/ prefix for versioning
7. **WebSockets**: Real-time updates for multi-tenant data
8. **Microservices**: Consider breaking into microservices for scale
9. **GraphQL**: Alternative API layer with Apollo Server
10. **CI/CD**: GitHub Actions workflow for automated testing/deployment
