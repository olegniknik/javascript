import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit() {
    if (process.env.VERCEL === '1') {
      // In serverless environment use lazy DB connection on first query.
      return;
    }
    try {
      await this.$connect();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '';
      if (msg.includes("Can't reach database server") || msg.includes('P1001') || msg.includes('SQLITE')) {
        console.error('\n[Prisma] БД недоступна. Выполните: npx prisma migrate dev && npx prisma db seed\n');
      }
      // Keep full error details in logs for production debugging on Vercel.
      console.error('[Prisma] Connection error:', e);
      throw e;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
