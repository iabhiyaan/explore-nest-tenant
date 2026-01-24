# Tenant Isolation Test Cases - User Profile API

## Overview

Test cases for validating tenant isolation in User Profile APIs. Ensures that regular users (CLIENT role) from one tenant cannot access, view, or modify profiles of users from another tenant.

## Test User Credentials

| Username    | Password | Role   | Tenant             | User ID            |
| ----------- | -------- | ------ | ------------------ | ------------------ |
| user.alice  | User@123 | CLIENT | Acme Corporation   | uuid-acme-user-1   |
| user.bob    | User@123 | CLIENT | Acme Corporation   | uuid-acme-user-2   |
| user.lisa   | User@123 | CLIENT | TechCorp Solutions | uuid-techcorp-1    |
| user.kevin  | User@123 | CLIENT | TechCorp Solutions | uuid-techcorp-2    |
| user.thomas | User@123 | CLIENT | Global Industries  | uuid-global-1      |

---

## TC-USR-TI-001: User Cannot Update Other Tenant's User Profile

**Title:** Verify Tenant 1 user cannot update Tenant 2 user's profile

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation" (tenant-1)
- `user.lisa` is CLIENT for "TechCorp Solutions" (tenant-2)
- `user.lisa` has user ID `uuid-techcorp-1`
- Both users have active accounts

**Steps:**

1. Login as `user.alice` (Acme Corporation)
2. Obtain JWT token with tenantId = `tenant-1-uuid`
3. Send PATCH request to `/auth/profile` with `userId` parameter targeting other tenant

**Request Body:**

```json
{
  "firstName": "HackedAlice",
  "lastName": "HackedProfile",
  "email": "hacked@techcorp.com"
}
```

**Alternative - Attempt direct user ID access:**

```json
{
  "targetUserId": "uuid-techcorp-1",
  "firstName": "HackedAlice"
}
```

**API URL:** `PATCH /auth/profile`

**Request Headers:**

```
Authorization: Bearer <tenant1_user_jwt_token>
Content-Type: application/json
```

**Expected Response (403 Forbidden) or (400 Bad Request):**

