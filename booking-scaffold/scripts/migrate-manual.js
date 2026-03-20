const { Client } = require('pg');

const connStr = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_7CPlKyErJHF2@ep-sweet-sunset-ajilyo7h-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function run() {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log('Connected');

  const ddl = `
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'CLIENT',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    CREATE INDEX IF NOT EXISTS "User_createdAt_id_idx" ON "User"("createdAt", "id");

    CREATE TABLE IF NOT EXISTS "Clinic" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "address" TEXT,
      "phone" TEXT,
      "description" TEXT,
      "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "Clinic_ownerId_idx" ON "Clinic"("ownerId");

    CREATE TABLE IF NOT EXISTS "Package" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "clinicId" TEXT NOT NULL REFERENCES "Clinic"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "price_cents" INTEGER NOT NULL,
      "duration_minutes" INTEGER NOT NULL DEFAULT 60,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "Package_clinicId_idx" ON "Package"("clinicId");

    CREATE TABLE IF NOT EXISTS "Booking" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "packageId" TEXT NOT NULL REFERENCES "Package"("id") ON DELETE CASCADE,
      "clinicId" TEXT NOT NULL REFERENCES "Clinic"("id") ON DELETE CASCADE,
      "start_at" TIMESTAMPTZ NOT NULL,
      "end_at" TIMESTAMPTZ NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "payment_status" TEXT NOT NULL DEFAULT 'UNPAID',
      "stripe_payment_id" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");
    CREATE INDEX IF NOT EXISTS "Booking_packageId_idx" ON "Booking"("packageId");
    CREATE INDEX IF NOT EXISTS "Booking_clinicId_idx" ON "Booking"("clinicId");
    CREATE INDEX IF NOT EXISTS "Booking_createdAt_id_idx" ON "Booking"("createdAt", "id");

    CREATE TABLE IF NOT EXISTS "Lead" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "problem" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

    CREATE TABLE IF NOT EXISTS "File" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "bookingId" TEXT REFERENCES "Booking"("id") ON DELETE SET NULL,
      "storage_key" TEXT NOT NULL,
      "filename" TEXT NOT NULL,
      "mime" TEXT NOT NULL,
      "size" INTEGER NOT NULL,
      "url" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "File_ownerId_idx" ON "File"("ownerId");
    CREATE INDEX IF NOT EXISTS "File_bookingId_idx" ON "File"("bookingId");

    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
    SELECT gen_random_uuid()::varchar, 'manual', '0001_init', now(), 1
    WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '0001_init');
  `;

  await client.query(ddl);
  console.log('Tables created');

  const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log('Tables:', res.rows.map(r => r.tablename));

  await client.end();
  console.log('Done');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
