import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';

// Mock S3 presigner
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: PrismaService,
          useValue: {
            file: {
              create: jest.fn().mockResolvedValue({
                id: 'file-1',
                storage_key: 'k',
                filename: 'f',
                mime: 'image/png',
                size: 100,
                ownerId: 'u1',
                createdAt: new Date(),
              }),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const env: Record<string, string> = {
                AWS_ACCESS_KEY_ID: 'key',
                AWS_SECRET_ACCESS_KEY: 'secret',
                S3_BUCKET: 'mybucket',
                S3_REGION: 'us-east-1',
                S3_ENDPOINT: '',
              };
              return env[key] || undefined;
            }),
          },
        },
      ],
    }).compile();
    service = module.get<FilesService>(FilesService);
  });

  it('getPresignedUploadUrl returns uploadUrl and storage_key', async () => {
    const dto: PresignedUrlDto = {
      filename: 'test.png',
      size: 1024,
      mimeType: 'image/png',
    };
    const result = await service.getPresignedUploadUrl('user-1', dto);
    expect(result.uploadUrl).toBe('https://s3.example.com/signed-url');
    expect(result.storage_key).toContain('uploads/user-1/');
    expect(result.bucket).toBe('mybucket');
    expect(result.expiresIn).toBe(3600);
  });

  it('getPresignedUploadUrl throws when S3 not configured', async () => {
    const module2 = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();
    const svc = module2.get<FilesService>(FilesService);
    const dto: PresignedUrlDto = { filename: 'x', size: 100 };
    await expect(svc.getPresignedUploadUrl('u1', dto)).rejects.toThrow(BadRequestException);
  });
});
