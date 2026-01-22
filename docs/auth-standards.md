# NestJS Authentication & Authorization Standards

## Overview

This document outlines the industry-standard patterns for implementing authentication and authorization in NestJS applications.

## Core Principles

1. **Guards** - Handle authentication and authorization logic
2. **Decorators** - Extract and inject user/context data
3. **Interceptors** - Handle cross-cutting concerns (logging, audit, transforms)
4. **Guards > Middleware** for auth - Guards have access to ExecutionContext and can use Reflector

---

## Authentication Flow

```
Request → Global Guards → Controller Guards → Route Guards → Handler
                 ↓
            Interceptors
```

---

## Guard Implementation

### Authentication Guard

**Location:** `src/auth/guards/`

```typescript
// src/auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
```

### Authorization Guard

**Location:** `src/common/guards/`

```typescript
// src/common/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.roles?.some((role: string) => requiredRoles.includes(role))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

---

## Decorator Implementation

### Current User Decorator

**Location:** `src/common/decorators/`

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

### Usage

```typescript
// In controllers
@Controller('users')
export class UsersController {
  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.userService.findOne(user.sub);
  }

  @Get('profile/:id')
  @Roles('ADMIN')
  getUserById(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.userService.findByTenant(id, tenantId);
  }
}
```

### Role Decorator

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### Permission Decorator

```typescript
// src/common/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

---

## Interceptor Usage

### Audit Interceptor

**Location:** `src/common/interceptors/`

```typescript
// src/common/interceptors/audit.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        console.log(`${request.method} ${request.url} - ${Date.now() - now}ms`);
      }),
    );
  }
}
```

### Transform Interceptor

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

---

## Global Registration

### Register Guards Globally

```typescript
// src/main.ts or app.module.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global guards
  app.useGlobalGuards(new JwtAuthGuard());
  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));

  await app.listen(3000);
}
bootstrap();
```

### Register Interceptors Globally

```typescript
// src/main.ts
app.useGlobalInterceptors(new TransformInterceptor());
app.useGlobalInterceptors(new AuditInterceptor());
```

---

## Controller Pattern

### Standard Controller Structure

```typescript
// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: any) {
    return this.usersService.create(createUserDto, user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  findAll(@CurrentUser() user: any) {
    return this.usersService.findAll(user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.findOne(id, user);
  }
}
```

---

## Don't Use Middleware For

- Authentication logic (use Guards)
- Authorization checks (use Guards)
- Role-based access control (use Guards)
- Request logging (use Interceptors)

## Middleware Is For

- CORS
- Body parsing
- Compression
- Static files
- Rate limiting (external packages like @nestjs/throttler)
- Session management

---

## File Structure

```
src/
├── auth/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── local.strategy.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── common/
│   ├── decorators/
│   │   ├── index.ts
│   │   ├── current-user.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── permissions.decorator.ts
│   ├── guards/
│   │   ├── index.ts
│   │   ├── roles.guard.ts
│   │   └── privileged-role.guard.ts
│   └── interceptors/
│       ├── index.ts
│       ├── audit.interceptor.ts
│       └── transform.interceptor.ts
└── users/
    ├── users.controller.ts
    └── users.service.ts
```

---

## Summary

| Concern           | Tool              | Why                                                       |
| ----------------- | ----------------- | --------------------------------------------------------- |
| Auth verification | Guard             | Access to ExecutionContext, can throw exceptions properly |
| Role checking     | Guard + Decorator | Uses Reflector for metadata                               |
| User extraction   | Decorator         | Clean, type-safe access to user                           |
| Request logging   | Interceptor       | Can transform response, works with observables            |
| Audit trails      | Interceptor       | Centralized, works with all routes                        |
