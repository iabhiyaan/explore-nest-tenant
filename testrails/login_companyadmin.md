# Authentication Test Cases - COMPANY_ADMIN Login

## Overview

Test cases for validating COMPANY_ADMIN user authentication flows. COMPANY_ADMIN users are tenant-scoped and require active tenant validation.

## Test User Credentials

| Username    | Password  | Role          | Tenant             |
| ----------- | --------- | ------------- | ------------------ |
| admin.smith | Admin@123 | COMPANY_ADMIN | Acme Corporation   |
| admin.jones | Admin@123 | COMPANY_ADMIN | Acme Corporation   |
| admin.chen  | Admin@123 | COMPANY_ADMIN | TechCorp Solutions |
| admin.patel | Admin@123 | COMPANY_ADMIN | Global Industries  |

---

## TC-CA-001: Successful COMPANY_ADMIN Login

**Title:** Verify successful login for COMPANY_ADMIN with active tenant

**Preconditions:**

- User `admin.smith` exists in database with COMPANY_ADMIN role
- User is assigned to "Acme Corporation" tenant
- Tenant is active
- Account is active and not locked

**Steps:**

1. Send POST request to `/auth/login` with valid COMPANY_ADMIN credentials

**Request Body:**

```json
{
  "username": "admin.smith",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**

```json
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "<user_id>",
    "username": "admin.smith",
    "tenantId": "<tenant_uuid>",
    "tenantName": "Acme Corporation",
    "roles": ["COMPANY_ADMIN"],
    "permissions": [
      "MANAGE_USERS",
      "VIEW_USERS",
      "VIEW_ROLES",
      "VIEW_PERMISSIONS"
    ],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**

- JWT token is generated with COMPANY_ADMIN privileges
- Response includes tenantId and tenantName
- Response includes COMPANY_ADMIN permissions only

---

## TC-CA-002: COMPANY_ADMIN Login with Tenant ID

**Title:** Verify COMPANY_ADMIN login with explicit tenantId parameter

**Preconditions:**

- User `admin.chen` exists with COMPANY_ADMIN role
- User is assigned to "TechCorp Solutions" tenant

**Steps:**

1. Send POST request to `/auth/login` with COMPANY_ADMIN credentials and tenantId

**Request Body:**

```json
{
  "username": "admin.chen",
  "password": "Admin@123",
  "tenantId": "<techcorp_tenant_uuid>"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**

```json
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "<user_id>",
    "username": "admin.chen",
    "tenantId": "<techcorp_tenant_uuid>",
    "tenantName": "TechCorp Solutions",
    "roles": ["COMPANY_ADMIN"],
    "permissions": [
      "MANAGE_USERS",
      "VIEW_USERS",
      "VIEW_ROLES",
      "VIEW_PERMISSIONS"
    ],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**

- Login succeeds with tenantId provided
- Response includes correct tenant information

---

## TC-CA-003: COMPANY_ADMIN Login Fails for Inactive Tenant

**Title:** Verify login fails when tenant is deactivated

**Preconditions:**

- User `admin.patel` exists with COMPANY_ADMIN role
- User is assigned to "Global Industries" tenant
- Tenant `Global Industries` is deactivated (isActive = false)

**Steps:**

1. Send POST request to `/auth/login` with valid COMPANY_ADMIN credentials

**Request Body:**

```json
{
  "username": "admin.patel",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Tenant is deactivated"
}
```

**Expected Behavior:**

- Login fails with clear error message about tenant deactivation
- User cannot authenticate even with valid credentials

---

## TC-CA-004: COMPANY_ADMIN Login Fails for Non-existent Tenant - failure

**Title:** Verify login fails when tenant does not exist

**Preconditions:**

- User `admin.smith` exists with COMPANY_ADMIN role
- User's tenantId references a deleted/invalid tenant

**Steps:**

1. Send POST request to `/auth/login` with valid COMPANY_ADMIN credentials

**Request Body:**

```json
{
  "username": "admin.smith",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Tenant not found"
}
```

**Expected Behavior:**

- Login fails with clear error message about missing tenant

---

## TC-CA-005: COMPANY_ADMIN Login with Invalid Password

**Title:** Verify login fails with invalid password for COMPANY_ADMIN

**Preconditions:**

- User `admin.jones` exists with COMPANY_ADMIN role

