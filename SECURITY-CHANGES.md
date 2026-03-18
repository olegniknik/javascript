# Безопасность: что было и что стало

## 1. CORS

### Было (`main.ts`)

```ts
app.enableCors({
  origin: true,  // любой сайт мог слать запросы
});
```

### Стало (`main.ts`)

```ts
// CORS: в продакшене задайте CORS_ORIGIN через запятую
const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
app.enableCors({
  origin: corsOrigin?.length ? corsOrigin : true,
  credentials: true,
});
```

**Смысл:** В проде задаёте `CORS_ORIGIN=https://yoursite.com,https://www.yoursite.com` — запросы принимаются только с этих доменов. Если переменная не задана (разработка), по-прежнему разрешён любой origin.

---

## 2. Проверка JWT_SECRET в продакшене

### Было

Проверки не было: приложение стартовало с дефолтным `JWT_SECRET` даже в production.

### Стало (`main.ts`, в начале `bootstrap()`)

```ts
const isProd = process.env.NODE_ENV === 'production';
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default-secret-change-me')) {
  throw new Error('В продакшене обязательно задайте JWT_SECRET в .env');
}
```

**Смысл:** В production приложение не запустится без своего секрета в .env.

---

## 3. Rate limit на логин

### Было (`auth.controller.ts`)

```ts
import { Controller, Post, Body } from '@nestjs/common';
// ...
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginDto) {
```

Ограничения частоты не было — можно было брутфорсить пароль.

### Стало (`auth.controller.ts`)

```ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
// ...
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginDto) {
```

**Смысл:** На все маршруты контроллера (в т.ч. `POST /auth/login`) действует Throttler: 10 запросов в минуту и 30 за 5 минут.

---

## 4. Rate limit на создание заявок

### Было (`leads.controller.ts`)

```ts
@Post()
@ApiOperation({ summary: 'Оставить заявку с сайта (без авторизации)' })
create(@Body() dto: CreateLeadDto) {
```

Лимита не было — можно было спамить заявками.

### Стало (`leads.controller.ts`)

```ts
import { ThrottlerGuard } from '@nestjs/throttler';
// ...
@Post()
@UseGuards(ThrottlerGuard)
@ApiOperation({ summary: 'Оставить заявку с сайта (без авторизации)' })
create(@Body() dto: CreateLeadDto) {
```

**Смысл:** На `POST /leads` действует тот же Throttler (10/мин, 30/5 мин).

---

## Дополнительно

- В **`app.module.ts`** подключён `ThrottlerModule.forRoot([...])` с лимитами.
- В **`package.json`** добавлена зависимость `@nestjs/throttler`.

Итог по пунктам: CORS и секреты — исправлено; rate limit на логин и заявки — включён.
