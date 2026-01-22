import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import databaseConfig from '../config/database.config';

const config = databaseConfig();

const dataSource = new DataSource({
  type: 'postgres',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.name,
  synchronize: false,
  logging: false,
});

interface SeedUser {
  username: string;
  password: string;
  roleName: string;
  tenantName?: string;
  tenantId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

async function clearData() {
  console.log('🗑️  Clearing existing data...');

  await dataSource.query(`DELETE FROM user_roles`);
  await dataSource.query(`DELETE FROM role_permissions`);
  await dataSource.query(`DELETE FROM users`);
  await dataSource.query(`DELETE FROM roles`);
  await dataSource.query(`DELETE FROM permissions`);
  await dataSource.query(`DELETE FROM tenants`);

  console.log('✅ Existing data cleared');
}

async function createTables() {
  console.log('📦 Creating tables...');

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      domain VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP,
      created_by VARCHAR(255),
      updated_by VARCHAR(255)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      description VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      tenant_id UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP,
      created_by VARCHAR(255),
      updated_by VARCHAR(255),
      UNIQUE(name, tenant_id)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      tenant_id UUID,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP,
      created_by VARCHAR(255),
      updated_by VARCHAR(255),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      avatar_url VARCHAR(500),
      last_login_at TIMESTAMP,
      login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP,
      password_changed_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id SERIAL PRIMARY KEY,
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      role_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Tables created');
}

async function seedTenant(
  name: string,
  domain: string,
): Promise<string | null> {
  const result = await dataSource.query(
    `INSERT INTO tenants (name, domain, is_active) VALUES ($1, $2, true)
     ON CONFLICT (name) DO UPDATE SET domain = EXCLUDED.domain, is_active = true
     RETURNING id`,
    [name, domain],
  );
  return result[0]?.id || null;
}

async function seedUser(
  dataSource: DataSource,
  user: SeedUser,
  tenantMap: Record<string, string>,
  roleMap: Record<string, number>,
): Promise<void> {
  const passwordHash = await bcrypt.hash(user.password, 10);
  const tenantId =
    user.tenantId || (user.tenantName ? tenantMap[user.tenantName] : null);

  await dataSource.query(
    `INSERT INTO users (
      username, password_hash, tenant_id, is_active,
      first_name, last_name, email, phone,
      password_changed_at
    ) VALUES ($1, $2, $3, true, $4, $5, $6, $7, NOW())
    ON CONFLICT (username) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      updated_at = NOW()`,
    [
      user.username,
      passwordHash,
      tenantId,
      user.firstName,
      user.lastName,
      user.email,
      user.phone || null,
    ],
  );

  const userRows = await dataSource.query(
    `SELECT id FROM users WHERE username = $1 LIMIT 1`,
    [user.username],
  );

  if (userRows[0] && roleMap[user.roleName]) {
    await dataSource.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userRows[0].id, roleMap[user.roleName]],
    );
  }
}

