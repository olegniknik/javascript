import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, MaxLength, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveFileMetadataDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  storage_key!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  filename!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  mime!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  size!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;
}
