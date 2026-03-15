# Ручное тестирование Booking Scaffold

Проверка основных сценариев после запуска приложения и миграций.

## Быстрая проверка админки (без БД)

Если нужно только открыть админку и проверить вход/интерфейс без запуска Nest и PostgreSQL:

```bash
cd booking-scaffold
npm run admin:serve
```

Откройте в браузере: **http://localhost:3000/admin**  
Логин: `admin@local.test` / `password123`. Сервер мокает API (списки будут пустыми).

---

## Подготовка (полный бэкенд)

```bash
cd booking-scaffold
cp .env.example .env
# Заполните .env: DATABASE_URL, JWT_SECRET, CURSOR_SECRET (остальное опционально)

docker-compose up -d postgres redis
# или используйте уже запущенный PostgreSQL

npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Приложение: http://localhost:3000  
Swagger: http://localhost:3000/api/docs

---

## 1. Аутентификация

- **Swagger** → `POST /auth/login`  
  Body: `{"email":"admin@local.test","password":"password123"}`  
  Ожидание: `201`, в ответе `access_token`.

- **Неверный пароль**  
  Body: `{"email":"admin@local.test","password":"wrong"}`  
  Ожидание: `401`.

- Скопируйте `access_token` и в Swagger нажмите **Authorize**, вставьте `Bearer <token>`.

---

## 2. Клиники

- **POST /clinics** (с токеном)  
  Body: `{"name":"Тестовая клиника","address":"ул. Тестовая 1","phone":"+79991234567","description":"Описание"}`  
  Ожидание: `201`, в ответе `id`, `ownerId` = id текущего пользователя.

- **GET /clinics** (без токена)  
  Ожидание: `200`, массив клиник. Сохраните `id` одной клиники для шага 3.

---

## 3. Пакеты услуг

- **POST /packages** (с токеном)  
  Body: `{"title":"Консультация","clinicId":"<id_клиники>","price_cents":5000,"duration_minutes":60}`  
  Ожидание: `201`, в ответе `id`, `title`, `price_cents`, `duration_minutes`. Сохраните `id` пакета.

- **GET /packages**  
  Ожидание: `200`, список пакетов (только активные).

---

## 4. Бронирования

- **POST /bookings** (с токеном)  
  Body: `{"packageId":"<id_пакета>","start_at":"2024-06-01T10:00:00.000Z"}`  
  Ожидание: `201`, в ответе `id`, `status: "PENDING"`, `payment_status: "UNPAID"`, `start_at`, `end_at` (start_at + duration). Сохраните `id` брони.

- **GET /bookings** (с токеном, query: `limit=2`)  
  Ожидание: `200`, `items` — массив бронирований, при наличии следующей страницы — `nextCursor`.

- **Следующая страница**  
  GET `/bookings?limit=2&cursor=<значение nextCursor>`  
  Ожидание: следующая порция записей, при необходимости снова `nextCursor`.

- **PATCH /bookings/:id/confirm** (с токеном, роль MANAGER/ADMIN)  
  Ожидание: `200`, в ответе `status: "CONFIRMED"`.

---

## 5. Файлы (presigned URL)

Если в `.env` заданы AWS/S3 или MinIO:

- **POST /files/presigned-url** (с токеном)  
  Body: `{"filename":"test.txt","size":100,"mimeType":"text/plain"}`  
  Ожидание: `200`, в ответе `uploadUrl`, `storage_key`, `bucket`, `expiresIn`.

- Загрузка через curl (подставьте `uploadUrl` из ответа):
  ```bash
  echo "hello" | curl -X PUT "<uploadUrl>" -H "Content-Type: text/plain" --data-binary @-
  ```
  Ожидание: HTTP 200 от S3/MinIO.

- **POST /files/metadata** (с токеном) — сохранение метаданных после загрузки:
  Body: `{"storage_key":"<storage_key из presigned>","filename":"test.txt","mime":"text/plain","size":5}`  
  Ожидание: `201`, запись в БД.

Если S3 не настроен: **POST /files/presigned-url** возвращает `400` с сообщением про S3 — это ожидаемо.

---

## 6. Stripe (опционально)

При заданных `STRIPE_SECRET_KEY` и `STRIPE_WEBHOOK_SECRET`:

- **POST /bookings/checkout** (с токеном)  
  Body: `{"bookingId":"<id_брони>","successUrl":"http://localhost:3000/success","cancelUrl":"http://localhost:3000/cancel"}`  
  Ожидание: `200`, в ответе `url` — ссылка на Stripe Checkout. Откройте в браузере, используйте тестовую карту Stripe (например `4242 4242 4242 4242`). После успешной оплаты webhook обновит бронь: `payment_status: "PAID"`.

- Проверка: **GET /bookings** — у оплаченной брони `payment_status: "PAID"`.

---

## 7. Пользователи (ADMIN/MANAGER)

- **GET /users** (с токеном, роль ADMIN или MANAGER)  
  Query: `limit=5`, при необходимости `cursor=<nextCursor>`  
  Ожидание: `200`, `items` — пользователи с полями `id`, `email`, `role`, `isActive`, `createdAt`, `updatedAt`; при наличии следующей страницы — `nextCursor`.

---

## 8. Курсор-пагинация

- Вызвать **GET /bookings?limit=1** или **GET /users?limit=1**.
- Если в ответе есть `nextCursor`, вызвать тот же endpoint с `cursor=<nextCursor>`.
- Ожидание: следующие записи без дублей, порядок по `createdAt` desc.
- Невалидный или поддельный `cursor` даёт `400 Invalid cursor`.

---

## Чек-лист

- [ ] Логин admin@local.test возвращает токен
- [ ] Создание клиники (ownerId = текущий пользователь)
- [ ] Создание пакета с clinicId, price_cents, duration_minutes
- [ ] Создание брони с packageId и start_at, в ответе start_at/end_at и payment_status
- [ ] Список бронирований с nextCursor и корректная вторая страница
- [ ] Подтверждение брони (PATCH confirm) для MANAGER/ADMIN
- [ ] Presigned URL (при настроенном S3) и загрузка файла
- [ ] Сохранение метаданных файла (storage_key, filename, mime, size)
- [ ] Список пользователей с пагинацией (ADMIN/MANAGER)
- [ ] Stripe checkout и смена payment_status через webhook (при настроенном Stripe)
