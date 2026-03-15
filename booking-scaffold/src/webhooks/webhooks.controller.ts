import { Controller, Post, Req, Headers, RawBodyRequest, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BookingsService } from '../bookings/bookings.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly bookingsService: BookingsService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') || null;
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  @Post('stripe')
  @ApiExcludeEndpoint()
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!this.stripe || !this.webhookSecret) {
      throw new BadRequestException('Stripe webhook not configured');
    }
    // rawBody включается в main.ts через rawBody: true для проверки подписи Stripe
    const rawBody = (req as unknown as { rawBody?: Buffer })?.rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Raw body required for webhook signature');
    }
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException('Invalid signature');
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.bookingsService.markPaidBySessionId(session.id);
    }
    return { received: true };
  }
}
