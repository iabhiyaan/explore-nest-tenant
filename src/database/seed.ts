import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || '',
  synchronize: false,
  logging: false,
});

async function createTables() {
  console.log('📦 Creating tables...');

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
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

async function seed() {
  console.log('🌱 Starting database seed...');

  await dataSource.initialize();
  console.log('✅ Database connected');

  await createTables();

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
      `INSERT INTO permissions (key, description) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
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
      `INSERT INTO roles (name, tenant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [role.name, role.tenant_id],
    );
  }

  console.log('🏢 Creating tenant...');
  await dataSource.query(
    `INSERT INTO tenants (name, is_active) VALUES ('Acme Corp', true) ON CONFLICT DO NOTHING`,
  );

  const tenantResult = await dataSource.query(
    `SELECT id FROM tenants WHERE name = 'Acme Corp' LIMIT 1`,
  );
  const tenantId = tenantResult[0]?.id;

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
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleId, permId],
        );
      }
    }
  }

  console.log('👨‍💻 Creating users...');
  const users = [
    {
      username: 'superadmin',
      password: 'admin123',
      roleName: 'SUPER_ADMIN',
      tenantId: null,
    },
    {
      username: 'companyadmin',
      password: 'admin123',
      roleName: 'COMPANY_ADMIN',
      tenantId: tenantId,
    },
    {
      username: 'clientuser',
      password: 'client123',
      roleName: 'CLIENT',
      tenantId: tenantId,
    },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await dataSource.query(
      `INSERT INTO users (username, password_hash, tenant_id, is_active) 
       VALUES ($1, $2, $3, true) 
       ON CONFLICT (username) DO NOTHING`,
      [user.username, passwordHash, user.tenantId],
    );

    const userRows = await dataSource.query(
      `SELECT id FROM users WHERE username = $1 LIMIT 1`,
      [user.username],
    );

    if (userRows[0]) {
      const roleId = roleMap[user.roleName];
      if (roleId) {
        await dataSource.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userRows[0].id, roleId],
        );
      }
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('Default users:');
  console.log('  superadmin / admin123 (SUPER_ADMIN)');
  console.log('  companyadmin / admin123 (COMPANY_ADMIN)');
  console.log('  clientuser / client123 (CLIENT)');

  await dataSource.destroy();
}

seed().catch(console.error);
