import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty()
  @IsString()
  bookingId!: string;

  @ApiPropertyOptional({ description: 'Success URL after payment' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Cancel URL if user cancels' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
