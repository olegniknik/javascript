import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { SaveFileMetadataDto } from './dto/save-file-metadata.dto';

@Injectable()
export class FilesService {
  private s3: S3Client | null = null;
  private bucket: string = '';
  private region: string = 'us-east-1';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const accessKey = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('S3_BUCKET') || '';
    this.region = this.config.get<string>('S3_REGION') || 'us-east-1';
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    if (accessKey && secretKey && this.bucket) {
      this.s3 = new S3Client({
        region: this.region,
        ...(endpoint && {
          endpoint,
          forcePathStyle: true,
        }),
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      });
    }
  }

  async getPresignedUploadUrl(userId: string, dto: PresignedUrlDto) {
    if (!this.s3) {
      throw new BadRequestException('S3 is not configured');
    }
    const key = `uploads/${userId}/${Date.now()}-${dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentLength: dto.size,
      ...(dto.mimeType && { ContentType: dto.mimeType }),
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return {
      uploadUrl: url,
      storage_key: key,
      bucket: this.bucket,
      expiresIn: 3600,
    };
  }

  async saveMetadata(userId: string, dto: SaveFileMetadataDto) {
    return this.prisma.file.create({
      data: {
        ownerId: userId,
        bookingId: dto.bookingId || undefined,
        storage_key: dto.storage_key,
        filename: dto.filename,
        mime: dto.mime,
        size: dto.size,
        url: dto.url,
      },
    });
  }
}
