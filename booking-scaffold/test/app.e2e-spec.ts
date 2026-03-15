import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('POST /auth/login returns access_token for admin@local.test', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@local.test', password: 'password123' })
        .expect(201);
      expect(res.body).toHaveProperty('access_token');
      accessToken = res.body.access_token;
    });

    it('POST /auth/login returns 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@local.test', password: 'wrong' })
        .expect(401);
    });
  });

  describe('clinics and packages', () => {
    let clinicId: string;
    let packageId: string;

    it('POST /clinics creates clinic when authenticated', async () => {
      if (!accessToken) {
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'admin@local.test', password: 'password123' });
        accessToken = login.body.access_token;
      }
      const admin = await prisma.user.findUnique({
        where: { email: 'admin@local.test' },
      });
      expect(admin).toBeTruthy();
      const res = await request(app.getHttpServer())
        .post('/clinics')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Clinic', address: 'Test', phone: '+7999' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      clinicId = res.body.id;
    });

    it('POST /packages creates package', async () => {
      const res = await request(app.getHttpServer())
        .post('/packages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'E2E Package',
          clinicId,
          price_cents: 1000,
          duration_minutes: 30,
        })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      packageId = res.body.id;
    });
  });

  describe('bookings', () => {
    let packageId: string;
    let bookingId: string;

    beforeAll(async () => {
      const pkg = await prisma.package.findFirst();
      if (pkg) {
        packageId = pkg.id;
      } else {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const clinic = await prisma.clinic.create({
          data: { name: 'E2E Clinic', address: 'Test', ownerId: admin!.id },
        });
        const p = await prisma.package.create({
          data: {
            title: 'E2E Package',
            clinicId: clinic.id,
            price_cents: 1000,
            duration_minutes: 30,
          },
        });
        packageId = p.id;
      }
    });

    it('POST /bookings creates booking with start_at', async () => {
      if (!accessToken) {
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'admin@local.test', password: 'password123' });
        accessToken = login.body.access_token;
      }
      const start_at = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ packageId, start_at })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.payment_status).toBe('UNPAID');
      bookingId = res.body.id;
    });

    it('GET /bookings returns items and nextCursor when more than limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookings?limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      if (res.body.items.length > 0) {
        expect(res.body.items[0]).toHaveProperty('createdAt');
        expect(res.body.items[0]).toHaveProperty('id');
        expect(res.body.items[0]).toHaveProperty('start_at');
        expect(res.body.items[0]).toHaveProperty('payment_status');
      }
      if (res.body.items.length >= 1) {
        expect(res.body).toHaveProperty('nextCursor');
      }
    });
  });

  describe('files presigned-url', () => {
    it('POST /files/presigned-url returns uploadUrl or 400 when S3 not configured', async () => {
      const res = await request(app.getHttpServer())
        .post('/files/presigned-url')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ filename: 'test.txt', size: 100, mimeType: 'text/plain' });
      if (res.status === 200) {
        expect(res.body).toHaveProperty('uploadUrl');
        expect(res.body).toHaveProperty('storage_key');
        expect(res.body).toHaveProperty('bucket');
      } else {
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('S3');
      }
    });
  });
});
