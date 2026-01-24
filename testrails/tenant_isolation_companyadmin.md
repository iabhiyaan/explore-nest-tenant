# Tenant Isolation Test Cases - COMPANY_ADMIN Management API

## Overview

Test cases for validating tenant isolation in COMPANY_ADMIN management APIs. Ensures that COMPANY_ADMIN users from one tenant cannot access, modify, or delete resources from another tenant.

## Test User Credentials

| Username    | Password  | Role          | Tenant             | User ID            |
| ----------- | --------- | ------------- | ------------------ | ------------------ |
| admin.smith | Admin@123 | COMPANY_ADMIN | Acme Corporation   | uuid-acme-admin-1  |
| admin.chen  | Admin@123 | COMPANY_ADMIN | TechCorp Solutions | uuid-techcorp-1    |
| admin.patel | Admin@123 | COMPANY_ADMIN | Global Industries  | uuid-global-1      |

---

## TC-TI-001: COMPANY_ADMIN Cannot Update Other Tenant's COMPANY_ADMIN

**Title:** Verify Tenant 1 COMPANY_ADMIN cannot update Tenant 2 COMPANY_ADMIN user

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation" (tenant-1)
- `admin.chen` is COMPANY_ADMIN for "TechCorp Solutions" (tenant-2)
- Both admin users exist and are active
- `admin.chen` has user ID `uuid-techcorp-1`

**Steps:**

1. Login as `admin.smith` (Acme Corporation)
2. Obtain JWT token with tenantId = `tenant-1-uuid`
3. Send PATCH request to `/users/uuid-techcorp-1`

**Request Body:**

```json
{
  "username": "admin.chenModified",
  "email": "modified@techcorp.com",
  "isActive": false
}
```

**API URL:** `PATCH /users/uuid-techcorp-1`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
Content-Type: application/json
```

**Expected Response (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Access denied. You can only manage users within your own tenant.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- Request is rejected with 403 Forbidden
- `admin.chen` data remains unchanged
- Audit log records unauthorized access attempt

---

## TC-TI-002: COMPANY_ADMIN Cannot View Other Tenant's COMPANY_ADMIN

**Title:** Verify Tenant 1 COMPANY_ADMIN cannot view Tenant 2 COMPANY_ADMIN details

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- `admin.chen` is COMPANY_ADMIN for "TechCorp Solutions"

**Steps:**

1. Login as `admin.smith`
2. Send GET request to `/users/uuid-techcorp-1`

**API URL:** `GET /users/uuid-techcorp-1`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
```

