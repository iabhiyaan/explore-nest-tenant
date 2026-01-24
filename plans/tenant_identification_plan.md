# Tenant Identification via Slug & Custom Domain

## Problem Statement

Currently, the login endpoint requires a `tenantId` (UUID) to identify which tenant the user belongs to. This is impractical for frontend applications because:

1. **Company Admins** landing on a URL like `acme.app.com` have no way to know their tenant UUID
2. **Tenant Clients** (end-users of a tenant's platform) face the same issue when accessing tenant-specific URLs

We need a mechanism to identify tenants using **URL-based identifiers** (slugs or custom domains) that are human-readable and determinable from the browser.

---

## User Roles Affected

| Role | Current Flow | Proposed Flow |
|------|--------------|---------------|
| **Super Admin** | Login with `tenantId: null` | No change (global login) |
| **Company Admin** | Login with tenant UUID | Login via subdomain `acme.app.com` or custom domain `admin.acme.com` |
| **Tenant Client** | Login with tenant UUID | Login via subdomain `acme-client.app.com` or custom domain `portal.acme.com` |

---

## Proposed Changes

### 1. Database Schema Changes

#### [MODIFY] [tenant.entity.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/database/entities/tenant.entity.ts)

Add two new columns to the `Tenant` entity:

```typescript
// Slug for subdomain-based identification (e.g., "acme" for acme.app.com)
@Column({ unique: true, length: 100 })
slug: string;

// Optional custom domain for white-label scenarios (e.g., "portal.acme.com")
@Column({ name: 'custom_domain', unique: true, nullable: true, length: 255 })
customDomain: string | null;
```

---

### 2. Auth Service Changes

#### [MODIFY] [login.dto.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/auth/dto/login.dto.ts)

Add optional `tenantSlug` and `tenantDomain` fields:

```typescript
@IsString()
@IsOptional()
@MaxLength(100)
tenantSlug?: string;

@IsString()
@IsOptional()
@MaxLength(255)
tenantDomain?: string;
```

#### [MODIFY] [auth.service.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/auth/auth.service.ts)

Update the `login()` method to resolve tenant from `slug`, `customDomain`, or `tenantId`:

```typescript
async login(loginDto: LoginDto) {
  let tenant: Tenant | null = null;

  // Priority: tenantId > tenantDomain > tenantSlug
  if (loginDto.tenantId) {
    tenant = await this.tenantRepository.findOne({ where: { id: loginDto.tenantId } });
    if (!tenant) throw new UnauthorizedException('Invalid tenant ID');
  } else if (loginDto.tenantDomain) {
    tenant = await this.tenantRepository.findOne({ where: { customDomain: loginDto.tenantDomain } });
    if (!tenant) throw new UnauthorizedException('Invalid domain');
  } else if (loginDto.tenantSlug) {
    tenant = await this.tenantRepository.findOne({ where: { slug: loginDto.tenantSlug } });
    if (!tenant) throw new UnauthorizedException('Invalid tenant');
  }

  if (tenant && !tenant.isActive) {
    throw new UnauthorizedException('Tenant is deactivated');
  }

  const tenantId = tenant?.id || null;
  // ... rest of login logic uses tenantId
}
```

---

### 3. Tenant CRUD Updates

#### [MODIFY] [create-tenant.dto.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/tenants/dto/create-tenant.dto.ts)

Add `slug` (required) and `customDomain` (optional) to tenant creation:

```typescript
@IsString()
@IsNotEmpty()
@Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with dashes only' })
@MaxLength(100)
slug: string;

@IsString()
@IsOptional()
@MaxLength(255)
customDomain?: string;
```

#### [MODIFY] [tenants.service.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/tenants/tenants.service.ts)

- Add slug uniqueness validation
- Add custom domain uniqueness validation
- Return slug and customDomain in responses

---

### 4. New Endpoint: Tenant Lookup

#### [NEW] [tenant-lookup.dto.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/tenants/dto/tenant-lookup.dto.ts)

```typescript
export class TenantLookupDto {
  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  domain?: string;
}
```

#### [MODIFY] [tenants.controller.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/tenants/tenants.controller.ts)

Add a public endpoint for frontend to validate and resolve tenant:

```typescript
@Get('lookup')
@Public()  // This should be accessible without authentication
async lookupTenant(@Query() query: TenantLookupDto) {
  // Returns minimal info: { id, name, slug, logoUrl?, themeConfig? }
}
```

This allows the frontend to:
1. Validate the subdomain/domain is valid
2. Get tenant branding (logo, theme) for the login page
3. Show tenant name on the login screen

---

### 5. Seed Data Update

#### [MODIFY] [seed.ts](file:///Users/abhiyan/oss/explore-nest-tenant/src/database/seed.ts)

Add `slug` to existing tenant seeds:

```typescript
const tenants = [
  { name: 'Acme Corporation', slug: 'acme', ... },
  { name: 'Globex Industries', slug: 'globex', ... },
];
```

---

## Frontend Integration Guide

### For Company Admin Login (Subdomain)

```
URL: https://acme.yourapp.com/admin/login
```

```typescript
// Frontend extracts subdomain
const hostname = window.location.hostname; // "acme.yourapp.com"
const slug = hostname.split('.')[0]; // "acme"

// Login request
await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    username,
    password,
    tenantSlug: slug
  })
});
```

### For Tenant Client Login (Custom Domain)

```
URL: https://portal.acme.com/login
```

```typescript
// Frontend uses the full domain
const domain = window.location.hostname; // "portal.acme.com"

// Login request
await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    username,
    password,
    tenantDomain: domain
  })
});
```

---

## Security Considerations

### 1. Tenant Enumeration Attack 🔴 High Risk

**Vulnerability**: The public `/tenants/lookup` endpoint allows attackers to enumerate valid tenant slugs by brute-forcing common names.

**Mitigations**:
- Rate limit the lookup endpoint heavily (10 requests/minute per IP)
- Return minimal info—**do NOT expose tenant ID** in lookup response
- Consider adding CAPTCHA for repeated requests

```typescript
// In tenants.controller.ts
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests/minute
@Get('lookup')
@Public()
async lookupTenant(@Query() query: TenantLookupDto) {
  const tenant = await this.tenantsService.lookupBySlugOrDomain(query);
  // ✅ Return minimal info - no ID
  return { name: tenant.name, slug: tenant.slug };
}
```

---

### 2. Username Enumeration via Slug 🟡 Medium Risk

**Vulnerability**: Different error messages for "invalid tenant" vs "invalid credentials" reveal valid tenants.

**Mitigation**: Use consistent, generic error messages:

```typescript
// ❌ Bad - reveals tenant existence
if (!tenant) throw new UnauthorizedException('Invalid tenant');
if (!user) throw new UnauthorizedException('Invalid credentials');

// ✅ Good - consistent message for all auth failures
throw new UnauthorizedException('Invalid credentials');
```

---

### 3. Custom Domain Hijacking 🔴 High Risk

**Vulnerability**: Without domain verification, an attacker could register their domain pointing to your server and claim someone else's tenant.

**Mitigation**: Require DNS TXT record verification before activating custom domains.

#### Additional Columns in Tenant Entity:
```typescript
@Column({ name: 'domain_verified', default: false })
domainVerified: boolean;

@Column({ name: 'domain_verification_token', nullable: true, length: 100 })
domainVerificationToken: string | null;
```

#### Verification Flow:
1. Tenant sets `customDomain = "portal.acme.com"`
2. System generates unique token: `verify-tenant-abc123xyz`
3. Tenant adds DNS TXT record: `_yourapp-verify.portal.acme.com TXT "verify-tenant-abc123xyz"`
4. Tenant calls verification endpoint
5. Backend performs DNS lookup and verifies TXT record matches
6. Only then set `domainVerified = true`

```typescript
// Only allow login via custom domain if verified
if (loginDto.tenantDomain) {
  tenant = await this.tenantRepository.findOne({
    where: { customDomain: loginDto.tenantDomain, domainVerified: true }
  });
}
```

---

### 4. Subdomain Takeover 🟡 Medium Risk

**Vulnerability**: If a tenant is deleted but their subdomain isn't cleaned up, attackers could reclaim it.

**Mitigations**:
- Soft-delete tenants (already implemented with `deletedAt`)
- **Slug cooling-off period**: Don't allow slug reuse for 30 days after tenant deletion
- Check uniqueness against soft-deleted records

```typescript
// In tenants.service.ts - check slug uniqueness including deleted
const existingSlug = await this.tenantRepository.findOne({
  where: { slug: dto.slug },
  withDeleted: true, // Include soft-deleted
});

if (existingSlug) {
  if (existingSlug.deletedAt) {
    const deletedDaysAgo = (Date.now() - existingSlug.deletedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (deletedDaysAgo < 30) {
      throw new ConflictException('This slug was recently used and is in a cooling-off period');
    }
  } else {
    throw new ConflictException('Slug already in use');
  }
}
```

---

### 5. Cross-Tenant Data Leakage 🔴 High Risk

**Vulnerability**: If slug resolution is bypassed or manipulated after login, a user might access another tenant's data.

**Mitigations**:
- **Always derive tenantId from JWT** after login, never trust request body
- Tenant context should be immutable once set in the token

```typescript
// ✅ JWT payload includes tenantId
const payload = {
  sub: user.id,
  username: user.username,
  tenantId: user.tenantId, // Embedded and signed
};

// ✅ In guards/interceptors - ALWAYS use JWT's tenantId
const tenantIdFromToken = request.user.tenantId;
// ❌ NEVER use: request.body.tenantId or request.query.tenantSlug post-login
```

---

### 6. Slug Injection / Path Traversal 🟡 Medium Risk

**Vulnerability**: Malicious slugs like `../admin`, `null`, or SQL injection attempts could cause issues.

**Mitigations**:

#### Input Validation (already in plan):
```typescript
@Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with dashes only' })
@MinLength(3)
@MaxLength(100)
slug: string;
```

#### Reserved Slug Blocklist:
```typescript
// In tenants.service.ts
const RESERVED_SLUGS = [
  'admin', 'api', 'www', 'app', 'auth', 'login', 'logout',
  'register', 'signup', 'signin', 'null', 'undefined', 'true', 'false',
  'static', 'assets', 'public', 'private', 'health', 'metrics',
  'graphql', 'webhook', 'webhooks', 'callback', 'oauth'
];

if (RESERVED_SLUGS.includes(dto.slug.toLowerCase())) {
  throw new BadRequestException('This slug is reserved');
}
```

---

### 7. Audit Logging 🟢 Recommended

**Recommendation**: Log all domain/slug changes for security audit trail.

```typescript
// Log whenever tenant identity fields change
this.logger.log({
  event: 'TENANT_IDENTITY_CHANGED',
  tenantId: tenant.id,
  changes: {
    slug: { from: oldSlug, to: newSlug },
    customDomain: { from: oldDomain, to: newDomain },
  },
  changedBy: currentUser.id,
  timestamp: new Date().toISOString(),
});
```

---

### Security Implementation Checklist

| Security Control | Priority | Effort | Implementation Location |
|------------------|----------|--------|------------------------|
| Rate limiting on `/lookup` | High | Low | `tenants.controller.ts` |
| Consistent auth error messages | High | Low | `auth.service.ts` |
| Reserved slug blocklist | High | Low | `tenants.service.ts` |
| Domain verification via DNS TXT | High | Medium | New service + entity columns |
| Slug reuse cooling-off period | Medium | Low | `tenants.service.ts` |
| Audit logging for identity changes | Medium | Low | `tenants.service.ts` |
| Input validation (regex + length) | High | Low | DTOs (already planned) |

---

## User Review Required

> [!IMPORTANT]
> **Breaking Change**: The `Tenant` entity now requires a `slug` field. Existing tenants will need migration to add slugs.

> [!WARNING]
> **Custom Domain DNS**: For custom domains to work, tenants must configure their DNS (CNAME) to point to your application. Consider adding documentation for this setup.

### Open Questions for Review

1. **Should we support path-based tenant routing?** (e.g., `yourapp.com/tenant/acme/login`)
2. **Do you want separate endpoints for Company Admin vs Tenant Client login?** (e.g., `/admin/login` vs `/portal/login`)
3. **Should the public tenant lookup expose branding info** (logo, theme colors) for customized login pages?

---

## Verification Plan

### Automated Tests

Since the project has minimal test coverage, I recommend:

1. **Run existing tests** to ensure no regressions:
   ```bash
   npm run test
   ```

2. **Manual API testing with curl/Postman** (see Manual Verification below)

### Manual Verification

After implementation, test these scenarios:

#### 1. Tenant Creation with Slug
```bash
# Create tenant with slug
curl -X POST http://localhost:3000/tenants \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Corp", "slug": "testcorp"}'

# Expect: 201 with slug in response
```

#### 2. Login with Slug
```bash
# Login using tenantSlug
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@testcorp", "password": "password", "tenantSlug": "testcorp"}'

# Expect: 200 with accessToken
```

#### 3. Login with Custom Domain
```bash
# Login using tenantDomain
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@testcorp", "password": "password", "tenantDomain": "portal.testcorp.com"}'

# Expect: 200 with accessToken
```

#### 4. Public Tenant Lookup
```bash
# Lookup tenant (unauthenticated)
curl http://localhost:3000/tenants/lookup?slug=testcorp

# Expect: 200 with { id, name, slug }
```

#### 5. Invalid Slug Rejection
```bash
# Login with non-existent slug
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password", "tenantSlug": "nonexistent"}'

# Expect: 401 "Invalid tenant"
```

---

## Implementation Order

### Phase 1: Database & Core Changes
1. [ ] Add `slug`, `customDomain`, `domainVerified`, `domainVerificationToken` columns to Tenant entity
2. [ ] Update tenant DTOs (create/update) with validation
3. [ ] Add reserved slug blocklist in tenant service
4. [ ] Add slug uniqueness validation (including soft-deleted with cooling-off period)

### Phase 2: Auth Changes
5. [ ] Update login DTO with `tenantSlug` and `tenantDomain` fields
6. [ ] Update auth service to resolve tenant from slug/domain
7. [ ] Use consistent error messages (prevent enumeration)

### Phase 3: Public API
8. [ ] Add public tenant lookup endpoint with rate limiting
9. [ ] Ensure lookup returns minimal info (no tenant ID)

### Phase 4: Domain Verification (Optional - can be Phase 2)
10. [ ] Create domain verification service (DNS TXT lookup)
11. [ ] Add verification endpoint for custom domains

### Phase 5: Finalization
12. [ ] Update seed data with slugs
13. [ ] Add audit logging for identity field changes
14. [ ] Run tests and manual verification

