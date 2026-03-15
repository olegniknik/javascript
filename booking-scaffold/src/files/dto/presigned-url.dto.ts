import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/** Максимальный размер файла для presigned URL (байты). Дублируется в конфиге S3. */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

export class PresignedUrlDto {
  @ApiProperty({ description: 'Имя файла (ключ в S3)' })
  @IsString()
  @MaxLength(300)
  filename!: string;

  @ApiProperty({ description: 'Размер в байтах' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_SIZE)
  size!: number;

  @ApiPropertyOptional({ example: 'image/png' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;
}
