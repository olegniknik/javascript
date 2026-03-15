import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-1',
    email: 'admin@local.test',
    passwordHash: '',
    role: 'ADMIN' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 10);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('jwt-token') },
        },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('login returns access_token for valid credentials', async () => {
    const dto: LoginDto = { email: 'admin@local.test', password: 'password123' };
    const result = await service.login(dto);
    expect(result).toEqual({ access_token: 'jwt-token' });
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', email: 'admin@local.test', role: 'ADMIN' }),
    );
  });

  it('login throws UnauthorizedException for wrong password', async () => {
    const dto: LoginDto = { email: 'admin@local.test', password: 'wrong' };
    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
  });

  it('login throws UnauthorizedException when user not found', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const dto: LoginDto = { email: 'unknown@test.com', password: 'password123' };
    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
  });

  it('login throws UnauthorizedException when user is inactive', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockUser, isActive: false });
    const dto: LoginDto = { email: 'admin@local.test', password: 'password123' };
    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
  });
});
