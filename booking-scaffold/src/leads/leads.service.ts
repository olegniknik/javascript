import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(name: string, phone: string, problem?: string) {
    const lead = await this.prisma.lead.create({
      data: { name: name.trim(), phone: phone.trim(), problem: problem?.trim() },
    });

    // Отправка письма не блокирует ответ: при ошибке только логируем
    try {
      await this.mailService.sendLeadNotification({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        problem: lead.problem,
        createdAt: lead.createdAt,
      });
    } catch (err) {
      this.logger.error(`Lead email failed: leadId=${lead.id}`, err instanceof Error ? err.stack : String(err));
    }

    return lead;
  }

  findAll() {
    return this.prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
