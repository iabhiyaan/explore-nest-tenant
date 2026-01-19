# NestJS Configuration Patterns

This document explains when to use each configuration pattern in your NestJS application.

## Overview

NestJS ConfigModule supports a namespaced configuration pattern using `registerAs`:

1. **Namespaced Config** (`registerAs`) - All configs use this pattern

---

## Pattern: Namespaced Config (`registerAs`)

**Files:** `src/config/*.config.ts`

### Structure

```typescript
// src/config/app.config.ts (or configuration.ts)
import { registerAs } from '@nestjs/config';

export default registerAs('namespace', () => ({
  key: String(process.env.KEY) || 'default',
  numberKey: parseInt(String(process.env.NUMBER_KEY), 10) || 0,
}));
```

### When to Use

- All configurations (app metadata, database, services)
- When you need type-safe DI injection
- When you want explicit boundaries between config domains
- Consistent approach across the entire application

---

## Where to Add New Keys

### For Application Settings

Add to `src/config/configuration.ts` (namespace: `app`):

```typescript
// src/config/configuration.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(String(process.env.PORT), 10) || 3000,
  environment: String(process.env.NODE_ENV) || 'development',
  log: {
    level: String(process.env.LOG_LEVEL) || 'info',
  },
  swagger: {
    path: String(process.env.SWAGGER_PATH) || 'api',
  },
}));
```

### For Domain-Specific Settings

Create `src/config/[domain].config.ts`:

```typescript
// src/config/redis.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: String(process.env.REDIS_HOST) || 'localhost',
  port: parseInt(String(process.env.REDIS_PORT), 10) || 6379,
}));
```

---

## Quick Reference

| Scenario                 | Namespace   | File                  |
| ------------------------ | ----------- | --------------------- |
| App settings (port, env) | `app`       | `configuration.ts`    |
| Database settings        | `database`  | `database.config.ts`  |
| Redis/Cache settings     | `redis`     | `redis.config.ts`     |
| Auth/JWT settings        | `auth`      | `auth.config.ts`      |
| Third-party API keys     | `[service]` | `[service].config.ts` |
| Feature flags            | `feature`   | `feature.config.ts`   |

---

## Best Practices

1. **Use `registerAs` for all configs** - Consistent pattern across the codebase
2. **Use `String()` wrapper** for all env var access
3. **Use `parseInt()`** for numeric values
4. **Provide sensible defaults** with `||` fallback
5. **Validate with Zod** in `AppModule for all env vars
6. **Keep configs close to modules** that use them
7. **Use `@Inject()` for type-safe DI** when accessing configs in services

---

## Example: Adding a New Service Config

### Step 1: Create the config file

```typescript
// src/config/email.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: String(process.env.EMAIL_HOST) || 'smtp.example.com',
  port: parseInt(String(process.env.EMAIL_PORT), 10) || 587,
  user: String(process.env.EMAIL_USER) || '',
  password: String(process.env.EMAIL_PASSWORD) || '',
  from: String(process.env.EMAIL_FROM) || 'noreply@example.com',
}));
```

### Step 2: Register in AppModule

```typescript
import emailConfig from './config/email.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig, emailConfig],
    }),
  ],
})
export class AppModule {}
```

### Step 3: Add env vars to `.env`

```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_USER=user123
EMAIL_PASSWORD=pass456
EMAIL_FROM=noreply@myapp.com
```

### Step 4: Use in service

```typescript
@Injectable()
export class EmailService {
  constructor(
    @Inject(emailConfig.KEY)
    private emailCfg: ConfigType<typeof emailConfig>,
  ) {}

  sendEmail(to: string, subject: string) {
    console.log(`Sending via ${this.emailCfg.host}`);
  }
}
```
