import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
const BookingStatus = { PENDING: 'PENDING', CONFIRMED: 'CONFIRMED', CANCELLED: 'CANCELLED', COMPLETED: 'COMPLETED' } as const;
const PaymentStatus = { UNPAID: 'UNPAID', PAID: 'PAID', REFUNDED: 'REFUNDED' } as const;

const mockClinic = { id: 'clinic-1', name: 'Clinic', ownerId: 'user-1' };
const mockPackage = {
  id: 'pkg-1',
  title: 'Consultation',
  clinicId: 'clinic-1',
  clinic: mockClinic,
  price_cents: 5000,
  duration_minutes: 60,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const startAt = new Date('2024-06-01T10:00:00.000Z');
const endAt = new Date('2024-06-01T11:00:00.000Z');

const mockBooking = {
  id: 'book-1',
  userId: 'user-1',
  packageId: 'pkg-1',
  clinicId: 'clinic-1',
  start_at: startAt,
  end_at: endAt,
  status: BookingStatus.PENDING,
  payment_status: PaymentStatus.UNPAID,
  stripe_payment_id: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  package: mockPackage,
  user: { id: 'user-1', email: 'u@test.com' },
};

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: {
            package: {
              findFirstOrThrow: jest.fn().mockResolvedValue(mockPackage),
            },
            booking: {
              create: jest.fn().mockResolvedValue(mockBooking),
              findUnique: jest.fn().mockResolvedValue(mockBooking),
              findMany: jest.fn().mockResolvedValue([mockBooking]),
              update: jest.fn().mockResolvedValue({
                ...mockBooking,
                status: BookingStatus.CONFIRMED,
              }),
              findFirst: jest.fn().mockResolvedValue(mockBooking),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'CURSOR_SECRET' ? 'cursor-secret' : undefined,
            ),
          },
        },
      ],
    }).compile();
    service = module.get<BookingsService>(BookingsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('create returns booking with start_at and end_at', async () => {
    const result = await service.create('user-1', 'pkg-1', startAt);
    expect(result).toEqual(mockBooking);
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          packageId: 'pkg-1',
          clinicId: 'clinic-1',
          status: BookingStatus.PENDING,
          payment_status: PaymentStatus.UNPAID,
        }),
      }),
    );
  });

  it('confirm updates status to CONFIRMED', async () => {
    const result = await service.confirm('book-1');
    expect(result.status).toBe(BookingStatus.CONFIRMED);
  });

  it('confirm throws NotFoundException when booking not found', async () => {
    jest.spyOn(prisma.booking, 'findUnique').mockResolvedValue(null);
    await expect(service.confirm('unknown')).rejects.toThrow(NotFoundException);
  });
});
