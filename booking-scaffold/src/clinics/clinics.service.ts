import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateClinicDto) {
    return this.prisma.clinic.create({
      data: {
        name: dto.name.trim(),
        address: dto.address?.trim(),
        phone: dto.phone?.trim(),
        description: dto.description?.trim(),
        ownerId,
      },
    });
  }

  findAll() {
    return this.prisma.clinic.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  async update(id: string, dto: UpdateClinicDto) {
    await this.findOne(id);
    return this.prisma.clinic.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.address !== undefined && { address: dto.address?.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.clinic.delete({ where: { id } });
  }
}
