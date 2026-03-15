import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('admin')
  @Get('admin/')
  @ApiOperation({ summary: 'Админ-панель' })
  serveAdmin(@Res() res: Response) {
    // Сначала dist/admin (после nest build с assets), иначе admin в корне проекта
    const inDist = join(__dirname, 'admin', 'index.html');
    const inRoot = join(process.cwd(), 'admin', 'index.html');
    const path = existsSync(inDist) ? inDist : inRoot;
    res.sendFile(path);
  }
}
