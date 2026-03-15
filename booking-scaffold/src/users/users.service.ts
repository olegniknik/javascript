import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { decodeCursor, encodeCursor, CursorPayload } from '../common/utils/cursor';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const limit = Math.min(query.limit ?? 20, 100);
    const secret = this.config.get<string>('CURSOR_SECRET') || 'default-cursor-secret';
    let cursorPayload: CursorPayload | undefined;
    if (query.cursor) {
      try {
        cursorPayload = decodeCursor(query.cursor, secret);
      } catch {
        throw new BadRequestException('Invalid cursor');
      }
    }
    const take = limit + 1;
    const items = await this.prisma.user.findMany({
      take,
      ...(cursorPayload
        ? {
            where: {
              OR: [
                { createdAt: { lt: new Date(cursorPayload.createdAt) } },
                {
                  createdAt: new Date(cursorPayload.createdAt),
                  id: { lt: cursorPayload.id },
                },
              ],
            },
          }
        : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const hasMore = items.length > limit;
    const list = hasMore ? items.slice(0, limit) : items;
    const last = list[list.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor(
            { createdAt: last.createdAt.toISOString(), id: last.id },
            secret,
          )
        : undefined;
    return { items: list, nextCursor };
  }
}
