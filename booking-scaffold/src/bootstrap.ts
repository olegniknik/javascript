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

  // Vercel serverless + globalPrefix: запрос на `/` может уходить мимо Nest маршрутов.
  // Поэтому добавляем прямой ответ для корня сайта.
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[DEBUG] ${req.method} ${req.path} | originalUrl: ${req.originalUrl}`);
    if (req.method === 'GET' && (req.path === '/' || req.originalUrl === '/')) {
      console.log('[DEBUG] Responding with 200 { status: ok }');
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

  const adminInDist = join(__dirname, 'admin');
  const adminInRoot = join(process.cwd(), 'admin');
  const adminPath = existsSync(join(adminInDist, 'index.html'))
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