async function seed() {
  console.log('🌱 Starting database seed...');

  await dataSource.initialize();
  console.log('✅ Database connected');

  await createTables();
  await clearData();

  const permissions = [
    { key: 'MANAGE_COMPANIES', description: 'Can manage companies/tenants' },
    { key: 'VIEW_COMPANIES', description: 'Can view companies/tenants' },
    { key: 'MANAGE_USERS', description: 'Can manage users' },
    { key: 'VIEW_USERS', description: 'Can view users' },
    { key: 'MANAGE_COMPANY_ADMINS', description: 'Can manage company admins' },
    { key: 'VIEW_COMPANY_ADMINS', description: 'Can view company admins' },
    { key: 'MANAGE_ROLES', description: 'Can manage roles' },
    { key: 'VIEW_ROLES', description: 'Can view roles' },
    { key: 'MANAGE_PERMISSIONS', description: 'Can manage permissions' },
    { key: 'VIEW_PERMISSIONS', description: 'Can view permissions' },
  ];

  console.log('📝 Creating permissions...');
  for (const perm of permissions) {
    await dataSource.query(
      `INSERT INTO permissions (key, description) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description`,
      [perm.key, perm.description],
    );
  }

  const roles = [
    { name: 'SUPER_ADMIN', tenant_id: null },
    { name: 'COMPANY_ADMIN', tenant_id: null },
    { name: 'CLIENT', tenant_id: null },
  ];

  console.log('👤 Creating roles...');
  for (const role of roles) {
    await dataSource.query(
      `INSERT INTO roles (name, tenant_id) VALUES ($1, $2)
       ON CONFLICT (name, tenant_id) DO NOTHING`,
      [role.name, role.tenant_id],
    );
  }

  console.log('🏢 Creating tenants...');
  const tenantMap: Record<string, string> = {};
  const tenants = [
    { name: 'Acme Corporation', domain: 'acme.com' },
    { name: 'TechCorp Solutions', domain: 'techcorp.com' },
    { name: 'Global Industries', domain: 'globalindustries.com' },
  ];

  for (const tenant of tenants) {
    await dataSource.query(
      `INSERT INTO tenants (name, domain, is_active) VALUES ($1, $2, true)
       ON CONFLICT DO NOTHING`,
      [tenant.name, tenant.domain],
    );
  }

  const tenantResult = await dataSource.query(`SELECT id, name FROM tenants`);
  tenantResult.forEach((t: any) => {
    tenantMap[t.name] = t.id;
  });

  const roleRows = await dataSource.query(
    `SELECT id, name FROM roles WHERE tenant_id IS NULL`,
  );
  const roleMap: Record<string, number> = {};
  roleRows.forEach((r: any) => {
    roleMap[r.name] = r.id;
  });

  const permRows = await dataSource.query(`SELECT id, key FROM permissions`);
  const permMap: Record<string, number> = {};
  permRows.forEach((p: any) => {
    permMap[p.key] = p.id;
  });

  console.log('🔗 Assigning permissions to roles...');
  const rolePerms: Record<string, string[]> = {
    SUPER_ADMIN: Object.keys(permMap),
    COMPANY_ADMIN: [
      'MANAGE_USERS',
      'VIEW_USERS',
      'VIEW_ROLES',
      'VIEW_PERMISSIONS',
    ],
    CLIENT: ['VIEW_USERS'],
  };

  for (const [roleName, permKeys] of Object.entries(rolePerms)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;
    for (const permKey of permKeys) {
      const permId = permMap[permKey];
      if (permId) {
        await dataSource.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [roleId, permId],
        );
      }
    }
  }

  console.log('👨‍💻 Creating users...');
  const users: SeedUser[] = [
    {
      username: 'superadmin',
      password: 'Admin@123',
      roleName: 'SUPER_ADMIN',
      tenantId: null,
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@system.com',
    },
    {
      username: 'admin.smith',
      password: 'Admin@123',
      roleName: 'COMPANY_ADMIN',
      tenantName: 'Acme Corporation',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@acme.com',
    },
    {
      username: 'admin.jones',
      password: 'Admin@123',
      roleName: 'COMPANY_ADMIN',
      tenantName: 'Acme Corporation',
      firstName: 'Sarah',
      lastName: 'Jones',
      email: 'sarah.jones@acme.com',
    },
    {
      username: 'user.alice',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Acme Corporation',
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@acme.com',
    },
    {
      username: 'user.bob',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Acme Corporation',
      firstName: 'Bob',
      lastName: 'Williams',
      email: 'bob.williams@acme.com',
    },
    {
      username: 'user.carol',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Acme Corporation',
      firstName: 'Carol',
      lastName: 'Davis',
      email: 'carol.davis@acme.com',
    },
    {
      username: 'user.david',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Acme Corporation',
      firstName: 'David',
      lastName: 'Miller',
      email: 'david.miller@acme.com',
    },
    {
      username: 'user.emma',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Acme Corporation',
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'emma.wilson@acme.com',
    },
    {
      username: 'user.frank',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Acme Corporation',
      firstName: 'Frank',
      lastName: 'Moore',
      email: 'frank.moore@acme.com',
    },
    {
      username: 'user.grace',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Acme Corporation',
      firstName: 'Grace',
      lastName: 'Taylor',
      email: 'grace.taylor@acme.com',
    },
    {
      username: 'user.henry',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Acme Corporation',
      firstName: 'Henry',
      lastName: 'Anderson',
      email: 'henry.anderson@acme.com',
    },
    {
      username: 'admin.chen',
      password: 'Admin@123',
      roleName: 'COMPANY_ADMIN',
      tenantName: 'TechCorp Solutions',
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@techcorp.com',
    },
    {
      username: 'user.lisa',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'TechCorp Solutions',
      firstName: 'Lisa',
      lastName: 'Wang',
      email: 'lisa.wang@techcorp.com',
    },
    {
      username: 'user.kevin',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'TechCorp Solutions',
      firstName: 'Kevin',
      lastName: 'Brown',
      email: 'kevin.brown@techcorp.com',
    },
    {
      username: 'user.maria',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'TechCorp Solutions',
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@techcorp.com',
    },
    {
      username: 'user.james',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'TechCorp Solutions',
      firstName: 'James',
      lastName: 'Martinez',
      email: 'james.martinez@techcorp.com',
    },
    {
      username: 'user.patricia',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'TechCorp Solutions',
      firstName: 'Patricia',
      lastName: 'Lee',
      email: 'patricia.lee@techcorp.com',
    },
    {
      username: 'admin.patel',
      password: 'Admin@123',
      roleName: 'COMPANY_ADMIN',
      tenantName: 'Global Industries',
      firstName: 'Raj',
      lastName: 'Patel',
      email: 'raj.patel@globalindustries.com',
    },
    {
      username: 'user.thomas',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Global Industries',
      firstName: 'Thomas',
      lastName: 'Johnson',
      email: 'thomas.johnson@globalindustries.com',
    },
    {
      username: 'user.jennifer',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Global Industries',
      firstName: 'Jennifer',
      lastName: 'White',
      email: 'jennifer.white@globalindustries.com',
    },
    {
      username: 'user.robert',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Global Industries',
      firstName: 'Robert',
      lastName: 'Harris',
      email: 'robert.harris@globalindustries.com',
    },
    {
      username: 'user.amanda',
      password: 'User@123',
      roleName: 'CLIENT',
      tenantName: 'Global Industries',
      firstName: 'Amanda',
      lastName: 'Clark',
      email: 'amanda.clark@globalindustries.com',
    },
  ];

  for (const user of users) {
    await seedUser(dataSource, user, tenantMap, roleMap);
  }

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('Default users:');
  console.log('  superadmin / Admin@123 (SUPER_ADMIN - global)');
  console.log('  admin.smith / Admin@123 (COMPANY_ADMIN - Acme Corp)');
  console.log('  admin.jones / Admin@123 (COMPANY_ADMIN - Acme Corp)');
  console.log('  admin.chen / Admin@123 (COMPANY_ADMIN - TechCorp)');
  console.log('  admin.patel / Admin@123 (COMPANY_ADMIN - Global Industries)');
  console.log('  ... 17 regular users with User@123');
  console.log('');
  console.log('Tenants created:');
  tenants.forEach((t) => console.log(`  - ${t.name}`));

  await dataSource.destroy();
}

seed().catch(console.error);
