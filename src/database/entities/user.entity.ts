import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  username: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'first_name', nullable: true, type: 'varchar', length: 255 })
  firstName: string | null;

  @Column({ name: 'last_name', nullable: true, type: 'varchar', length: 255 })
  lastName: string | null;

  @Column({ name: 'email', nullable: true, type: 'varchar', length: 255 })
  email: string | null;

  @Column({ name: 'phone', nullable: true, type: 'varchar', length: 50 })
  phone: string | null;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar', length: 500 })
  avatarUrl: string | null;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'login_attempts', default: 0 })
  loginAttempts: number;

  @Column({ name: 'locked_until', nullable: true })
  lockedUntil: Date;

  @Column({ name: 'password_changed_at' })
  passwordChangedAt: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  getRoleNames(): string[] {
    return this.userRoles?.map((ur) => ur.role?.name).filter(Boolean) || [];
  }

  hasRole(roleName: string): boolean {
    return this.getRoleNames().includes(roleName);
  }

  isSuperAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN');
  }

  isCompanyAdmin(): boolean {
    return this.hasRole('COMPANY_ADMIN');
  }

  getRoleLevel(): number {
    const roles = this.getRoleNames();
    if (roles.includes('SUPER_ADMIN')) return 3;
    if (roles.includes('COMPANY_ADMIN')) return 2;
    return 1;
  }
}
