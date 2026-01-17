import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { DatabaseSeeder } from '../database/seeder.service';
import {
  User,
  Tenant,
  Role,
  Permission,
  UserRole,
  RolePermission,
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Tenant,
      Role,
      Permission,
      UserRole,
      RolePermission,
    ]),
  ],
  controllers: [HealthController],
  providers: [DatabaseSeeder],
})
export class HealthModule {}
