# Authentication Test Cases - Negative Scenarios

## Overview

Test cases for validating authentication edge cases, invalid inputs, and error handling scenarios.

---

## TC-NEG-001: Login with SQL Injection Attempt

**Title:** Verify login is protected against SQL injection

**Preconditions:**

- None

**Steps:**

1. Send POST request with SQL injection payload in username
2. Send POST request with SQL injection payload in password

**Request Body 1:**

```json
{
  "username": "' OR '1'='1",
  "password": "Admin@123"
}
```

**Request Body 2:**

```json
{
  "username": "superadmin",
  "password": "' OR '1'='1"
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

- Login fails with generic error
- No database errors are exposed
- System is protected against SQL injection

---

## TC-NEG-002: Login with XSS Payload

**Title:** Verify login is protected against XSS attacks

**Preconditions:**

- None

**Steps:**

1. Send POST request with XSS payload in username
2. Send POST request with XSS payload in password

**Request Body 1:**

```json
{
  "username": "<script>alert('xss')</script>",
  "password": "Admin@123"
}
```

**Request Body 2:**

```json
{
  "username": "superadmin",
  "password": "<img src=x onerror=alert(1)>"
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

- Login fails gracefully
- No XSS execution or error message leakage

---

## TC-NEG-003: Login with Extremely Long Username

**Title:** Verify login rejects username exceeding max length

**Preconditions:**

- None

**Steps:**

1. Send POST request with username of 500 characters

**Request Body:**

```json
{
  "username": "a".repeat(500),
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username must be shorter than or equal to 255 characters"]
}
```

**Expected Behavior:**

- Validation rejects overly long input
- Proper error message is returned

---

## TC-NEG-004: Login with Extremely Long Password

**Title:** Verify login rejects password exceeding max length

**Preconditions:**

- None

**Steps:**

1. Send POST request with password of 500 characters

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "a".repeat(500)
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["password must be shorter than or equal to 100 characters"]
}
```

**Expected Behavior:**

- Validation rejects overly long input
- Proper error message is returned

---

## TC-NEG-005: Login with Null Values

**Title:** Verify login rejects null values for required fields

**Preconditions:**

- None

**Steps:**

1. Send POST request with null username
2. Send POST request with null password

**Request Body 1:**

```json
{
  "username": null,
  "password": "Admin@123"
}
```

**Request Body 2:**

```json
{
  "username": "superadmin",
  "password": null
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username should not be null", "password should not be null"]
}
```

**Expected Behavior:**

- Validation rejects null values
- Proper error messages are returned

---

## TC-NEG-006: Login with Numeric Values in String Fields

**Title:** Verify login rejects numeric values in string fields

**Preconditions:**

- None

**Steps:**

1. Send POST request with numeric username (treated as string)

**Request Body:**

```json
{
  "username": 12345,
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username must be a string"]
}
```

**Expected Behavior:**

- Type validation rejects numeric values
- Proper error message is returned

---

## TC-NEG-007: Login with JSON Object in String Fields

**Title:** Verify login rejects object values in string fields

**Preconditions:**

- None

**Steps:**

1. Send POST request with object as username

**Request Body:**

```json
{
  "username": { "value": "superadmin" },
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username must be a string"]
}
```

**Expected Behavior:**

- Type validation rejects object values
- Proper error message is returned

---

## TC-NEG-008: Login with Array in String Fields

**Title:** Verify login rejects array values in string fields

**Preconditions:**

- None

**Steps:**

1. Send POST request with array as username

**Request Body:**

```json
{
  "username": ["superadmin", "admin"],
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username must be a string"]
}
```

**Expected Behavior:**

- Type validation rejects array values
- Proper error message is returned

---

## TC-NEG-009: Login with Whitespace-Only Values

**Title:** Verify login rejects whitespace-only values

**Preconditions:**

- None

**Steps:**

1. Send POST request with whitespace-only username
2. Send POST request with whitespace-only password

**Request Body 1:**

```json
{
  "username": "   ",
  "password": "Admin@123"
}
```

**Request Body 2:**

```json
{
  "username": "superadmin",
  "password": "      "
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

- Login fails (whitespace doesn't match actual username/password)
- No validation error thrown (field is not empty string)

---

## TC-NEG-010: Login with Unicode Characters

**Title:** Verify login handles Unicode characters in credentials

**Preconditions:**

- None

**Steps:**

1. Send POST request with Unicode characters in username

**Request Body:**

```json
{
  "username": "admin_test",
  "password": "пароль密码🔐"
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

- System handles Unicode input gracefully
- Login fails as credentials don't match

---

## TC-NEG-011: Login with Trailing/Leading Spaces

**Title:** Verify login treats credentials with spaces as invalid

**Preconditions:**

- User `superadmin` exists with password "Admin@123"

**Steps:**

1. Send POST request with leading space in username
2. Send POST request with trailing space in password

**Request Body 1:**

```json
{
  "username": " superadmin",
  "password": "Admin@123"
}
```

**Request Body 2:**

```json
{
  "username": "superadmin",
  "password": "Admin@123 "
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

- Credentials with extra spaces are treated as invalid
- Exact match is required

---

## TC-NEG-012: Login Missing Request Body

**Title:** Verify login handles missing request body

**Preconditions:**

- None

**Steps:**

1. Send POST request with empty body

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username should not be empty", "password should not be empty"]
}
```

**Expected Behavior:**

- Validation fails for missing fields
- Proper error messages are returned

---

## TC-NEG-013: Login with Malformed JSON

**Title:** Verify login handles malformed JSON gracefully

**Preconditions:**

- None

**Steps:**

1. Send POST request with malformed JSON body

**Request Body:**

```json
{
  "username": "superadmin"
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

**Expected Behavior:**

- Server returns JSON parse error
- No stack trace exposed to client

---

## TC-NEG-014: Login with Extra Unknown Fields

**Title:** Verify login ignores unknown fields in request

**Preconditions:**

- User `superadmin` exists with password "Admin@123"

**Steps:**

1. Send POST request with extra unknown fields

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "Admin@123",
  "unknownField": "value",
  "anotherField": 123
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

- Unknown fields are ignored
- Login succeeds with valid credentials

---

## TC-NEG-015: Login with Invalid Tenant ID Format

**Title:** Verify login validates tenant ID format

**Preconditions:**

- None

**Steps:**

1. Send POST request with invalid tenant ID format

**Request Body:**

```json
{
  "username": "admin.smith",
  "password": "Admin@123",
  "tenantId": "not-a-uuid"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Request is accepted (tenantId is optional)
- Validation occurs during tenant lookup
- Returns appropriate error if tenant not found

---

## TC-NEG-016: Multiple Rapid Login Attempts

**Title:** Verify rate limiting on login endpoint

**Preconditions:**

- None

**Steps:**

1. Send 10 rapid login requests with invalid credentials
2. Check if rate limiting is applied

**Request Body (repeated):**

```json
{
  "username": "superadmin",
  "password": "wrongpassword"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Requests are processed (rate limiting at application level tracks per user)
- After 5 failed attempts, account lockout occurs
- May receive 429 Too Many Requests if IP-based rate limiting is enabled

---

## TC-NEG-017: Login with Expired JWT in Header

**Title:** Verify login endpoint doesn't require authentication

**Preconditions:**

- None

**Steps:**

1. Send POST request with expired JWT in Authorization header

**Request:**

```
POST /auth/login HTTP/1.1
Content-Type: application/json
Authorization: Bearer <expired_jwt_token>

{
  "username": "superadmin",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Login endpoint is public (no authentication required)
- Expired token is ignored
- New token is issued upon successful authentication

---

## TC-NEG-018: Login with Missing Content-Type

**Title:** Verify login handles missing Content-Type header

**Preconditions:**

- None

**Steps:**

1. Send POST request without Content-Type header

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Behavior:**

- Server can parse JSON body
- Login succeeds or fails based on credentials

---

## TC-NEG-019: Login with Wrong HTTP Method

**Title:** Verify login rejects non-POST requests

**Preconditions:**

- None

**Steps:**

1. Send GET request to /auth/login
2. Send PUT request to /auth/login

**API URL:** `GET /auth/login`
**API URL:** `PUT /auth/login`

**Expected Response (405 Method Not Allowed):**

```json
{
  "statusCode": 405,
  "message": "Method Not Allowed"
}
```

**Expected Behavior:**

- Only POST method is accepted
- Proper error for other methods

---

## TC-NEG-020: Login with Bearer Token Instead of Body

**Title:** Verify login requires credentials in body

**Preconditions:**

- None

**Steps:**

1. Send POST request with Authorization header but empty body

**Request:**

```
POST /auth/login HTTP/1.1
Content-Type: application/json
Authorization: Bearer some_token

{}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["username should not be empty"]
}
```

**Expected Behavior:**

- Authorization header is ignored for login
- Credentials must be in request body

---

## TC-NEG-021: Deactivated User Login After Reactivation

**Title:** Verify deactivated user can login after reactivation

**Preconditions:**

- User `user.alice` exists with CLIENT role
- User's isActive is set to false
- User is reactivated (isActive = true)

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

- Login succeeds after account reactivation
- No residual lockout effects

---

## TC-NEG-022: Login After Lockout Expires

**Title:** Verify login works after lockout period expires

**Preconditions:**

- User `user.bob` exists with CLIENT role
- User was locked for 15 minutes
- Current time is past lockedUntil timestamp

**Steps:**

1. Send POST request to `/auth/login` with valid credentials

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
    "id": "<user_id>",
    "username": "user.bob",
    "tenantId": "<tenant_uuid>",
    "tenantName": "Acme Corporation",
    "roles": ["CLIENT"],
    "permissions": ["VIEW_USERS"],
    "lastLogin": "<timestamp>"
  }
}
```

**Expected Behavior:**

- Login succeeds after lockout expires
- loginAttempts reset to 0

---

## TC-NEG-023: Login with Password Hash Instead of Plain Text

**Title:** Verify login rejects password hash

**Preconditions:**

- User `superadmin` exists with hashed password in database

**Steps:**

1. Send POST request with password hash instead of plain text

**Request Body:**

```json
{
  "username": "superadmin",
  "password": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.LZ6nHTlMWx8lQ1K4uC"
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

- Login fails (hash doesn't match expected format)
- Plain text password is required

---

## TC-NEG-024: Login with Username as Password and Vice Versa

**Title:** Verify login rejects swapped credentials

**Preconditions:**

- User `superadmin` exists with password "Admin@123"

**Steps:**

1. Send POST request with swapped credentials

**Request Body:**

```json
{
  "username": "Admin@123",
  "password": "superadmin"
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

- Login fails (credentials don't match)
- Order matters

---

## TC-NEG-025: Login with Partial Credentials

**Title:** Verify login rejects incomplete credentials

**Preconditions:**

- None

**Steps:**

1. Send POST request with only username
2. Send POST request with only password

**Request Body 1:**

```json
{
  "username": "superadmin"
}
```

**Request Body 2:**

```json
{
  "password": "Admin@123"
}
```

**API URL:** `POST /auth/login`

**Expected Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["password should not be empty"]
}
```

or

```json
{
  "statusCode": 400,
  "message": ["username should not be empty"]
}
```

**Expected Behavior:**

- Validation rejects missing fields
- Both fields are required

---

## Summary

| Test Case ID | Title                          | Expected Result           |
| ------------ | ------------------------------ | ------------------------- |
| TC-NEG-001   | SQL Injection Attempt          | Protected, 401            |
| TC-NEG-002   | XSS Payload                    | Protected, 401            |
| TC-NEG-003   | Long Username                  | 400 Bad Request           |
| TC-NEG-004   | Long Password                  | 400 Bad Request           |
| TC-NEG-005   | Null Values                    | 400 Bad Request           |
| TC-NEG-006   | Numeric in String Fields       | 400 Bad Request           |
| TC-NEG-007   | Object in String Fields        | 400 Bad Request           |
| TC-NEG-008   | Array in String Fields         | 400 Bad Request           |
| TC-NEG-009   | Whitespace-Only Values         | 401 (no match)            |
| TC-NEG-010   | Unicode Characters             | 401 (no match)            |
| TC-NEG-011   | Trailing/Leading Spaces        | 401 (no match)            |
| TC-NEG-012   | Missing Request Body           | 400 Bad Request           |
| TC-NEG-013   | Malformed JSON                 | 400 Bad Request           |
| TC-NEG-014   | Extra Unknown Fields           | Ignored, login proceeds   |
| TC-NEG-015   | Invalid Tenant ID Format       | 401 or validation error   |
| TC-NEG-016   | Rapid Login Attempts           | Rate limited/locked       |
| TC-NEG-017   | Expired JWT in Header          | Ignored, new token issued |
| TC-NEG-018   | Missing Content-Type           | Handled gracefully        |
| TC-NEG-019   | Wrong HTTP Method              | 405 Method Not Allowed    |
| TC-NEG-020   | Bearer Token Instead of Body   | 400 Bad Request           |
| TC-NEG-021   | Deactivated User Reactivated   | 200 OK                    |
| TC-NEG-022   | Login After Lockout Expires    | 200 OK                    |
| TC-NEG-023   | Password Hash Instead of Plain | 401                       |
| TC-NEG-024   | Swapped Credentials            | 401                       |
| TC-NEG-025   | Partial Credentials            | 400 Bad Request           |
