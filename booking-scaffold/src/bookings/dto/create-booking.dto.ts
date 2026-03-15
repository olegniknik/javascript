import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsISO8601 } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  packageId!: string;

  @ApiProperty({ example: '2024-06-01T10:00:00.000Z', description: 'Start time (ISO 8601)' })
  @IsISO8601()
  start_at!: string;
}
