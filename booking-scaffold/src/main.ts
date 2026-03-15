import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.enableCors({ origin: true }); // чтобы сайт с другого порта/домена мог слать заявки и логин
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
  // Swagger на /api/docs
  const config = new DocumentBuilder()
    .setTitle('Booking API')
    .setDescription('API для бронирований, клиник, пакетов и файлов')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
