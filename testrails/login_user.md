# Authentication Test Cases - Regular User (CLIENT) Login

## Overview

Test cases for validating regular user (CLIENT role) authentication flows. CLIENT users are tenant-scoped with limited permissions.

## Test User Credentials

| Username      | Password | Role   | Tenant             |
| ------------- | -------- | ------ | ------------------ |
| user.alice    | User@123 | CLIENT | Acme Corporation   |
| user.bob      | User@123 | CLIENT | Acme Corporation   |
| user.carol    | User@123 | CLIENT | Acme Corporation   |
| user.lisa     | User@123 | CLIENT | TechCorp Solutions |
| user.kevin    | User@123 | CLIENT | TechCorp Solutions |
| user.thomas   | User@123 | CLIENT | Global Industries  |
| user.jennifer | User@123 | CLIENT | Global Industries  |

---

## TC-USR-001: Successful CLIENT Login

**Title:** Verify successful login for regular user (CLIENT role)

**Preconditions:**

- User `user.alice` exists in database with CLIENT role
- User is assigned to "Acme Corporation" tenant
- Tenant is active
- Account is active and not locked

**Steps:**

1. Send POST request to `/auth/login` with valid CLIENT credentials

**Request Body:**

```json
{
  "username": "user.alice",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**

```json
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "<user_id>",
    "username": "user.alice",
    "tenantId": "<tenant_uuid>",
    "tenantName": "Acme Corporation",
    "roles": ["CLIENT"],
    "permissions": ["VIEW_USERS"],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**

- JWT token is generated with CLIENT privileges
- Response includes tenantId and tenantName
- Response includes only CLIENT permissions (VIEW_USERS)

---

## TC-USR-002: CLIENT Login with Tenant ID

**Title:** Verify CLIENT login with explicit tenantId parameter

**Preconditions:**

- User `user.lisa` exists with CLIENT role
- User is assigned to "TechCorp Solutions" tenant

**Steps:**

1. Send POST request to `/auth/login` with CLIENT credentials and tenantId

**Request Body:**

