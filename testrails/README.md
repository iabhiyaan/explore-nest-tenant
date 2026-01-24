# TestRails - Authentication Test Cases

## Overview

This directory contains comprehensive test case scenarios for the authentication system of the NestJS multi-tenant application.

## System Overview

### User Roles
| Role | Description | Tenant Scope | Permissions |
|------|-------------|--------------|-------------|
| **SUPER_ADMIN** | System administrator with global access | None (Global) | All permissions |
| **COMPANY_ADMIN** | Tenant administrator | Per Tenant | Manage users, view roles/permissions |
| **CLIENT** | Regular end user | Per Tenant | View users only |

### Authentication Endpoint
- **URL:** `POST /auth/login`
- **Content-Type:** `application/json`

### Login Request Body
```json
{
  "username": "string (3-255 chars)",
  "password": "string (6-100 chars)",
  "tenantId": "string (optional)"
}
```

### Login Response (200 OK)
```json
{
  "accessToken": "string (JWT)",
  "user": {
    "id": "string (UUID)",
    "username": "string",
    "tenantId": "string (UUID) | null",
    "tenantName": "string | null",
    "roles": ["string"],
    "permissions": ["string"],
    "lastLogin": "string (ISO timestamp)"
  }
}
```

---

## Test Case Files

### 1. `login_superadmin.md`
Test cases for SUPER_ADMIN user authentication.

**Coverage:** 13 test cases
- Successful login scenarios
- Login with optional tenant ID
- Invalid credentials
- Validation errors (empty, short fields)
- Account lockout
- JWT token validation
- Database updates (last login, failed attempts)

### 2. `login_companyadmin.md`
Test cases for COMPANY_ADMIN user authentication.

**Coverage:** 15 test cases
- Successful login with active tenant
- Login with explicit tenant ID
- Tenant validation (inactive, missing)
- Invalid credentials
- Account deactivation
- Account lockout
- Failed attempt tracking
- Response structure validation
- JWT payload verification
- Multi-admin scenarios

### 3. `login_user.md`
Test cases for regular CLIENT user authentication.

**Coverage:** 20 test cases
- All COMPANY_ADMIN scenarios
- Permission verification (minimal permissions)
- Cross-tenant access prevention
- Password case sensitivity
- Username case sensitivity
- Special character handling

### 4. `login_negative.md`
Negative test cases and edge scenarios.

**Coverage:** 25 test cases
- SQL injection attempts
- XSS payloads
- Length validation
- Type validation (null, numeric, object, array)
- Whitespace handling
- Unicode characters
- Malformed JSON
- Unknown fields
- Method validation
- Malformed requests

### 5. `login_security.md`
Security-focused test cases.

**Coverage:** 25 test cases
- Account lockout mechanism
- Rate limiting
- Password strength validation
- No information disclosure
- JWT security (expiration, payload)
- Tenant validation
- Concurrent login handling
- Audit logging
- Response time consistency
- Timing attack prevention

---

## Test Case Summary

| Category | File | Test Cases | Total |
|----------|------|------------|-------|
| Role-Based | login_superadmin.md | 13 | |
| Role-Based | login_companyadmin.md | 15 | |
| Role-Based | login_user.md | 20 | |
| Edge Cases | login_negative.md | 25 | |
| Security | login_security.md | 25 | |
| **Total** | | | **98** |

---

## Test Data Reference

### Seeded Users

#### SUPER_ADMIN (Global)
| Username | Password | Notes |
|----------|----------|-------|
| superadmin | Admin@123 | System administrator |

#### COMPANY_ADMIN (Per Tenant)
| Username | Password | Tenant |
|----------|----------|--------|
| admin.smith | Admin@123 | Acme Corporation |
| admin.jones | Admin@123 | Acme Corporation |
| admin.chen | Admin@123 | TechCorp Solutions |
| admin.patel | Admin@123 | Global Industries |

#### CLIENT Users (Per Tenant)
**Acme Corporation:**
| Username | Password |
|----------|----------|
| user.alice | User@123 |
| user.bob | User@123 |
| user.carol | User@123 |
| user.david | User@123 |
| user.emma | User@123 |
| user.frank | User@123 |
| user.grace | User@123 |
| user.henry | User@123 |

**TechCorp Solutions:**
| Username | Password |
|----------|----------|
| user.lisa | User@123 |
| user.kevin | User@123 |
| user.maria | User@123 |
| user.james | User@123 |
| user.patricia | User@123 |

**Global Industries:**
| Username | Password |
|----------|----------|
| user.thomas | User@123 |
| user.jennifer | User@123 |
| user.robert | User@123 |
| user.amanda | User@123 |

---

## Test Data Setup

To run tests, ensure the database is seeded:

```bash
# Run database migration
npm run migration:run

# Seed database with test data
npm run seed
```

Or for Docker:
```bash
npm run migrate:refresh:seed
```

---

## Expected API Responses

### Successful Login (200 OK)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "superadmin",
    "tenantId": null,
    "tenantName": null,
    "roles": ["SUPER_ADMIN"],
    "permissions": ["MANAGE_COMPANIES", "VIEW_COMPANIES", "MANAGE_USERS", "VIEW_USERS", "MANAGE_COMPANY_ADMINS", "VIEW_COMPANY_ADMINS", "MANAGE_ROLES", "VIEW_ROLES", "MANAGE_PERMISSIONS", "VIEW_PERMISSIONS"],
    "lastLogin": "2026-01-22T10:30:00.000Z"
  }
}
```

### Invalid Credentials (401 Unauthorized)
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

### Validation Error (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": [
    "username should not be empty",
    "username must be longer than or equal to 3 characters"
  ]
}
```

### Account Locked (401 Unauthorized)
```json
{
  "statusCode": 401,
  "message": "Account is locked. Try again after 2026-01-22T10:45:00.000Z"
}
```

---

## Key Security Features Tested

1. **Account Lockout**
   - 5 failed attempts triggers 15-minute lockout
   - Counter resets on successful login
   - Lockout expires automatically

2. **Tenant Validation**
   - Users must belong to active tenant
   - SUPER_ADMIN bypasses tenant check
   - Clear error messages for inactive/missing tenants

3. **Input Validation**
   - Username: 3-255 characters
   - Password: 6-100 characters
   - Type validation for all fields
   - SQL injection/XSS protection

4. **JWT Security**
   - 15-minute expiration
   - No sensitive data in payload
   - Role and permission claims included

5. **Rate Limiting**
   - Per-IP rate limiting (if configured)
   - Per-user attempt tracking
   - 429 responses on limit exceed

---

## Running Tests

### Unit Tests
```bash
npm test
```

### Specific Test File
```bash
npm test -- test/auth/auth.service.spec.ts
```

### E2E Tests
```bash
npm run test:e2e
```

---

## Additional Notes

- All test cases assume the database is properly seeded
- Test cases can be executed manually via API tools (Postman, curl)
- JWT tokens should be decoded to verify payload claims
- Database state should be verified for stateful tests
