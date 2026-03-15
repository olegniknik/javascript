import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePackageDto) {
    return this.prisma.package.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        clinicId: dto.clinicId,
        price_cents: dto.price_cents,
        duration_minutes: dto.duration_minutes ?? 60,
        active: dto.active ?? true,
      },
      include: { clinic: true },
    });
  }

  findAll() {
    return this.prisma.package.findMany({
      where: { active: true },
      orderBy: { title: 'asc' },
      include: { clinic: true },
    });
  }

  async findOne(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: { clinic: true },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  async update(id: string, dto: UpdatePackageDto) {
    await this.findOne(id);
    return this.prisma.package.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.clinicId !== undefined && { clinicId: dto.clinicId }),
        ...(dto.price_cents !== undefined && { price_cents: dto.price_cents }),
        ...(dto.duration_minutes !== undefined && { duration_minutes: dto.duration_minutes }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: { clinic: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.package.delete({ where: { id } });
  }
}
