import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { Client } from 'pg';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Landing page' })
  serveLanding(@Res() res: Response) {
    const inDist = join(__dirname, '..', 'public', 'index.html');
    const inRoot = join(process.cwd(), 'public', 'index.html');
    const path = existsSync(inDist) ? inDist : inRoot;
    if (existsSync(path)) {
      res.sendFile(path);
    } else {
      res.json({ status: 'ok', landing: 'not found', tried: [inDist, inRoot] });
    }
  }

  @Get('admin')
  @Get('admin/')
  @ApiOperation({ summary: 'Админ-панель' })
  serveAdmin(@Res() res: Response) {
    const inPublic = join(process.cwd(), 'public', 'admin', 'index.html');
    const inDist = join(__dirname, 'admin', 'index.html');
    const inRoot = join(process.cwd(), 'admin', 'index.html');
    const path = existsSync(inPublic) ? inPublic : existsSync(inDist) ? inDist : inRoot;
    res.sendFile(path);
  }

  @Get('debug-db')
  @ApiOperation({ summary: 'DB debug: connection + table presence' })
  async debugDb() {
    async function probe(connectionString?: string) {
      if (!connectionString) {
        return { connected: false, userTable: null, error: 'not set' };
      }
      let meta: any = null;
      try {
        const u = new URL(connectionString);
        meta = { host: u.hostname, port: u.port || null, user: u.username || null };
      } catch { meta = null; }

      const client = new Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
      try {
        await client.connect();
        const table = await client.query(`SELECT to_regclass('"User"') AS user_table;`);
        return { connected: true, userTable: table.rows?.[0]?.user_table ?? null, meta };
      } catch (e: any) {
        return { connected: false, userTable: null, error: String(e?.message ?? '').slice(0, 500), meta };
      } finally {
        try { await client.end(); } catch {}
      }
    }
    return { ok: true, pooler: await probe(process.env.DATABASE_URL), direct: await probe(process.env.DIRECT_URL) };
  }

  @Get('migrate')
  @ApiOperation({ summary: 'Run DB migrations via pg driver' })
  async migrate() {
    const connStr = process.env.DATABASE_URL;
    if (!connStr) return { error: 'DATABASE_URL not set' };

    const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
    const results: string[] = [];
    try {
      await client.connect();
      results.push('connected');

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
        SELECT gen_random_uuid()::varchar, 'manual', '20260315065305_init', now(), 1
        WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260315065305_init');
      `;
      await client.query(ddl);
      results.push('tables created');

      const cnt = await client.query('SELECT COUNT(*) as c FROM "User"');
      results.push('user_count=' + cnt.rows[0].c);
    } catch (e: any) {
      results.push('error: ' + String(e?.message ?? '').slice(0, 500));
    } finally {
      try { await client.end(); } catch {}
    }
    return { results };
  }

  @Get('debug-prisma')
  @ApiOperation({ summary: 'Test Prisma Client connection + register dry-run' })
  async debugPrisma() {
    const results: Record<string, any> = {};
    try {
      const count = await this.prisma.user.count();
      results.prisma = { ok: true, userCount: count };
    } catch (e: any) {
      results.prisma = { ok: false, error: String(e?.message ?? e).slice(0, 500) };
    }

    results.env = {
      JWT_SECRET: process.env.JWT_SECRET ? `set (${process.env.JWT_SECRET.length} chars)` : 'NOT SET',
      DATABASE_URL_len: (process.env.DATABASE_URL || '').length,
      DATABASE_URL_hasNewline: /[\r\n]/.test(process.env.DATABASE_URL || ''),
    };

    try {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('test123', 10);
      const ok = await bcrypt.compare('test123', hash);
      results.bcrypt = { ok };
    } catch (e: any) {
      results.bcrypt = { ok: false, error: String(e?.message ?? e).slice(0, 500) };
    }

    try {
      const testUser = await this.prisma.user.create({
        data: { email: `smoke-${Date.now()}@test.com`, passwordHash: 'test', role: 'CLIENT' },
      });
      results.createUser = { ok: true, id: testUser.id };
      await this.prisma.user.delete({ where: { id: testUser.id } });
      results.deleteUser = { ok: true };
    } catch (e: any) {
      results.createUser = { ok: false, error: String(e?.message ?? e).slice(0, 500) };
    }

    return results;
  }
}