**Expected Response (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Access denied. You can only manage users within your own tenant.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- Request is rejected
- No user details from other tenant are exposed

---

## TC-TI-003: COMPANY_ADMIN Cannot Delete Other Tenant's COMPANY_ADMIN

**Title:** Verify Tenant 1 COMPANY_ADMIN cannot delete Tenant 2 COMPANY_ADMIN

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- `admin.chen` is COMPANY_ADMIN for "TechCorp Solutions"
- `admin.chen` has user ID `uuid-techcorp-1`

**Steps:**

1. Login as `admin.smith`
2. Send DELETE request to `/users/uuid-techcorp-1`

**API URL:** `DELETE /users/uuid-techcorp-1`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
```

**Expected Response (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Access denied. You can only manage users within your own tenant.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- `admin.chen` account remains active
- Request is rejected with proper error message

---

## TC-TI-004: COMPANY_ADMIN Cannot Update Other Tenant's Regular Users

**Title:** Verify Tenant 1 COMPANY_ADMIN cannot update Tenant 2 regular users (CLIENT role)

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- `user.lisa` is CLIENT for "TechCorp Solutions" with user ID `uuid-techcorp-user-1`
- `user.lisa` exists and is active

**Steps:**

1. Login as `admin.smith`
2. Send PATCH request to `/users/uuid-techcorp-user-1`

**Request Body:**

```json
{
  "firstName": "HackedFirstName",
  "lastName": "HackedLastName"
}
```

**API URL:** `PATCH /users/uuid-techcorp-user-1`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
Content-Type: application/json
```

**Expected Response (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Access denied. You can only manage users within your own tenant.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- `user.lisa` data remains unchanged
- Cross-tenant modification is blocked

---

## TC-TI-005: COMPANY_ADMIN Cannot List Other Tenant's Users

**Title:** Verify Tenant 1 COMPANY_ADMIN cannot list users from Tenant 2

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- Multiple users exist in "TechCorp Solutions" tenant

**Steps:**

1. Login as `admin.smith`
2. Send GET request to `/users?search=techcorp`

**API URL:** `GET /users?search=techcorp`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
```

**Expected Response (200 OK):**

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10
  }
}
```

**Expected Behavior:**

- Only users from Acme Corporation are returned
- No users from TechCorp Solutions appear in results

---

## TC-TI-006: COMPANY_ADMIN Cannot Create User for Other Tenant

**Title:** Verify Tenant 1 COMPANY_ADMIN cannot create user assigned to Tenant 2

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- Tenant IDs are known for both tenants

**Steps:**

1. Login as `admin.smith`
2. Send POST request to `/users` with Tenant 2's tenantId

**Request Body:**

```json
{
  "username": "newuser",
  "email": "newuser@techcorp.com",
  "password": "Password123",
  "firstName": "New",
  "lastName": "User",
  "tenantId": "<techcorp_tenant_uuid>"
}
```

**API URL:** `POST /users`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
Content-Type: application/json
```

**Expected Response (400 Bad Request) or (403 Forbidden):**

```json
{
  "statusCode": 400,
  "message": "Cannot create user for a different tenant."
}
```

**Expected Behavior:**

- User creation is rejected
- User is not created in any tenant

---

## TC-TI-007: COMPANY_ADMIN Can Update Own Tenant's Users

**Title:** Verify Tenant 1 COMPANY_ADMIN can update users within own tenant

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- `userice` is CLIENT for "Acme.al Corporation" with user ID `uuid-acme-user-1`

**Steps:**

1. Login as `admin.smith`
2. Send PATCH request to `/users/uuid-acme-user-1`

**Request Body:**

```json
{
  "firstName": "AliceUpdated",
  "lastName": "SmithUpdated"
}
```

**API URL:** `PATCH /users/uuid-acme-user-1`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
Content-Type: application/json
```

**Expected Response (200 OK):**

```json
{
  "id": "uuid-acme-user-1",
  "firstName": "AliceUpdated",
  "lastName": "SmithUpdated",
  "tenantId": "<acme_tenant_uuid>",
  "updatedAt": "<timestamp>"
}
```

**Expected Behavior:**

- User is successfully updated
- Response includes updated user data

---

## TC-TI-008: COMPANY_ADMIN Cannot Access Other Tenant by Manipulating ID

**Title:** Verify tenant isolation even when user ID from other tenant is known

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- `admin.chen` is COMPANY_ADMIN for "TechCorp Solutions" with UUID `uuid-techcorp-1`

**Steps:**

1. Login as `admin.smith`
2. Attempt to access `admin.chen` using exact UUID
3. Repeat with GET, PATCH, DELETE operations

**API URLs:**
- `GET /users/uuid-techcorp-1`
- `PATCH /users/uuid-techcorp-1`
- `DELETE /users/uuid-techcorp-1`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
```

**Expected Behavior:**

- All operations return 403 Forbidden
- No data from other tenant is exposed
- Request is rejected before any database query

---

## TC-TI-009: Token with Wrong Tenant Cannot Access Other Tenant Data

**Title:** Verify JWT token enforces tenant scope at API level

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- `admin.chen` is COMPANY_ADMIN for "TechCorp Solutions"

**Steps:**

1. Login as `admin.smith` (gets token with tenant-1)
2. Attempt to access user from TechCorp using various methods:
   - Direct ID reference
   - Query parameters with other tenant ID

**API URLs:**
- `GET /users/uuid-techcorp-1`
- `GET /users?tenantId=techcorp_tenant_uuid`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
```

**Expected Response (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Access denied. You can only manage users within your own tenant.",
  "error": "Forbidden"
}
```

**Expected Behavior:**

- All cross-tenant access attempts are blocked
- Token's tenant scope is enforced at service level

---

## TC-TI-010: COMPANY_ADMIN List Returns Only Own Tenant Users

**Title:** Verify user list endpoint returns only users from requesting admin's tenant

**Preconditions:**

- `admin.smith` is COMPANY_ADMIN for "Acme Corporation"
- 5 users exist in "Acme Corporation"
- 10 users exist in "TechCorp Solutions"

**Steps:**

1. Login as `admin.smith`
2. Send GET request to `/users`

**API URL:** `GET /users`

**Request Headers:**

```
Authorization: Bearer <tenant1_admin_jwt_token>
```

**Expected Response (200 OK):**

```json
{
  "data": [
    {
      "id": "<uuid>",
      "username": "user.xxx",
      "tenantId": "<acme_tenant_uuid>",
      "roles": ["CLIENT"],
      "isActive": true
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

**Expected Behavior:**

- Only 5 users from Acme Corporation are returned
- No users from TechCorp Solutions appear
- Total count reflects only own tenant's users

---

## Summary

| Test Case ID | Title                                              | Expected Result      |
| ------------ | -------------------------------------------------- | -------------------- |
| TC-TI-001    | COMPANY_ADMIN Cannot Update Other Tenant's Admin   | 403 Forbidden        |
| TC-TI-002    | COMPANY_ADMIN Cannot View Other Tenant's Admin     | 403 Forbidden        |
| TC-TI-003    | COMPANY_ADMIN Cannot Delete Other Tenant's Admin   | 403 Forbidden        |
| TC-TI-004    | COMPANY_ADMIN Cannot Update Other Tenant's Users   | 403 Forbidden        |
| TC-TI-005    | COMPANY_ADMIN Cannot List Other Tenant's Users     | 200 OK (empty/data)  |
| TC-TI-006    | COMPANY_ADMIN Cannot Create User for Other Tenant  | 400/403 Error        |
| TC-TI-007    | COMPANY_ADMIN Can Update Own Tenant's Users        | 200 OK               |
| TC-TI-008    | COMPANY_ADMIN Cannot Access Other Tenant by ID     | 403 Forbidden        |
| TC-TI-009    | Token Tenant Scope Enforced                        | 403 Forbidden        |
| TC-TI-010    | List Returns Only Own Tenant Users                 | 200 OK               |
