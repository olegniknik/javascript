# Booking Scaffold

Backend API на NestJS (TypeScript): бронирования, клиники, пакеты услуг, аутентификация JWT, оплата Stripe, загрузка файлов через presigned URL (S3/MinIO), cursor-pagination.

## Быстрый старт

1. Клонируйте репозиторий и перейдите в каталог:
   ```bash
   cd booking-scaffold
   ```

2. Скопируйте переменные окружения:
   ```bash
   cp .env.example .env
   ```
   Отредактируйте `.env`: минимум `DATABASE_URL`, `JWT_SECRET`, `CURSOR_SECRET`. Для Stripe и S3 подставьте ключи (см. ниже).

3. Запуск через Docker Compose:
   ```bash
   docker-compose up -d postgres redis
   ```
   Приложение можно запускать локально (см. п. 4). Либо соберите и запустите контейнер приложения:
   ```bash
   docker-compose up -d app
   ```

4. Локальный запуск (без docker для app):
   ```bash
   npm ci
   npx prisma generate
   npm run migrate
   npm run seed
   npm run dev
   ```
API: http://localhost:3000  
Swagger: http://localhost:3000/api/docs  
**Админ-панель:** http://localhost:3000/admin (логин: admin@local.test / password123). В админке: «Заявки» — все брони; «Организации» — места/компании с услугами. Запускайте сервер из каталога `booking-scaffold` (`cd booking-scaffold && npm run dev`), иначе статика админки не найдётся.

**Заявки с сайта:** если фронтенд (сайт «Уютный дом») открыт с другого порта/домена, в `main.ts` включён CORS. Сайт отправляет заявки на `POST /leads` (имя, телефон, проблема); список заявок доступен только админу по `GET /leads`. В корне сайта в `script.js` задаётся `API_URL` (по умолчанию `http://localhost:3000`). На сайте кнопка «Вход» открывает форму входа для админа; после входа отображается блок «Заявки с сайта». Не забудьте применить миграции (`npm run migrate`), чтобы появилась таблица Lead.

5. Миграции и seed:
   ```bash
   npm run migrate    # prisma migrate deploy
   npm run seed       # создаёт admin@local.test / password123
   ```

## Переменные окружения

См. [.env.example](.env.example). Кратко:

- **DATABASE_URL** — PostgreSQL connection string.
- **REDIS_URL** — Redis (опционально).
- **PORT** — порт приложения (по умолчанию 3000).
- **JWT_SECRET**, **JWT_EXPIRES_IN** — JWT для access token.
- **CURSOR_SECRET** — секрет для подписи курсоров пагинации (HMAC).
- **AWS_ACCESS_KEY_ID**, **AWS_SECRET_ACCESS_KEY**, **S3_BUCKET**, **S3_REGION**, **S3_ENDPOINT** — для S3 или MinIO (S3_ENDPOINT для MinIO, например `http://localhost:9000`).
- **STRIPE_SECRET_KEY**, **STRIPE_WEBHOOK_SECRET** — Stripe (test keys и webhook signing secret).
- **APP_URL** — базовый URL приложения (для redirect URL Stripe).

## S3 / MinIO

- Для локальной эмуляции S3 запустите MinIO:
  ```bash
  docker-compose --profile s3 up -d minio
  ```
  Консоль MinIO: http://localhost:9001. Создайте bucket `uploads` (или имя из `S3_BUCKET`).
- В `.env` задайте:
  - `AWS_ACCESS_KEY_ID=minioadmin`
  - `AWS_SECRET_ACCESS_KEY=minioadmin`
  - `S3_BUCKET=uploads`
  - `S3_REGION=us-east-1`
  - `S3_ENDPOINT=http://localhost:9000`

Пример запроса presigned URL и загрузки через curl:
```bash
# 1) Логин, получить TOKEN
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"admin@local.test","password":"password123"}' | jq -r '.access_token')

# 2) Получить presigned URL
RESP=$(curl -s -X POST http://localhost:3000/files/presigned-url -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"filename":"test.txt","size":5,"mimeType":"text/plain"}')
UPLOAD_URL=$(echo $RESP | jq -r '.uploadUrl')

# 3) Загрузить файл
echo "hello" | curl -X PUT "$UPLOAD_URL" -H "Content-Type: text/plain" --data-binary @-
```

## Stripe

- В [Dashboard Stripe](https://dashboard.stripe.com/apikeys) возьмите test ключ (sk_test_...) и добавьте в `.env` как `STRIPE_SECRET_KEY`.
- Webhook для локальной разработки: [Stripe CLI](https://stripe.com/docs/stripe-cli) `stripe listen --forward-to localhost:3000/webhooks/stripe`. Подставьте подпись в `STRIPE_WEBHOOK_SECRET`.
- Создание checkout session: `POST /bookings/checkout` с телом `{ "bookingId": "<id>" }`. В ответе — `url` для редиректа пользователя на оплату. После успешной оплаты Stripe вызовет webhook, приложение обновит статус брони на PAID.

## Тесты

- Unit: `npm test`
- E2E: поднимите тестовую БД (например тот же postgres с другой БД), примените миграции и seed, затем:
  ```bash
  export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booking_test
  npm run migrate
  npm run seed
  npm run test:e2e
  ```

## Ручное тестирование

Пошаговый сценарий проверки API — в [MANUAL_TESTING.md](MANUAL_TESTING.md): логин, создание клиники/пакета/брони, cursor-pagination, presigned URL, Stripe (опционально), чек-лист для приёмки.

## Сборка архива для сдачи

Из корня проекта:
```bash
cd booking-scaffold
zip -r ../booking-scaffold.zip . -x "node_modules/*" ".git/*" "dist/*"
```

---

## Acceptance criteria

Перед приёмкой проверьте:

1. **docker-compose up** — поднимаются сервисы postgres, redis, app (и при необходимости pgadmin, minio с профилями).
2. **npx prisma migrate deploy && npx prisma db seed** — миграции применяются, создаётся админ `admin@local.test` / `password123`.
3. **Логин и создание брони** — POST /auth/login с email/password возвращает `access_token`; с этим токеном POST /bookings с `packageId` создаёт бронь.
4. **Presigned URL** — POST /files/presigned-url (с Bearer) возвращает `uploadUrl`; загрузка по этому URL в MinIO/S3 проходит успешно.
5. **Stripe** — POST /bookings/checkout создаёт тестовую сессию; после оплаты в Stripe webhook обновляет статус брони на PAID.
6. **Cursor-pagination** — GET /bookings?limit=2 возвращает `items` и при наличии следующей страницы — `nextCursor`; запрос с этим cursor возвращает следующую порцию записей.

---

## Скриншоты

В каталоге `screenshots/` (PNG 1365×768):

- **swagger.png** — Swagger UI на /api/docs.
- **postman-auth-booking.png** — Postman: авторизация и создание брони.
- **docker-compose-ps.png** — вывод `docker-compose ps`.
- **cursor-pagination.png** — ответ API с nextCursor (список бронирований).
- **seed-admin.png** — результат seed (admin создан): вывод консоли или запись в БД.

Подписи к скриншотам приведены в этом разделе.
