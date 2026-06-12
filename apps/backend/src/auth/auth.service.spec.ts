import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    create: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findByEmail: jest.fn(),
    toAuthenticatedUser: jest.fn(),
    revokeSessions: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const prismaService = {
    emailVerificationCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    passwordResetCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    securityLog: {
      create: jest.fn(),
    },
  };

  const emailService = {
    sendCode: jest.fn(),
  };

  const configService = {
    get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
  };
  const authRateLimitService = {
    assertAllowed: jest.fn(),
  };

  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaService.refreshToken.create.mockResolvedValue({ id: 'refresh-1' });
    prismaService.securityLog.create.mockResolvedValue({});
    authService = new AuthService(
      usersService as never,
      jwtService as unknown as JwtService,
      prismaService as never,
      emailService as never,
      configService as unknown as ConfigService,
      authRateLimitService as never,
    );
  });

  it('registers a pending USER and sends verification code without passwordHash', async () => {
    usersService.create.mockResolvedValue({
      id: 'user-1',
      name: 'Demo',
      email: 'demo@example.com',
      role: Role.USER,
      status: UserStatus.PENDING_VERIFICATION,
    });

    const result = await authService.register({
      name: 'Demo',
      email: 'DEMO@example.com',
      password: 'Password123!',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'demo@example.com',
        role: Role.USER,
        status: UserStatus.PENDING_VERIFICATION,
        passwordHash: expect.any(String),
      }),
    );
    expect(prismaService.emailVerificationCode.create).toHaveBeenCalled();
    expect(emailService.sendCode).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'demo@example.com',
        purpose: 'email-verification',
      }),
    );
    expect(result).toMatchObject({
      message: 'Registration successful. Please verify your email.',
      user: {
        id: 'user-1',
        name: 'Demo',
        email: 'demo@example.com',
        role: Role.USER,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('logs in with valid credentials', async () => {
    const passwordHash = await hash('Password123', 4);
    const user = {
      id: 'user-1',
      name: 'Demo',
      email: 'demo@example.com',
      passwordHash,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersService.findByEmailWithPassword.mockResolvedValue(user);
    usersService.toAuthenticatedUser.mockReturnValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    jwtService.sign.mockReturnValue('token');

    await expect(
      authService.login({
        email: 'demo@example.com',
        password: 'Password123',
      }),
    ).resolves.toMatchObject({
      accessToken: 'token',
      user: {
        id: 'user-1',
        email: 'demo@example.com',
      },
    });
  });

  it('rejects invalid credentials', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'Password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns generic password reset response for unregistered email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.forgotPassword({ email: 'missing@example.com' }),
    ).resolves.toEqual({
      message:
        'Si el correo esta registrado y activo, enviaremos un codigo de recuperacion.',
    });
  });

  it('sends password reset code for active registered email', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
      status: UserStatus.ACTIVE,
    });
    prismaService.passwordResetCode.findFirst.mockResolvedValue(null);
    prismaService.passwordResetCode.create.mockResolvedValue({});

    await expect(
      authService.forgotPassword({ email: 'demo@example.com' }),
    ).resolves.toEqual({
      message:
        'Si el correo esta registrado y activo, enviaremos un codigo de recuperacion.',
    });
    expect(emailService.sendCode).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'demo@example.com',
        purpose: 'password-reset',
      }),
    );
  });

  it('enforces cooldown when resending verification code', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
      status: UserStatus.PENDING_VERIFICATION,
    });
    prismaService.emailVerificationCode.findFirst.mockResolvedValue({
      createdAt: new Date(),
    });

    await expect(
      authService.resendVerificationCode({ email: 'demo@example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes server-side session state on logout', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', tokenVersion: 0 });
    prismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    usersService.revokeSessions.mockResolvedValue(undefined);

    await authService.logoutSession('old-session-token', 'old-refresh-token');

    expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(usersService.revokeSessions).toHaveBeenCalledWith('user-1');
  });
});
