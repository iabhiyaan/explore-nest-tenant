### Bugs:
1. Company Admin login/User login - if the username (user1.smith) is assigned to some tenant id [112-12-12] but while logging in user1.smith passes [333-333-333] this is different tenant id, login happens and correct user details with correct tenant id is fetched. This should not happen, login should fail if tenant id passed is different than assigned tenant id.

2. If invalid tenant id is passed in the request body while login, login still happens instead it should fail.

3. Is this correct way to pass tenant id in the request body while login? Shouldn't it be part of the header instead of request body?

4. **Security Issue**: JWT secret fallback to hardcoded 'default-secret' in JwtStrategy if config is not set - allows token forging if config is missing.

5. **Type Safety Issue**: In AuthService.login, `user.lockedUntil = null as any` - unnecessary type assertion, should be `null` since the field is nullable.

6. **Information Disclosure**: AuthService.getProfile returns full tenant object which may contain sensitive tenant information.

7. **Logic Issue**: Users can login without providing tenantId even if they belong to a specific tenant. Tenant-specific users should require tenantId in login request.

8. **Inconsistency**: AuthService.getProfile and ProfileService.getProfile return different field sets, causing confusion in API responses.

9. **Security Issue**: No rate limiting or progressive delays on failed login attempts - enables brute force attacks.

10. **FIXED**: Username uniqueness is global, but tenant scoping in login may not prevent cross-tenant authentication if tenantId is optional and user lookup falls back to global search. Fixed by requiring tenantId=null for global users when tenantId is not provided in login request.

