import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppLogger implements LoggerService {
  private logger: pino.Logger;

  constructor(private configService: ConfigService) {
    const level = configService.get<string>('app.log.level') || 'info';
    this.logger = pino({
      level,
      transport:
        this.configService.get<string>('app.environment') !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    });
  }

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    this.logger.trace({ context }, message);
  }
}
