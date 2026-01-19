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
