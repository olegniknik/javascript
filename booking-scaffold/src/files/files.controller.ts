import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { SaveFileMetadataDto } from './dto/save-file-metadata.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser { user: { id: string } }

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presigned-url')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get presigned URL for S3/MinIO upload' })
  getPresignedUrl(@Req() req: RequestWithUser, @Body() dto: PresignedUrlDto) {
    return this.filesService.getPresignedUploadUrl(req.user.id, dto);
  }

  @Post('metadata')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save file metadata after upload' })
  saveMetadata(@Req() req: RequestWithUser, @Body() dto: SaveFileMetadataDto) {
    return this.filesService.saveMetadata(req.user.id, dto);
  }
}