```json
{
  "statusCode": 403,
  "message": "Access denied. You can only update your own profile.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- Request is rejected with 403 Forbidden
- `user.lisa` profile remains unchanged
- Audit log records unauthorized access attempt

---

## TC-USR-TI-002: User Cannot View Other Tenant's User Profile

**Title:** Verify Tenant 1 user cannot view Tenant 2 user's profile details

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- `user.lisa` is CLIENT for "TechCorp Solutions"
- `user.lisa` has user ID `uuid-techcorp-1`

**Steps:**

1. Login as `user.alice`
2. Attempt to access profile endpoint with other user ID

**API URL:** `GET /auth/profile?userId=uuid-techcorp-1`

**Request Headers:**

```
Authorization: Bearer <tenant1_user_jwt_token>
```

**Expected Response (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Access denied. You can only view your own profile.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- Request is rejected
- No profile data from other tenant is exposed

---

## TC-USR-TI-003: User Cannot Change Other Tenant's User Password

**Title:** Verify Tenant 1 user cannot change Tenant 2 user's password

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- `user.lisa` is CLIENT for "TechCorp Solutions"
- `user.lisa` has user ID `uuid-techcorp-1`

**Steps:**

1. Login as `user.alice`
2. Send POST request to `/auth/change-password` attempting to change other user's password

**Request Body:**

```json
{
  "userId": "uuid-techcorp-1",
  "currentPassword": "User@123",
  "newPassword": "HackedPassword123!"
}
```

**Alternative - Direct password change attempt:**

If the API uses authenticated user context:

1. Modify request to include target user ID in body

**API URL:** `POST /auth/change-password`

**Request Headers:**

```
Authorization: Bearer <tenant1_user_jwt_token>
Content-Type: application/json
```

**Expected Response (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Access denied. You can only change your own password.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- Password change is rejected
- `user.lisa` password remains unchanged

---

## TC-USR-TI-004: User Cannot Access User List from Other Tenant

**Title:** Verify Tenant 1 user cannot list users from Tenant 2

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- User listing endpoint exists with tenant scoping

**Steps:**

1. Login as `user.alice`
2. Send GET request to `/users` or similar endpoint

**API URL:** `GET /users`

**Request Headers:**

```
Authorization: Bearer <tenant1_user_jwt_token>
```

**Expected Response (403 Forbidden) or (200 OK with empty):**

```json
{
  "statusCode": 403,
  "message": "Access denied. Insufficient permissions.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- CLIENT role has limited access
- No user data from other tenants is exposed

---

## TC-USR-TI-005: User Can Update Own Profile

**Title:** Verify user can update their own profile within tenant

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- `user.alice` has user ID `uuid-acme-user-1`

**Steps:**

1. Login as `user.alice`
2. Send PATCH request to `/auth/profile`

**Request Body:**

```json
{
  "firstName": "AliceUpdated",
  "lastName": "SmithUpdated",
  "phone": "+1-555-123-4567"
}
```

**API URL:** `PATCH /auth/profile`

**Request Headers:**

```
Authorization: Bearer <tenant1_user_jwt_token>
Content-Type: application/json
```

**Expected Response (200 OK):**

```json
{
  "id": "uuid-acme-user-1",
  "username": "user.alice",
  "firstName": "AliceUpdated",
  "lastName": "SmithUpdated",
  "email": "user.alice@acme.com",
  "tenantId": "<acme_tenant_uuid>",
  "updatedAt": "<timestamp>"
}
```

**Expected Behavior:**

- Profile is successfully updated
- Only own profile data is modified
- Response reflects updated values

---

## TC-USR-TI-006: User Can View Own Profile

**Title:** Verify user can view their own profile

**Preconditions:**

- `user.bob` is CLIENT for "Acme Corporation"

**Steps:**

1. Login as `user.bob`
2. Send GET request to `/auth/profile`

**API URL:** `GET /auth/profile`

**Request Headers:**

```
Authorization: Bearer <tenant1_user_jwt_token>
```

**Expected Response (200 OK):**

```json
{
  "id": "uuid-acme-user-2",
  "username": "user.bob",
  "firstName": "Bob",
  "lastName": "Johnson",
  "email": "user.bob@acme.com",
  "tenantId": "<acme_tenant_uuid>",
  "roles": ["CLIENT"]
}
```

**Expected Behavior:**

- Own profile data is returned
- No data from other users is included

---

## TC-USR-TI-007: User Cannot Modify Profile Using Other User's Token

**Title:** Verify profile update uses authenticated user ID from token

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- `user.bob` is CLIENT for "Acme Corporation" (same tenant)

**Steps:**

1. Login as `user.alice` to get JWT token
2. Attempt to update `user.bob`'s profile by manipulating request

**Request Body:**

```json
{
  "targetUserId": "uuid-acme-user-2",
  "firstName": "AliceHackedBob"
}
```

**API URL:** `PATCH /auth/profile`

**Request Headers:**

```
Authorization: Bearer <alice_jwt_token>
Content-Type: application/json
```

**Expected Response (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Access denied. You can only update your own profile.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- Profile update is rejected
- Even same-tenant users cannot modify each other's profiles

---

## TC-USR-TI-008: Tenant Isolation Enforced in Profile Response

**Title:** Verify profile response contains only user's tenant data

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- Multiple tenants exist in the system

**Steps:**

1. Login as `user.alice`
2. Send GET request to `/auth/profile`
3. Examine response for any cross-tenant data leakage

**API URL:** `GET /auth/profile`

**Request Headers:**

```
Authorization: Bearer <tenant1_user_jwt_token>
```

**Expected Response (200 OK):**

```json
{
  "id": "uuid-acme-user-1",
  "username": "user.alice",
  "tenantId": "<acme_tenant_uuid>",
  "tenantName": "Acme Corporation",
  "roles": ["CLIENT"],
  "permissions": ["VIEW_USERS"]
}
```

**Expected Behavior:**

- Response includes correct tenantId
- No references to other tenants
- No data from other tenant users

---

## TC-USR-TI-009: Profile Update Preserves Tenant Association

**Title:** Verify profile update does not allow tenant change

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"

**Steps:**

1. Login as `user.alice`
2. Send PATCH request attempting to change tenant

**Request Body:**

```json
{
  "firstName": "Alice",
  "tenantId": "<techcorp_tenant_uuid>"
}
```

**API URL:** `PATCH /auth/profile`

**Request Headers:**

```
Authorization: Bearer <tenant1_user_jwt_token>
Content-Type: application/json
```

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Cannot change tenant association through profile update."
}
```

**Expected Behavior:**

- Tenant field is ignored or rejected
- User remains associated with original tenant

---

## TC-USR-TI-010: User Profile Isolation with Expired Token of Other Tenant

**Title:** Verify profile access fails with token from different tenant context

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- `user.lisa` is CLIENT for "TechCorp Solutions"
- Token for `user.lisa` is available

**Steps:**

1. Login as `user.lisa` (TechCorp Solutions)
2. Send GET request to `/auth/profile`
3. Verify response contains TechCorp tenant data

**API URL:** `GET /auth/profile`

**Request Headers:**

```
Authorization: Bearer <techcorp_user_jwt_token>
```

**Expected Response (200 OK):**

```json
{
  "id": "uuid-techcorp-1",
  "username": "user.lisa",
  "tenantId": "<techcorp_tenant_uuid>",
  "tenantName": "TechCorp Solutions"
}
```

**Expected Behavior:**

- Only TechCorp tenant data is accessible
- No Acme Corporation data is visible
- Tenant isolation is enforced per token

---

## TC-USR-TI-011: User Cannot Access Admin Endpoints of Other Tenants

**Title:** Verify regular users cannot access admin endpoints for other tenants

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- `admin.chen` is COMPANY_ADMIN for "TechCorp Solutions"
- User ID `uuid-techcorp-1` exists for admin.chen

**Steps:**

1. Login as `user.alice`
2. Attempt to access admin endpoints

**API URLs:**
- `GET /users/uuid-techcorp-1`
- `PATCH /users/uuid-techcorp-1`

**Request Headers:**

```
Authorization: Bearer <tenant1_user_jwt_token>
```

**Expected Response (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Access denied. Insufficient permissions.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- CLIENT role cannot access admin operations
- Even same user ID across tenants is blocked
- Role-based access control works with tenant isolation

---

## TC-USR-TI-012: Concurrent Profile Access from Different Tenants

**Title:** Verify simultaneous profile access maintains tenant isolation

**Preconditions:**

- `user.alice` is CLIENT for "Acme Corporation"
- `user.lisa` is CLIENT for "TechCorp Solutions"
- Both users are logged in simultaneously

**Steps:**

1. Login both users to obtain JWT tokens
2. Both users send GET requests to `/auth/profile` simultaneously
3. Verify each receives only their own profile

**API URL:** `GET /auth/profile` (concurrent requests)

**Expected Behavior:**

- Each request returns correct user's profile
- No data mixing between tenants
- Each profile response contains only own tenant data

---

## Summary

| Test Case ID    | Title                                              | Expected Result      |
| --------------- | -------------------------------------------------- | -------------------- |
| TC-USR-TI-001   | User Cannot Update Other Tenant's Profile          | 403 Forbidden        |
| TC-USR-TI-002   | User Cannot View Other Tenant's Profile            | 403 Forbidden        |
| TC-USR-TI-003   | User Cannot Change Other Tenant's Password         | 403 Forbidden        |
| TC-USR-TI-004   | User Cannot Access User List from Other Tenant     | 403 Forbidden        |
| TC-USR-TI-005   | User Can Update Own Profile                        | 200 OK               |
| TC-USR-TI-006   | User Can View Own Profile                          | 200 OK               |
| TC-USR-TI-007   | User Cannot Modify Other User's Profile            | 403 Forbidden        |
| TC-USR-TI-008   | Profile Response Contains Only Own Tenant Data     | 200 OK               |
| TC-USR-TI-009   | Profile Update Preserves Tenant                    | 400 Bad Request      |
| TC-USR-TI-010   | Profile Access with Different Tenant Token         | 200 OK (own tenant)  |
| TC-USR-TI-011   | User Cannot Access Admin Endpoints Other Tenant    | 403 Forbidden        |
| TC-USR-TI-012   | Concurrent Profile Access Isolation                | 200 OK each          |
