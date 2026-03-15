import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: '+7 (900) 123-45-67' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  phone!: string;

  @ApiPropertyOptional({ example: 'Дует из окна' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  problem?: string;
}
