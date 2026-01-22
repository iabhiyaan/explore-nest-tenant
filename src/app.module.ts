import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import * as z from 'zod';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './common/logger';
import {
  User,
  Tenant,
  Role,
  Permission,
  UserRole,
  RolePermission,
} from './database/entities';
import appConfig from './config/configuration';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().default(''),
  DB_PASSWORD: z.string().default(''),
  DB_DATABASE: z.string().default(''),
  JWT_SECRET: z.string().min(32).default('default-secret'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  LOG_LEVEL: z.string().default('info'),
  SWAGGER_PATH: z.string().default('api'),
});

type EnvVariables = z.infer<typeof envSchema>;

const validateEnv = (envConfig: Record<string, unknown>): EnvVariables => {
  const result = envSchema.safeParse(envConfig);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Environment validation failed: ${errorMessages}`);
  }
  return result.data;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validate: validateEnv,
    }),
    LoggerModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [User, Tenant, Role, Permission, UserRole, RolePermission],
        synchronize:
          configService.get<string>('app.environment') !== 'production' &&
          process.env.TYPEORM_SYNCHRONIZE !== 'false',
        logging: configService.get<string>('app.environment') === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    TenantsModule,
    RolesModule,
    HealthModule,
  ],
})
export class AppModule {}
