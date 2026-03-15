import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaginationQueryDto } from '../users/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface RequestWithUser { user: { id: string; email: string; role: string } }

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Create booking' })
  create(@Req() req: RequestWithUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(req.user.id, dto.packageId, new Date(dto.start_at));
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List bookings (cursor pagination)' })
  findAll(
    @Req() req: RequestWithUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.bookingsService.findAll(req.user.id, req.user.role, query);
  }

  @Patch(':id/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Confirm booking' })
  confirm(@Param('id') id: string) {
    return this.bookingsService.confirm(id);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Stripe checkout session for booking' })
  createCheckout(
    @Req() req: RequestWithUser,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.bookingsService.createCheckoutSession(
      req.user.id,
      dto.bookingId,
      dto.successUrl,
      dto.cancelUrl,
    );
  }
}
