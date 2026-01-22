import { DataSource } from 'typeorm';

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

async function dropAllTables() {
  console.log('🗑️  Dropping all tables...');

  await dataSource.query(`DROP TABLE IF EXISTS user_roles CASCADE`);
  await dataSource.query(`DROP TABLE IF EXISTS role_permissions CASCADE`);
  await dataSource.query(`DROP TABLE IF EXISTS users CASCADE`);
  await dataSource.query(`DROP TABLE IF EXISTS roles CASCADE`);
  await dataSource.query(`DROP TABLE IF EXISTS permissions CASCADE`);
  await dataSource.query(`DROP TABLE IF EXISTS tenants CASCADE`);

  console.log('✅ All tables dropped');
}

async function migrateRefresh() {
  console.log('🔄 Starting database refresh...');
  console.log('');

  await dataSource.initialize();
  console.log('✅ Database connected');

  await dropAllTables();

  console.log('');
  console.log('✅ Database refresh completed!');
  console.log('📝 Run "npm run seed" to populate fresh data');

  await dataSource.destroy();
}

migrateRefresh().catch(console.error);
