import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Multi-Tenant SaaS API')
    .setDescription('API documentation for Multi-Tenant SaaS Backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(
    configService.get<string>('app.swagger.path') || 'api/docs',
    app,
    document,
  );

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);
  logger.log(
    `Application is running on: http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
  logger.log(
    `Swagger docs available at: http://localhost:${port}/api`,
    'Bootstrap',
  );
}
bootstrap();
