import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  create(name: string, phone: string, problem?: string) {
    return this.prisma.lead.create({
      data: { name: name.trim(), phone: phone.trim(), problem: problem?.trim() },
    });
  }

  findAll() {
    return this.prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
