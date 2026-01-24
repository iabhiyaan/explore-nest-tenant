# Authentication Test Cases - Security Scenarios

## Overview
Test cases for validating authentication security features including rate limiting, account lockout, password policies, and security best practices.

---

## TC-SEC-001: Account Lockout After 5 Failed Attempts

**Title:** Verify account is locked after 5 failed login attempts

**Preconditions:**
- User `user.alice` exists with CLIENT role
- User has 0 login attempts initially

**Steps:**
1. Attempt login with invalid password 5 times
2. Attempt login with valid password on 6th attempt

**Request Body (repeated 5 times):**
```json
{
  "username": "user.alice",
  "password": "WrongPassword123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior for attempts 1-5:**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

**Request Body (6th attempt with valid password):**
```json
{
  "username": "user.alice",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response for 6th attempt:**
```json
{
  "statusCode": 401,
  "message": "Account is locked. Try again after <locked_until_timestamp>"
}
```

**Expected Database State:**
- loginAttempts = 5
- lockedUntil = current_time + 15 minutes

---

## TC-SEC-002: Lockout Duration is 15 Minutes

**Title:** Verify lockout duration is exactly 15 minutes

**Preconditions:**
- User `user.bob` exists with CLIENT role
- User has 5 failed login attempts

**Steps:**
1. After lockout, check lockedUntil timestamp
2. Verify lockout period is 15 minutes

**API URL:** `POST /auth/login`

**Expected Behavior:**
- lockedUntil is set to Date.now() + (15 * 60 * 1000) milliseconds
- Lockout does not expire before 15 minutes

---

## TC-SEC-003: Lockout Reset on Successful Login After Expiration

**Title:** Verify login resets lockout after expiration

**Preconditions:**
- User `user.carol` exists with CLIENT role
- User was locked 15+ minutes ago

**Steps:**
1. Attempt login with valid credentials

**Request Body:**
```json
{
  "username": "user.carol",
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
    "username": "user.carol",
    "tenantId": "<tenant_uuid>",
    "tenantName": "Acme Corporation",
    "roles": ["CLIENT"],
    "permissions": ["VIEW_USERS"],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Database State:**
- loginAttempts = 0
- lockedUntil = null

---

## TC-SEC-004: Failed Attempt Counter Increments

**Title:** Verify login attempt counter increments on each failure

**Preconditions:**
- User `user.david` exists with CLIENT role
- User has 0 login attempts initially

**Steps:**
1. Attempt login with invalid password 3 times
2. Query user record to verify counter

**Request Body (repeated 3 times):**
```json
{
  "username": "user.david",
  "password": "WrongPassword"
}
```

**API URL:** `POST /auth/login`

**Expected Database State after 3 failures:**
- loginAttempts = 3

---

## TC-SEC-005: Successful Login Resets Counter

**Title:** Verify successful login resets failed attempt counter

**Preconditions:**
- User `user.emma` exists with CLIENT role
- User has 4 failed login attempts

**Steps:**
1. Attempt login with valid credentials

**Request Body:**
```json
{
  "username": "user.emma",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK)**

**Expected Database State:**
- loginAttempts = 0
- lockedUntil = null
- lastLoginAt = current timestamp

---

## TC-SEC-006: Password Strength Validation

**Title:** Verify password meets strength requirements

**Preconditions:**
- User `user.frank` exists with CLIENT role

**Steps:**
1. Attempt to change password with weak password

**Request Body (for password change endpoint):**
```json
{
  "currentPassword": "User@123",
  "newPassword": "weak"
}
```

**API URL:** `POST /auth/change-password`

**Expected Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": ["newPassword must be longer than or equal to 8 characters"]
}
```

**Expected Behavior:**
- Password must be at least 8 characters

---

## TC-SEC-007: No Password Enumeration in Error Messages

**Title:** Verify error messages don't indicate if username exists

**Preconditions:**
- None

**Steps:**
1. Attempt login with non-existent username
2. Attempt login with existing username but wrong password

**Request Body 1:**
```json
{
  "username": "nonexistent_user_xyz",
  "password": "anypassword"
}
```

**Request Body 2:**
```json
{
  "username": "superadmin",
  "password": "wrongpassword"
}
```

**API URL:** `POST /auth/login`

**Expected Response (both cases):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

**Expected Behavior:**
- Same error message for both cases
- No indication whether username or password is wrong

---

## TC-SEC-008: Rate Limiting Per IP Address

**Title:** Verify rate limiting applies per IP address

**Preconditions:**
- None

**Steps:**
1. Send multiple rapid login requests from same IP
2. Verify rate limiting is applied

**API URL:** `POST /auth/login`

**Expected Behavior:**
- If IP-based rate limiting is configured (e.g., @Throttler), requests are limited
- Returns 429 Too Many Requests after limit exceeded

---

## TC-SEC-009: Login Does Not Reveal User Active Status

**Title:** Verify login doesn't reveal if account is active before authentication

**Preconditions:**
- User `user.grace` exists but is deactivated

**Steps:**
1. Attempt login with valid credentials for deactivated user

**Request Body:**
```json
{
  "username": "user.grace",
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
- While the message indicates deactivation, this is acceptable for legitimate user feedback
- Error doesn't reveal if username was valid before credentials are checked

---

## TC-SEC-010: JWT Token Expiration

**Title:** Verify JWT token has appropriate expiration

**Preconditions:**
- User `superadmin` logs in successfully

**Steps:**
1. Decode JWT token
2. Check exp claim

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
  "permissions": ["<all_permissions>"],
  "iat": <current_timestamp>,
  "exp": <current_timestamp + 900> // 15 minutes
}
```

**Expected Behavior:**
- Token expires in 15 minutes (900 seconds)
- iat (issued at) and exp (expiration) claims are present

---

## TC-SEC-011: No Sensitive Data in JWT Token

**Title:** Verify JWT token doesn't contain sensitive information

**Preconditions:**
- User `admin.smith` logs in successfully

**Steps:**
1. Decode JWT token
2. Verify no sensitive data in payload

**Request Body:**
```json
{
  "username": "admin.smith",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected JWT Payload:**
```json
{
  "sub": "<user_id>",
  "username": "admin.smith",
  "tenantId": "<tenant_uuid>",
  "roles": ["COMPANY_ADMIN"],
  "permissions": ["MANAGE_USERS", "VIEW_USERS", "VIEW_ROLES", "VIEW_PERMISSIONS"],
  "iat": <timestamp>,
  "exp": <timestamp>
}
```

**Expected Behavior:**
- No password hash
- No email address
- No personal information
- Only authorization-relevant claims

---

## TC-SEC-012: Tenant Validation on Login

**Title:** Verify tenant existence is validated duringconditions:**
- User `user.h login

**Preenry` exists with CLIENT role
- User's tenant has been deleted

**Steps:**
1. Attempt login with valid credentials

**Request Body:**
```json
{
  "username": "user.henry",
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
- User cannot login if their tenant doesn't exist
- Clear error message provided

---

## TC-SEC-013: Tenant Active Status Validation

**Title:** Verify tenant active status is validated during login

**Preconditions:**
- User `user.alice` exists with CLIENT role
- "Acme Corporation" tenant is deactivated

**Steps:**
1. Attempt login with valid credentials

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
  "message": "Tenant is deactivated"
}
```

**Expected Behavior:**
- User cannot login if their tenant is deactivated
- Clear error message provided

---

## TC-SEC-014: SUPER_ADMIN Exempt from Tenant Validation

**Title:** Verify SUPER_ADMIN can login without tenant

**Preconditions:**
- User `superadmin` exists with SUPER_ADMIN role
- User has no tenantId

**Steps:**
1. Attempt login with valid credentials

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
    "permissions": ["<all_permissions>"],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**
- SUPER_ADMIN can login without tenant validation
- tenantId and tenantName remain null

---

## TC-SEC-015: No Information Disclosure in Response Headers

**Title:** Verify response headers don't leak system information

**Preconditions:**
- None

**Steps:**
1. Send login request
2. Examine response headers

**Request Body:**
```json
{
  "username": "superadmin",
  "password": "WrongPassword"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**
- No X-Powered-By header
- No server version headers
- No detailed error traces in headers

---

## TC-SEC-016: Login with Very Old Password Hash

**Title:** Verify system handles legacy password hashes

**Preconditions:**
- User exists with old bcrypt hash format

**Steps:**
1. Attempt login with password

**Request Body:**
```json
{
  "username": "legacy_user",
  "password": "LegacyPassword123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**
- Login succeeds if password matches
- Old hash is updated to new format on successful login (if implemented)

---

## TC-SEC-017: Concurrent Login from Multiple Devices

**Title:** Verify multiple concurrent logins are allowed

**Preconditions:**
- User `user.bob` exists with CLIENT role

**Steps:**
1. Login from device 1
2. Login from device 2 with same credentials

**Request Body (both):**
```json
{
  "username": "user.bob",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**
- Both logins succeed
- Each device gets a separate JWT token
- No session invalidation (stateless JWT)

---

## TC-SEC-018: Login with Different Case Credentials

**Title:** Verify credential comparison is case-sensitive

**Preconditions:**
- User `user.carol` exists with password "User@123"

**Steps:**
1. Attempt login with "USER.CAROL" (uppercase)
2. Attempt login with "user.carol" (correct case)
3. Attempt login with "USER@123" (wrong case password)

**Request Body 1:**
```json
{
  "username": "USER.CAROL",
  "password": "User@123"
}
```

**Request Body 2:**
```json
{
  "username": "user.carol",
  "password": "USER@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**
- Request 1: 401 Invalid credentials (username case-sensitive)
- Request 2: 401 Invalid credentials (password case-sensitive)

---

## TC-SEC-019: Login Audit Logging

**Title:** Verify login attempts are logged for audit

**Preconditions:**
- User `user.david` exists with CLIENT role

**Steps:**
1. Attempt login with invalid credentials
2. Check audit logs

**Request Body:**
```json
{
  "username": "user.david",
  "password": "WrongPassword"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**
- Failed attempt is logged with:
  - Timestamp
  - Username attempted
  - IP address
  - Reason for failure

---

## TC-SEC-020: Successful Login Updates Last Login

**Title:** Verify successful login updates last login timestamp

**Preconditions:**
- User `user.emma` exists with CLIENT role
- User has old lastLoginAt value

**Steps:**
1. Login with valid credentials
2. Query user record

**Request Body:**
```json
{
  "username": "user.emma",
  "password": "User@123"
}
```

**API URL:** `POST /auth/login`

**Expected Database State:**
- lastLoginAt = current timestamp (within seconds)

---

## TC-SEC-021: No Username Padding Attacks

**Title:** Verify system is protected against username padding attacks

**Preconditions:**
- None

**Steps:**
1. Attempt login with username containing many spaces

**Request Body:**
```json
{
  "username": "                             superadmin                              ",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**
- Username is trimmed or rejected
- Returns 401 Invalid credentials
- No information about valid usernames

---

## TC-SEC-022: Login Timeout Handling

**Title:** Verify login request has reasonable timeout

**Preconditions:**
- None

**Steps:**
1. Send login request and measure response time

**Request Body:**
```json
{
  "username": "superadmin",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**
- Response time < 2 seconds
- No indefinite hangs

---

## TC-SEC-023: Login with Special Characters in Password

**Title:** Verify special characters are handled correctly

**Preconditions:**
- User `user.frank` has password "Pass@#$%123"

**Steps:**
1. Attempt login with special characters

**Request Body:**
```json
{
  "username": "user.frank",
  "password": "Pass@#$%123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (200 OK):**
```json
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "<user_id>",
    "username": "user.frank",
    "tenantId": "<tenant_uuid>",
    "tenantName": "Acme Corporation",
    "roles": ["CLIENT"],
    "permissions": ["VIEW_USERS"],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**
- Special characters are correctly processed
- Login succeeds with exact password match

---

## TC-SEC-024: Login Response Time for Invalid Credentials

**Title:** Verify response time is consistent for valid/invalid credentials

**Preconditions:**
- None

**Steps:**
1. Measure response time for valid credentials
2. Measure response time for invalid credentials
3. Compare times

**Request Body 1 (valid):**
```json
{
  "username": "superadmin",
  "password": "Admin@123"
}
```

**Request Body 2 (invalid):**
```json
{
  "username": "superadmin",
  "password": "WrongPassword"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**
- Response times are similar (within 50ms)
- No timing attack vulnerability
- Consistent response time prevents username enumeration

---

## TC-SEC-025: Login with Maximum Length Credentials

**Title:** Verify system handles maximum length credentials

**Preconditions:**
- User `max_user` exists with username "a".repeat(255) and password "b".repeat(100)

**Steps:**
1. Attempt login with max length credentials

**Request Body:**
```json
{
  "username": "a".repeat(255),
  "password": "b".repeat(100)
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**
- Request is accepted and processed
- Returns appropriate success/failure based on credentials

---

## Summary

| Test Case ID | Title | Expected Result |
|--------------|-------|-----------------|
| TC-SEC-001 | Lockout After 5 Failed Attempts | Account locked at 5 attempts |
| TC-SEC-002 | Lockout Duration 15 Minutes | lockedUntil = now + 15 min |
| TC-SEC-003 | Lockout Reset After Expiration | Login succeeds after expiration |
| TC-SEC-004 | Failed Counter Increments | loginAttempts incremented |
| TC-SEC-005 | Successful Login Resets Counter | loginAttempts = 0 |
| TC-SEC-006 | Password Strength Validation | Weak passwords rejected |
| TC-SEC-007 | No Password Enumeration | Generic error message |
| TC-SEC-008 | Rate Limiting Per IP | 429 after limit |
| TC-SEC-009 | No Active Status Enumeration | Error only after validation |
| TC-SEC-010 | JWT Token Expiration | Expires in 15 minutes |
| TC-SEC-011 | No Sensitive Data in JWT | Clean payload |
| TC-SEC-012 | Tenant Existence Validation | 401 if tenant missing |
| TC-SEC-013 | Tenant Active Validation | 401 if tenant inactive |
| TC-SEC-014 | SUPER_ADMIN Exempt | No tenant required |
| TC-SEC-015 | No Info Disclosure Headers | Clean headers |
| TC-SEC-016 | Legacy Password Hash | Handled correctly |
| TC-SEC-017 | Concurrent Login | Multiple tokens allowed |
| TC-SEC-018 | Case-Sensitive Credentials | Case matters |
| TC-SEC-019 | Login Audit Logging | Events logged |
| TC-SEC-020 | Last Login Updated | Timestamp refreshed |
| TC-SEC-021 | No Username Padding | Protected |
| TC-SEC-022 | Login Timeout | < 2 seconds |
| TC-SEC-023 | Special Characters | Handled correctly |
| TC-SEC-024 | Consistent Response Time | No timing attacks |
| TC-SEC-025 | Max Length Credentials | Handled correctly |
