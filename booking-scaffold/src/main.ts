import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ThrottlerExceptionFilter());
  // CORS: в продакшене задайте CORS_ORIGIN через запятую (например https://mysite.com,https://www.mysite.com)
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigin?.length ? corsOrigin : true,
    credentials: true,
  });
  // Админ-панель: dist/admin (после build) или admin в корне проекта
  const adminInDist = join(__dirname, 'admin');
  const adminInRoot = join(process.cwd(), 'admin');
  const adminPath = existsSync(join(adminInDist, 'index.html'))
    ? adminInDist
    : adminInRoot;
  app.useStaticAssets(adminPath, { prefix: '/admin/', index: 'index.html' });
  // Глобальная валидация: whitelist убирает лишние поля, forbidNonWhitelisted — 400 при неизвестных полях
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  // Swagger на /api/docs (глобальный префикс api уже задан)
  const config = new DocumentBuilder()
    .setTitle('Booking API')
    .setDescription('API для бронирований, клиник, пакетов и файлов')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