```json
{
  "username": "user.lisa",
  "password": "User@123",
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
    "username": "user.lisa",
    "tenantId": "<techcorp_tenant_uuid>",
    "tenantName": "TechCorp Solutions",
    "roles": ["CLIENT"],
    "permissions": ["VIEW_USERS"],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**

- Login succeeds with tenantId provided
- Response includes correct tenant information

---

## TC-USR-003: CLIENT Login Fails for Inactive Tenant

**Title:** Verify login fails when CLIENT's tenant is deactivated

**Preconditions:**

- User `user.thomas` exists with CLIENT role
- User is assigned to "Global Industries" tenant
- Tenant is deactivated (isActive = false)

**Steps:**

1. Send POST request to `/auth/login` with valid CLIENT credentials

**Request Body:**

```json
{
  "username": "user.thomas",
  "password": "User@123"
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

## TC-USR-004: CLIENT Login Fails for Non-existent Tenant

**Title:** Verify login fails when tenant does not exist

**Preconditions:**

- User `user.bob` exists with CLIENT role
- User's tenantId references a deleted/invalid tenant

**Steps:**

1. Send POST request to `/auth/login` with valid CLIENT credentials

**Request Body:**

```json
{
  "username": "user.bob",
  "password": "User@123"
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

## TC-USR-005: CLIENT Login with Invalid Password

**Title:** Verify login fails with invalid password for CLIENT

**Preconditions:**

- User `user.carol` exists with CLIENT role

**Steps:**

1. Send POST request to `/auth/login` with wrong password

**Request Body:**

```json
{
  "username": "user.carol",
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

## TC-USR-006: CLIENT Login with Non-existent Username

**Title:** Verify login fails for non-existent CLIENT username

**Preconditions:**

- User `nonexistent_user` does not exist

**Steps:**

1. Send POST request to `/auth/login` with non-existent username

**Request Body:**

```json
{
  "username": "nonexistent_user",
  "password": "User@123"
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

## TC-USR-007: CLIENT Login with Deactivated Account

**Title:** Verify login fails when CLIENT account is deactivated

**Preconditions:**

- User `user.alice` exists with CLIENT role
- User's isActive flag is set to false

**Steps:**

1. Send POST request to `/auth/login` with valid credentials

**Request Body:**

```json
{
  "username": "user.alice",
  "password": "User@123"
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

## TC-USR-008: CLIENT Login After Lockout

**Title:** Verify login fails when CLIENT account is locked

**Preconditions:**

- User `user.kevin` exists with CLIENT role
- User has 5 or more failed login attempts
- Account is locked until future timestamp

**Steps:**

1. Send POST request to `/auth/login` with valid credentials

**Request Body:**

```json
{
  "username": "user.kevin",
  "password": "User@123"
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

## TC-USR-009: CLIENT Login Tracks Failed Attempts

**Title:** Verify failed login attempts are tracked for CLIENT

**Preconditions:**

- User `user.jennifer` exists with CLIENT role
- Account has 0 failed attempts initially

**Steps:**

1. Send POST request to `/auth/login` with invalid password
2. Repeat 4 more times (total 5 failed attempts)
3. Check user record in database

**Request Body (repeated):**

```json
{
  "username": "user.jennifer",
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

## TC-USR-010: CLIENT Login Response Structure

**Title:** Verify CLIENT login response has correct structure

**Preconditions:**

- User `user.bob` exists with CLIENT role

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Validate response structure

**Request Body:**

```json
{
  "username": "user.bob",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**

```json
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "<uuid>",
    "username": "user.bob",
    "tenantId": "<uuid>",
    "tenantName": "Acme Corporation",
    "roles": ["CLIENT"],
    "permissions": ["VIEW_USERS"],
    "lastLogin": "<iso8601_timestamp>"
  }
}
```

**Expected Behavior:**

- Response has exactly two top-level keys: accessToken and user
- user object contains all expected fields
- permissions array contains only CLIENT permissions

---

## TC-USR-011: CLIENT JWT Token Payload

**Title:** Verify CLIENT JWT token contains correct payload

**Preconditions:**

- User `user.carol` exists with CLIENT role

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Decode JWT token (without verification)
3. Examine payload

**Request Body:**

```json
{
  "username": "user.carol",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected JWT Payload:**

```json
{
  "sub": "<user_id>",
  "username": "user.carol",
  "tenantId": "<tenant_uuid>",
  "roles": ["CLIENT"],
  "permissions": ["VIEW_USERS"],
  "iat": <timestamp>,
  "exp": <timestamp>
}
```

**Expected Behavior:**

- `sub` contains user UUID
- `username` contains "user.carol"
- `tenantId` contains valid tenant UUID
- `roles` contains CLIENT
- `permissions` contains only VIEW_USERS

---

## TC-USR-012: Multiple CLIENTs in Same Tenant

**Title:** Verify multiple CLIENTs can login for same tenant

**Preconditions:**

- `user.alice`, `user.bob`, `user.carol` all have CLIENT role
- All are assigned to "Acme Corporation" tenant

**Steps:**

1. Send POST request to `/auth/login` as each user

**Request Body 1:**

```json
{
  "username": "user.alice",
  "password": "User@123"
}
```

**Request Body 2:**

```json
{
  "username": "user.bob",
  "password": "User@123"
}
```

**Request Body 3:**

```json
{
  "username": "user.carol",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- All logins succeed
- Each receives unique JWT token
- Each token contains respective user ID
- All tokens include same tenantId (Acme Corporation)

---

## TC-USR-013: CLIENT Cannot Access Other Tenant Data

**Title:** Verify CLIENT can only access their own tenant

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- `user.lisa` is CLIENT for "TechCorp Solutions"

**Steps:**

1. Login as user.alice
2. Examine tenantId in JWT payload

**Request Body:**

```json
{
  "username": "user.alice",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- JWT token contains "Acme Corporation" tenantId
- User cannot impersonate another tenant
- Subsequent API calls should be scoped to own tenant

---

## TC-USR-14: CLIENT Login with Empty Fields

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
  "password": "User@123"
}
```

**Request Body 2:**

```json
{
  "username": "user.alice",
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

## TC-USR-015: CLIENT Login Updates Statistics

**Title:** Verify successful login updates user statistics

**Preconditions:**

- User `user.lisa` exists with CLIENT role
- User has previous loginAttempts and lastLoginAt values

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Query user record to verify statistics updated

**Request Body:**

```json
{
  "username": "user.lisa",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- loginAttempts reset to 0
- lockedUntil set to null
- lastLoginAt updated to current timestamp

---

## TC-USR-016: CLIENT Login Returns Minimal Permissions

**Title:** Verify CLIENT login returns only assigned permissions

**Preconditions:**

- User `user.kevin` exists with CLIENT role

**Steps:**

1. Send POST request to `/auth/login` with valid credentials
2. Examine permissions in response

**Request Body:**

```json
{
  "username": "user.kevin",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**

```json
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "<user_id>",
    "username": "user.kevin",
    "tenantId": "<tenant_uuid>",
    "tenantName": "TechCorp Solutions",
    "roles": ["CLIENT"],
    "permissions": ["VIEW_USERS"],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**

- permissions array contains only ["VIEW_USERS"]
- No administrative permissions are included

---

## TC-USR-017: CLIENT Login from Different Tenant Domain

**Title:** Verify CLIENT from one tenant cannot authenticate for another

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- `user.thomas` is CLIENT for "Global Industries"

**Steps:**

1. Attempt to login as user.alice with user.thomas credentials
2. Attempt to login with valid credentials but wrong tenant context

**Request Body:**

```json
{
  "username": "user.alice",
  "password": "User@123",
  "tenantId": "<global_industries_tenant_uuid>"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- If user.alice belongs to different tenant, login should succeed with user's actual tenant
- Tenant ID in request is ignored for existing users

---

## TC-USR-018: CLIENT Login - Password Case Sensitivity

**Title:** Verify password validation is case-sensitive

**Preconditions:**

- User `user.alice` exists with CLIENT role
- Password is "User@123"

**Steps:**

1. Attempt login with lowercase "user@123"
2. Attempt login with "USER@123"

**Request Body 1:**

```json
{
  "username": "user.alice",
  "password": "user@123"
}
```

**Request Body 2:**

```json
{
  "username": "user.alice",
  "password": "USER@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Both attempts fail with 401 Unauthorized
- Password validation is case-sensitive

---

## TC-USR-019: CLIENT Login - Username Case Sensitivity

**Title:** Verify username validation is case-sensitive

**Preconditions:**

- User `user.alice` exists with CLIENT role

**Steps:**

1. Attempt login with "User.Alice" (mixed case)
2. Attempt login with "USER.ALICE" (uppercase)

**Request Body 1:**

```json
{
  "username": "User.Alice",
  "password": "User@123"
}
```

**Request Body 2:**

```json
{
  "username": "USER.ALICE",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Both attempts fail with 401 Unauthorized (Invalid credentials)
- Username comparison is case-sensitive

---

## TC-USR-020: CLIENT Login with Special Characters in Password

**Title:** Verify login handles special characters in password

**Preconditions:**

- User `user.alice` exists with password "User@123"

**Steps:**

1. Attempt login with correct password including special char

**Request Body:**

```json
{
  "username": "user.alice",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**

```json
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "<user_id>",
    "username": "user.alice",
    "tenantId": "<tenant_uuid>",
    "tenantName": "Acme Corporation",
    "roles": ["CLIENT"],
    "permissions": ["VIEW_USERS"],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**

- Special characters in password are handled correctly
- Login succeeds with exact password match

---

## Summary

| Test Case ID | Title                            | Expected Result                  |
| ------------ | -------------------------------- | -------------------------------- |
| TC-USR-001   | Successful CLIENT Login          | 200 OK with JWT token            |
| TC-USR-002   | CLIENT Login with Tenant ID      | 200 OK with tenant context       |
| TC-USR-003   | CLIENT Login - Inactive Tenant   | 401 Unauthorized                 |
| TC-USR-004   | CLIENT Login - Missing Tenant    | 401 Unauthorized                 |
| TC-USR-005   | CLIENT Login Invalid Password    | 401 Unauthorized                 |
| TC-USR-006   | CLIENT Login Non-existent User   | 401 Unauthorized                 |
| TC-USR-007   | CLIENT Login Deactivated Account | 401 Unauthorized                 |
| TC-USR-008   | CLIENT Login Locked Account      | 401 Unauthorized with lockout    |
| TC-USR-009   | CLIENT Tracks Failed Attempts    | Database counters updated        |
| TC-USR-010   | CLIENT Login Response            | 200 OK with correct structure    |
| TC-USR-011   | CLIENT JWT Payload               | JWT with correct claims          |
| TC-USR-012   | Multiple CLIENTs Login           | All succeed with separate tokens |
| TC-USR-013   | CLIENT Tenant Isolation          | Token shows own tenant           |
| TC-USR-014   | CLIENT Validation Errors         | 400 Bad Request                  |
| TC-USR-015   | CLIENT Updates Statistics        | Database updated                 |
| TC-USR-016   | CLIENT Minimal Permissions       | Only VIEW_USERS permission       |
| TC-USR-017   | Cross-tenant Login               | User's actual tenant used        |
| TC-USR-018   | Password Case Sensitivity        | Case-sensitive validation        |
| TC-USR-019   | Username Case Sensitivity        | Case-sensitive validation        |
| TC-USR-020   | Special Characters in Password   | Handled correctly                |
