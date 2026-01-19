import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: String(process.env.JWT_SECRET) || 'default-secret',
  expiresIn: String(process.env.JWT_EXPIRES_IN) || '24h',
}));
