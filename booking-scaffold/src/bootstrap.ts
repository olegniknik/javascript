import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

export function configureApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ThrottlerExceptionFilter());

  const publicInDist = join(__dirname, '..', 'public');
  const publicInRoot = join(process.cwd(), 'public');
  const publicPath = existsSync(join(publicInDist, 'index.html'))
    ? publicInDist
    : publicInRoot;
  app.useStaticAssets(publicPath, { prefix: '/' });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && (req.path === '/' || req.originalUrl === '/')) {
      const landing = join(publicPath, 'index.html');
      if (existsSync(landing)) {
        return res.sendFile(landing);
      }
      return res.status(200).json({ status: 'ok' });
    }
    return next();
  });

  const corsOrigin = process.env.CORS_ORIGIN
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigin?.length ? corsOrigin : true,
    credentials: true,
  });

  const adminInPublic = join(publicPath, 'admin');
  const adminInDist = join(__dirname, 'admin');
  const adminInRoot = join(process.cwd(), 'admin');
  const adminPath = existsSync(join(adminInPublic, 'index.html'))
    ? adminInPublic
    : existsSync(join(adminInDist, 'index.html'))
      ? adminInDist
      : adminInRoot;
  app.useStaticAssets(adminPath, { prefix: '/admin/', index: 'index.html' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Booking API')
    .setDescription('API для бронирований, клиник, пакетов и файлов')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
