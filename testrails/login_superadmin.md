# Authentication Test Cases - SUPER_ADMIN Login

## Overview

Test cases for validating SUPER_ADMIN user authentication flows. SUPER_ADMIN users have global access (no tenant context required).

## Test User Credentials

| Username   | Password  | Role        | Tenant        |
| ---------- | --------- | ----------- | ------------- |
| superadmin | Admin@123 | SUPER_ADMIN | None (Global) |

---

## TC-SA-001: Successful SUPER_ADMIN Login

**Title:** Verify successful login for SUPER_ADMIN user without tenant

**Preconditions:**

- User `superadmin` exists in database with SUPER_ADMIN role
- Account is active and not locked
- Tenant is null (global user)

**Steps:**

1. Send POST request to `/auth/login` with valid SUPER_ADMIN credentials

**Request Body:**

```json
{
  "username": "superadmin",
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
    "username": "superadmin",
    "tenantId": null,
    "tenantName": null,
    "roles": ["SUPER_ADMIN"],
    "permissions": [
      "MANAGE_COMPANIES",
      "VIEW_COMPANIES",
      "MANAGE_USERS",
      "VIEW_USERS",
      "MANAGE_COMPANY_ADMINS",
      "VIEW_COMPANY_ADMINS",
      "MANAGE_ROLES",
      "VIEW_ROLES",
      "MANAGE_PERMISSIONS",
      "VIEW_PERMISSIONS"
    ],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**

- JWT token is generated with SUPER_ADMIN privileges
- Response includes all permissions assigned to SUPER_ADMIN role
- tenantId and tenantName are null

---

## TC-SA-002: SUPER_ADMIN Login with Optional Tenant ID

**Title:** Verify SUPER_ADMIN login accepts optional tenantId parameter

**Preconditions:**

- User `superadmin` exists with SUPER_ADMIN role

**Steps:**

1. Send POST request to `/auth/login` with SUPER_ADMIN credentials and tenantId

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "Admin@123",
  "tenantId": "acme-corp-uuid"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**

```json
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "<user_id>",
    "username": "superadmin",
    "tenantId": null,
    "tenantName": null,
    "roles": ["SUPER_ADMIN"],
    "permissions": "<all_permissions>",
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**

- tenantId parameter is ignored for SUPER_ADMIN users
- User still has global access (tenantId remains null)

---

## TC-SA-003: SUPER_ADMIN Login with Invalid Password

**Title:** Verify login fails with invalid password for SUPER_ADMIN

**Preconditions:**

- User `superadmin` exists with SUPER_ADMIN role

**Steps:**

1. Send POST request to `/auth/login` with wrong password

**Request Body:**

```json
{
  "username": "superadmin",
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

## TC-SA-004: SUPER_ADMIN Login with Non-existent Username

**Title:** Verify login fails for non-existent SUPER_ADMIN username

**Preconditions:**

- User `nonexistent` does not exist

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
- No information about whether username or password is wrong

---

## TC-SA-005: SUPER_ADMIN Login with Empty Username

**Title:** Verify login fails with empty username field

**Preconditions:**

- None

**Steps:**

1. Send POST request to `/auth/login` with empty username

**Request Body:**

```json
{
  "username": "",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username should not be empty", "username must be a string"]
}
```

**Expected Behavior:**

- Validation error for empty username

---

## TC-SA-006: SUPER_ADMIN Login with Empty Password

**Title:** Verify login fails with empty password field

**Preconditions:**

- None

**Steps:**

1. Send POST request to `/auth/login` with empty password

**Request Body:**

```json
{
  "username": "superadmin",
  "password": ""
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["password should not be empty", "password must be a string"]
}
```

**Expected Behavior:**

- Validation error for empty password

---

## TC-SA-007: SUPER_ADMIN Login with Short Username

**Title:** Verify login fails with username less than 3 characters

**Preconditions:**

- None

**Steps:**

1. Send POST request to `/auth/login` with short username

**Request Body:**

```json
{
  "username": "ab",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username must be longer than or equal to 3 characters"]
}
```

**Expected Behavior:**

- Validation error for short username

---

## TC-SA-008: SUPER_ADMIN Login with Short Password

**Title:** Verify login fails with password less than 6 characters

**Preconditions:**

- None

**Steps:**

1. Send POST request to `/auth/login` with short password

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "Ab12"
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["password must be longer than or equal to 6 characters"]
}
```

**Expected Behavior:**

- Validation error for short password

---

## TC-SA-009: SUPER_ADMIN Login After Account Lockout

**Title:** Verify login fails when SUPER_ADMIN account is locked

**Preconditions:**

- User `superadmin` exists with 5 or more failed login attempts
- Account is locked until future timestamp

**Steps:**

1. Send POST request to `/auth/login` with valid credentials

