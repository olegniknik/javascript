import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
// Строковые константы вместо enum (SQLite не поддерживает enum)
const BookingStatus = { PENDING: 'PENDING', CONFIRMED: 'CONFIRMED', CANCELLED: 'CANCELLED', COMPLETED: 'COMPLETED' } as const;
const PaymentStatus = { UNPAID: 'UNPAID', PAID: 'PAID', REFUNDED: 'REFUNDED' } as const;
import { decodeCursor, encodeCursor, CursorPayload } from '../common/utils/cursor';
import { PaginationQueryDto } from '../users/dto/pagination-query.dto';
import Stripe from 'stripe';

@Injectable()
export class BookingsService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  async create(userId: string, packageId: string, start_at: Date) {
    const pkg = await this.prisma.package.findFirstOrThrow({
      where: { id: packageId, active: true },
      include: { clinic: true },
    });
    const end_at = new Date(start_at.getTime() + pkg.duration_minutes * 60 * 1000);
    return this.prisma.booking.create({
      data: {
        userId,
        packageId,
        clinicId: pkg.clinicId,
        start_at,
        end_at,
        status: BookingStatus.PENDING,
        payment_status: PaymentStatus.UNPAID,
      },
      include: { package: true, clinic: true, user: { select: { id: true, email: true } } },
    });
  }

  async confirm(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking can only be confirmed from PENDING');
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
      include: { package: true, clinic: true, user: { select: { id: true, email: true } } },
    });
  }

  async findAll(userId: string, role: string, query: PaginationQueryDto) {
    const limit = Math.min(query.limit ?? 20, 100);
    // Чтобы заявки всегда подгружались в админку, используем значение по умолчанию, если CURSOR_SECRET не задан
    const secret = this.config.get<string>('CURSOR_SECRET') || 'default-cursor-secret';
    let cursorPayload: CursorPayload | undefined;
    if (query.cursor) {
      try {
        cursorPayload = decodeCursor(query.cursor, secret);
      } catch {
        throw new BadRequestException('Invalid cursor');
      }
    }
    const take = limit + 1;
    const whereBase = role === 'CLIENT' ? { userId } : {};
    const whereCursor = cursorPayload
      ? {
          ...whereBase,
          OR: [
            { createdAt: { lt: new Date(cursorPayload.createdAt) } },
            {
              createdAt: new Date(cursorPayload.createdAt),
              id: { lt: cursorPayload.id },
            },
          ],
        }
      : whereBase;
    const items = await this.prisma.booking.findMany({
      where: whereCursor,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        package: true,
        clinic: true,
        user: { select: { id: true, email: true } },
      },
    });
    const hasMore = items.length > limit;
    const list = hasMore ? items.slice(0, limit) : items;
    const last = list[list.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor(
            { createdAt: last.createdAt.toISOString(), id: last.id },
            secret,
          )
        : undefined;
    return { items: list, nextCursor };
  }

  async createCheckoutSession(
    userId: string,
    bookingId: string,
    successUrl?: string,
    cancelUrl?: string,
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { package: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('Not your booking');
    if (booking.payment_status === PaymentStatus.PAID) {
      throw new BadRequestException('Booking already paid');
    }
    const baseUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: booking.package.title,
              description: booking.package.description || `Booking ${bookingId}`,
            },
            unit_amount: booking.package.price_cents,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/booking/cancel`,
      metadata: { bookingId },
      client_reference_id: bookingId,
    });
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { stripe_payment_id: session.id },
    });
    return { url: session.url, sessionId: session.id };
  }

  /** Вызывается webhook'ом Stripe при checkout.session.completed */
  async markPaidBySessionId(sessionId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { stripe_payment_id: sessionId },
    });
    if (!booking) return null;
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { payment_status: PaymentStatus.PAID },
    });
    return booking.id;
  }
}