**Steps:**

1. Send POST request to `/auth/login` with wrong password

**Request Body:**

```json
{
  "username": "admin.jones",
  "password": "WrongPassword123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

**Expected Behavior:**

- Login fails with proper error message
- Login attempt is tracked

---

## TC-CA-006: COMPANY_ADMIN Login with Non-existent Username

**Title:** Verify login fails for non-existent COMPANY_ADMIN username

**Preconditions:**

- User `nonexistent_admin` does not exist

**Steps:**

1. Send POST request to `/auth/login` with non-existent username

**Request Body:**

```json
{
  "username": "nonexistent_admin",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

**Expected Behavior:**

- Generic error message (no user enumeration)

---

## TC-CA-007: COMPANY_ADMIN Login with Deactivated Account

**Title:** Verify login fails when COMPANY_ADMIN account is deactivated

**Preconditions:**

- User `admin.smith` exists with COMPANY_ADMIN role
- User's isActive flag is set to false

**Steps:**

1. Send POST request to `/auth/login` with valid credentials

**Request Body:**

```json
{
  "username": "admin.smith",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Account is deactivated"
}
```

**Expected Behavior:**

- Login fails with clear error message about deactivated account

---

## TC-CA-008: COMPANY_ADMIN Login After Lockout

**Title:** Verify login fails when COMPANY_ADMIN account is locked

**Preconditions:**

- User `admin.chen` exists with COMPANY_ADMIN role
- User has 5 or more failed login attempts
- Account is locked until future timestamp

**Steps:**

1. Send POST request to `/auth/login` with valid credentials

**Request Body:**

```json
{
  "username": "admin.chen",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Account is locked. Try again after <locked_until_timestamp>"
}
```

**Expected Behavior:**

- Error message includes lockout expiration time
- Login is rejected regardless of correct credentials

---

## TC-CA-009: COMPANY_ADMIN Login Tracks Failed Attempts

**Title:** Verify failed login attempts are tracked for COMPANY_ADMIN

**Preconditions:**

- User `admin.patel` exists with COMPANY_ADMIN role
- Account has 0 failed attempts initially

**Steps:**

1. Send POST request to `/auth/login` with invalid password
2. Repeat 4 more times (total 5 failed attempts)
3. Check user record in database

**Request Body (repeated):**

```json
{
  "username": "admin.patel",
  "password": "WrongPassword"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Each failed attempt increases loginAttempts counter
- After 5 failed attempts, account is locked
- lockedUntil is set to 15 minutes from current time
- Final request returns lockout error

---

## TC-CA-010: COMPANY_ADMIN Login Response Structure

**Title:** Verify COMPANY_ADMIN login response has correct structure

**Preconditions:**

- User `admin.smith` exists with COMPANY_ADMIN role

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Validate response structure

**Request Body:**

```json
{
  "username": "admin.smith",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**

```json
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "<uuid>",
    "username": "admin.smith",
    "tenantId": "<uuid>",
    "tenantName": "Acme Corporation",
    "roles": ["COMPANY_ADMIN"],
    "permissions": [
      "MANAGE_USERS",
      "VIEW_USERS",
      "VIEW_ROLES",
      "VIEW_PERMISSIONS"
    ],
    "lastLogin": "<iso8601_timestamp>"
  }
}
```

**Expected Behavior:**

- Response has exactly two top-level keys: accessToken and user
- user object contains all expected fields
- permissions array contains COMPANY_ADMIN permissions only

---

## TC-CA-011: COMPANY_ADMIN JWT Token Payload

**Title:** Verify COMPANY_ADMIN JWT token contains correct payload

**Preconditions:**

- User `admin.jones` exists with COMPANY_ADMIN role

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Decode JWT token (without verification)
3. Examine payload

**Request Body:**

```json
{
  "username": "admin.jones",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected JWT Payload:**

```json
{
  "sub": "<user_id>",
  "username": "admin.jones",
  "tenantId": "<tenant_uuid>",
  "roles": ["COMPANY_ADMIN"],
  "permissions": ["MANAGE_USERS", "VIEW_USERS", "VIEW_ROLES", "VIEW_PERMISSIONS"],
  "iat": <timestamp>,
  "exp": <timestamp>
}
```

**Expected Behavior:**

- `sub` contains user UUID
- `username` contains "admin.jones"
- `tenantId` contains valid tenant UUID
- `roles` contains COMPANY_ADMIN
- `permissions` contains only COMPANY_ADMIN permissions

---

## TC-CA-012: Multiple COMPANY_ADMINs in Same Tenant

**Title:** Verify multiple COMPANY_ADMINs can login for same tenant

**Preconditions:**

- `admin.smith` and `admin.jones` both have COMPANY_ADMIN role
- Both are assigned to "Acme Corporation" tenant

**Steps:**

1. Send POST request to `/auth/login` as admin.smith
2. Send POST request to `/auth/login` as admin.jones

**Request Body 1:**

```json
{
  "username": "admin.smith",
  "password": "Admin@123"
}
```

**Request Body 2:**

```json
{
  "username": "admin.jones",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Both logins succeed
- Each receives unique JWT token
- Each token contains respective user ID
- Both tokens include same tenantId

---

## TC-CA-013: COMPANY_ADMIN Cannot Access Other Tenant Data

**Title:** Verify COMPANY_ADMIN can only access their own tenant

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- `admin.chen` is COMPANY_ADMIN for "TechCorp Solutions"

**Steps:**

1. Login as admin.smith
2. Examine tenantId in JWT payload

**Request Body:**

```json
{
  "username": "admin.smith",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- JWT token contains "Acme Corporation" tenantId
- User cannot impersonate another tenant
- Subsequent API calls should be scoped to own tenant

---

## TC-CA-014: COMPANY_ADMIN Login with Empty Fields

**Title:** Verify validation errors for empty required fields

**Preconditions:**

- None

**Steps:**

1. Send POST request with empty username
2. Send POST request with empty password

**Request Body 1:**

```json
{
  "username": "",
  "password": "Admin@123"
}
```

**Request Body 2:**

```json
{
  "username": "admin.smith",
  "password": ""
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username should not be empty"]
}
```

or

```json
{
  "statusCode": 400,
  "message": ["password should not be empty"]
}
```

**Expected Behavior:**

- Validation fails with appropriate error messages
- No authentication attempt is made

---

## TC-CA-015: COMPANY_ADMIN Login Updates Login Statistics

**Title:** Verify successful login updates user statistics

**Preconditions:**

- User `admin.chen` exists with COMPANY_ADMIN role
- User has previous loginAttempts and lastLoginAt values

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Query user record to verify statistics updated

**Request Body:**

```json
{
  "username": "admin.chen",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- loginAttempts reset to 0
- lockedUntil set to null
- lastLoginAt updated to current timestamp

---

## Summary

| Test Case ID | Title                                   | Expected Result                   |
| ------------ | --------------------------------------- | --------------------------------- |
| TC-CA-001    | Successful COMPANY_ADMIN Login          | 200 OK with JWT token             |
| TC-CA-002    | COMPANY_ADMIN Login with Tenant ID      | 200 OK with tenant context        |
| TC-CA-003    | COMPANY_ADMIN Login - Inactive Tenant   | 401 Unauthorized                  |
| TC-CA-004    | COMPANY_ADMIN Login - Missing Tenant    | 401 Unauthorized                  |
| TC-CA-005    | COMPANY_ADMIN Login Invalid Password    | 401 Unauthorized                  |
| TC-CA-006    | COMPANY_ADMIN Login Non-existent User   | 401 Unauthorized                  |
| TC-CA-007    | COMPANY_ADMIN Login Deactivated Account | 401 Unauthorized                  |
| TC-CA-008    | COMPANY_ADMIN Login Locked Account      | 401 Unauthorized with lockout     |
| TC-CA-009    | COMPANY_ADMIN Tracks Failed Attempts    | Database counters updated         |
| TC-CA-010    | COMPANY_ADMIN Login Response            | 200 OK with correct structure     |
| TC-CA-011    | COMPANY_ADMIN JWT Payload               | JWT with correct claims           |
| TC-CA-012    | Multiple COMPANY_ADMINs Login           | Both succeed with separate tokens |
| TC-CA-013    | COMPANY_ADMIN Tenant Isolation          | Token shows own tenant            |
| TC-CA-014    | COMPANY_ADMIN Validation Errors         | 400 Bad Request                   |
| TC-CA-015    | COMPANY_ADMIN Updates Statistics        | Database updated                  |
