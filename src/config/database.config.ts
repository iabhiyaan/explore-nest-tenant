import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: String(process.env.DB_HOST) || 'localhost',
  port: parseInt(String(process.env.DB_PORT), 10) || 5432,
  username: String(process.env.DB_USERNAME) || '',
  password: String(process.env.DB_PASSWORD) || '',
  name: String(process.env.DB_DATABASE) || '',
}));
