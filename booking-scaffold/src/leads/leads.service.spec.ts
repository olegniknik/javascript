import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: PrismaService;
  let mailService: MailService;

  const mockLead = {
    id: 'lead-1',
    name: 'Иван',
    phone: '+7 (900) 123-45-67',
    problem: 'draft',
    createdAt: new Date('2026-03-15T12:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: {
            lead: {
              create: jest.fn().mockResolvedValue(mockLead),
              findMany: jest.fn().mockResolvedValue([mockLead]),
            },
          },
        },
        {
          provide: MailService,
          useValue: {
            sendLeadNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();
    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);
  });

  it('create saves lead and returns it', async () => {
    const result = await service.create('Иван', '+7 (900) 123-45-67', 'draft');
    expect(result).toEqual(mockLead);
    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: { name: 'Иван', phone: '+7 (900) 123-45-67', problem: 'draft' },
    });
  });

  it('create calls sendLeadNotification with lead data', async () => {
    await service.create('Иван', '+7 (900) 123-45-67', 'draft');
    expect(mailService.sendLeadNotification).toHaveBeenCalledWith({
      id: mockLead.id,
      name: mockLead.name,
      phone: mockLead.phone,
      problem: mockLead.problem,
      createdAt: mockLead.createdAt,
    });
  });

  it('create returns lead even when sendLeadNotification throws', async () => {
    jest.spyOn(mailService, 'sendLeadNotification').mockRejectedValueOnce(new Error('SMTP failed'));
    const result = await service.create('Иван', '+7 (900) 123-45-67', 'draft');
    expect(result).toEqual(mockLead);
  });
});