**Request Body:**

```json
{
  "username": "superadmin",
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

## TC-SA-010: SUPER_ADMIN Login Response Contains Correct Data

**Title:** Verify login response contains all expected user data

**Preconditions:**

- User `superadmin` exists with SUPER_ADMIN role
- User has login history

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Examine the response structure

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**

```json
{
  "accessToken": "<valid_jwt_token>",
  "user": {
    "id": "<uuid>",
    "username": "superadmin",
    "tenantId": null,
    "tenantName": null,
    "roles": ["SUPER_ADMIN"],
    "permissions": [
      "MANAGE_COMPANIES",
      "VIEW_COMPANIES",
      "MANAGE_USERS",
      "VIEW_USERS",
      "MANAGE_COMPANY_ADMINS",
      "VIEW_COMPANY_ADMINS",
      "MANAGE_ROLES",
      "VIEW_ROLES",
      "MANAGE_PERMISSIONS",
      "VIEW_PERMISSIONS"
    ],
    "lastLogin": "<iso_timestamp>"
  }
}
```

**Expected Behavior:**

- Response includes accessToken (JWT)
- User object contains id, username, tenantId (null), tenantName (null)
- Roles array contains SUPER_ADMIN
- Permissions array contains all SUPER_ADMIN permissions
- lastLogin is a valid ISO timestamp

---

## TC-SA-011: SUPER_ADMIN JWT Token Contains Correct Payload

**Title:** Verify JWT token payload contains correct claims

**Preconditions:**

- User `superadmin` exists with SUPER_ADMIN role

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Decode the JWT token (without verification)
3. Examine the payload

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected JWT Payload:**

```json
{
  "sub": "<user_id>",
  "username": "superadmin",
  "tenantId": null,
  "roles": ["SUPER_ADMIN"],
  "permissions": ["MANAGE_COMPANIES", "VIEW_COMPANIES", "MANAGE_USERS", "VIEW_USERS", "MANAGE_COMPANY_ADMINS", "VIEW_COMPANY_ADMINS", "MANAGE_ROLES", "VIEW_ROLES", "MANAGE_PERMISSIONS", "VIEW_PERMISSIONS"],
  "iat": <timestamp>,
  "exp": <timestamp>
}
```

**Expected Behavior:**

- `sub` contains user ID
- `username` contains "superadmin"
- `tenantId` is null
- `roles` contains SUPER_ADMIN
- `permissions` contains all SUPER_ADMIN permissions

---

## TC-SA-012: SUPER_ADMIN Login Updates Last Login Time

**Title:** Verify successful login updates lastLoginAt timestamp

**Preconditions:**

- User `superadmin` exists with SUPER_ADMIN role
- User has a previous lastLoginAt value

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Query user record to verify lastLoginAt was updated

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Database record for user is updated
- lastLoginAt is set to current timestamp
- loginAttempts is reset to 0

---

## TC-SA-013: SUPER_ADMIN Login Resets Failed Attempts

**Title:** Verify successful login resets login attempts counter

**Preconditions:**

- User `superadmin` exists with SUPER_ADMIN role
- User has 3 failed login attempts in database

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Query user record to verify loginAttempts was reset

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Database record for user is updated
- loginAttempts is reset to 0
- lockedUntil is set to null

---

## Summary

| Test Case ID | Title                               | Expected Result                       |
| ------------ | ----------------------------------- | ------------------------------------- |
| TC-SA-001    | Successful SUPER_ADMIN Login        | 200 OK with JWT token                 |
| TC-SA-002    | SUPER_ADMIN Login with Tenant ID    | 200 OK (tenant ignored)               |
| TC-SA-003    | SUPER_ADMIN Login Invalid Password  | 401 Unauthorized                      |
| TC-SA-004    | SUPER_ADMIN Login Non-existent User | 401 Unauthorized                      |
| TC-SA-005    | SUPER_ADMIN Login Empty Username    | 400 Bad Request                       |
| TC-SA-006    | SUPER_ADMIN Login Empty Password    | 400 Bad Request                       |
| TC-SA-007    | SUPER_ADMIN Login Short Username    | 400 Bad Request                       |
| TC-SA-008    | SUPER_ADMIN Login Short Password    | 400 Bad Request                       |
| TC-SA-009    | SUPER_ADMIN Login Locked Account    | 401 Unauthorized with lockout message |
| TC-SA-010    | SUPER_ADMIN Login Response Data     | 200 OK with complete user data        |
| TC-SA-011    | SUPER_ADMIN JWT Token Payload       | JWT with correct claims               |
| TC-SA-012    | SUPER_ADMIN Updates Last Login      | Database updated                      |
| TC-SA-013    | SUPER_ADMIN Resets Failed Attempts  | Database updated                      |
