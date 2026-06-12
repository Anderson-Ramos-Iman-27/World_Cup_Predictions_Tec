import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt } from 'crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  async assertLoginIpLimit(ip: string) {
    await this.authRateLimitService.assertAllowedForIp(
      'login',
      ip,
      30,
      15 * 60 * 1000,
    );
  }

  async assertVerifyEmailIpLimit(ip: string) {
    await this.authRateLimitService.assertAllowedForIp(
      'verify-email',
      ip,
      20,
      15 * 60 * 1000,
    );
  }

  async assertResendVerificationIpLimit(ip: string) {
    await this.authRateLimitService.assertAllowedForIp(
      'resend-verification',
      ip,
      10,
      10 * 60 * 1000,
    );
  }

  async assertForgotPasswordIpLimit(ip: string) {
    await this.authRateLimitService.assertAllowedForIp(
      'forgot-password',
      ip,
      10,
      10 * 60 * 1000,
    );
  }

  async assertResetPasswordIpLimit(ip: string) {
    await this.authRateLimitService.assertAllowedForIp(
      'reset-password',
      ip,
      20,
      15 * 60 * 1000,
    );
  }

  async register(registerDto: RegisterDto, clientIp?: string) {
    await this.verifyRegisterCaptcha(registerDto.captchaToken, clientIp);
    await this.authRateLimitService.assertAllowed(
      `register:${registerDto.email.toLowerCase()}`,
      5,
      60 * 60 * 1000,
    );
    const { captchaToken: _captchaToken, ...registerInput } = registerDto;
    const passwordHash = await hash(registerDto.password, 12);
    const user = await this.usersService.create({
      name: registerInput.name,
      email: registerInput.email.toLowerCase(),
      passwordHash,
      role: Role.USER,
      status: UserStatus.PENDING_VERIFICATION,
    });
    await this.createAndSendEmailVerificationCode(user.id, user.email);

    return {
      message: 'Registration successful. Please verify your email.',
      user,
    };
  }

  async login(loginDto: LoginDto) {
    await this.authRateLimitService.assertAllowed(
      `login:${loginDto.email.toLowerCase()}`,
      5,
      15 * 60 * 1000,
    );
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email.toLowerCase(),
    );

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.createSecurityLog('LOGIN_FAILED', {
        email: loginDto.email.toLowerCase(),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await compare(loginDto.password, user.passwordHash);

    if (!passwordMatches) {
      await this.createSecurityLog('LOGIN_FAILED', {
        userId: user.id,
        email: user.email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.createSecurityLog('LOGIN_SUCCESS', {
      userId: user.id,
      email: user.email,
    });
    return this.createAuthResponse(this.usersService.toAuthenticatedUser(user));
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    await this.authRateLimitService.assertAllowed(
      `verify-email:${verifyEmailDto.email.toLowerCase()}`,
      8,
      15 * 60 * 1000,
    );
    const user = await this.usersService.findByEmail(verifyEmailDto.email);

    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.consumeEmailVerificationCode(user.id, verifyEmailDto.code);
    const verifiedUser = await this.usersService.markEmailVerified(user.id);

    return this.createAuthResponse(verifiedUser);
  }

  async resendVerificationCode(dto: ResendVerificationCodeDto) {
    await this.authRateLimitService.assertAllowed(
      `resend-verification:${dto.email.toLowerCase()}`,
      3,
      10 * 60 * 1000,
    );
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new BadRequestException('El correo no esta registrado');
    }

    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('La cuenta no requiere verificacion');
    }

    await this.ensureEmailVerificationCooldown(user.id);
    await this.createAndSendEmailVerificationCode(user.id, user.email);

    return {
      message: 'Se envio un nuevo codigo de verificacion.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    await this.authRateLimitService.assertAllowed(
      `forgot-password:${dto.email.toLowerCase()}`,
      3,
      10 * 60 * 1000,
    );
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      await this.createSecurityLog('PASSWORD_RESET_REQUESTED_UNKNOWN_EMAIL', {
        email: dto.email.toLowerCase(),
      });
      return {
        message:
          'Si el correo esta registrado y activo, enviaremos un codigo de recuperacion.',
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.createSecurityLog('PASSWORD_RESET_REQUESTED_INACTIVE_ACCOUNT', {
        userId: user.id,
        email: user.email,
      });
      return {
        message:
          'Si el correo esta registrado y activo, enviaremos un codigo de recuperacion.',
      };
    }

    await this.ensurePasswordResetCooldown(user.id);
    await this.createAndSendPasswordResetCode(user.id, user.email);

    await this.createSecurityLog('PASSWORD_RESET_CODE_SENT', {
      userId: user.id,
      email: user.email,
    });
    return {
      message:
        'Si el correo esta registrado y activo, enviaremos un codigo de recuperacion.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.authRateLimitService.assertAllowed(
      `reset-password:${dto.email.toLowerCase()}`,
      8,
      15 * 60 * 1000,
    );
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Invalid password reset code');
    }

    await this.consumePasswordResetCode(user.id, dto.code);
    await this.usersService.updatePassword(user.id, dto.newPassword);
    await this.revokeUserRefreshTokens(user.id);
    await this.createSecurityLog('PASSWORD_CHANGED', {
      userId: user.id,
      email: user.email,
    });

    return {
      message: 'Contraseña actualizada correctamente.',
    };
  }

  async refreshSession(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
      },
      include: { user: true },
    });

    if (
      !record ||
      record.revokedAt ||
      record.expiresAt <= new Date() ||
      record.user.status !== UserStatus.ACTIVE
    ) {
      await this.createSecurityLog('REFRESH_TOKEN_REJECTED', {});
      throw new UnauthorizedException('Invalid refresh token');
    }

    const nextRefreshToken = this.generateRefreshToken();
    const nextRecord = await this.prisma.refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: this.hashRefreshToken(nextRefreshToken),
        expiresAt: this.getRefreshTokenExpirationDate(),
      },
    });

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: {
        revokedAt: new Date(),
        replacedById: nextRecord.id,
      },
    });

    await this.createSecurityLog('SESSION_REFRESHED', {
      userId: record.userId,
      email: record.user.email,
    });

    return {
      accessToken: this.createAccessToken(
        this.usersService.toAuthenticatedUser(record.user),
      ),
      user: this.usersService.toAuthenticatedUser(record.user),
      refreshToken: nextRefreshToken,
    };
  }

  async logoutSession(sessionToken?: string, refreshToken?: string) {
    const userId = (await this.resolveUserIdFromSessionToken(sessionToken))
      ?? (await this.resolveUserIdFromRefreshToken(refreshToken));

    if (!userId) {
      return;
    }

    await this.revokeUserRefreshTokens(userId);
    await this.usersService.revokeSessions(userId);
    await this.createSecurityLog('LOGOUT_SUCCESS', {
      userId,
    });
  }

  private async createAndSendEmailVerificationCode(userId: string, email: string) {
    const code = this.generateCode();
    const codeHash = await hash(code, 12);
    const expiresAt = this.getCodeExpirationDate();

    await this.prisma.emailVerificationCode.create({
      data: {
        userId,
        codeHash,
        expiresAt,
      },
    });

    await this.emailService.sendCode({
      to: email,
      subject: 'Verifica tu cuenta',
      code,
      purpose: 'email-verification',
    });
  }

  private async createAndSendPasswordResetCode(userId: string, email: string) {
    const code = this.generateCode();
    const codeHash = await hash(code, 12);
    const expiresAt = this.getCodeExpirationDate();

    await this.prisma.passwordResetCode.create({
      data: {
        userId,
        codeHash,
        expiresAt,
      },
    });

    await this.emailService.sendCode({
      to: email,
      subject: 'Recupera tu contraseña',
      code,
      purpose: 'password-reset',
    });
  }

  private async consumeEmailVerificationCode(userId: string, code: string) {
    const record = await this.prisma.emailVerificationCode.findFirst({
      where: {
        userId,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record || record.attempts >= 5) {
      throw new BadRequestException('Codigo de verificacion invalido');
    }

    if (!(await compare(code.toUpperCase(), record.codeHash))) {
      await this.prisma.emailVerificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  }

  private async consumePasswordResetCode(userId: string, code: string) {
    const record = await this.prisma.passwordResetCode.findFirst({
      where: {
        userId,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record || record.attempts >= 5) {
      throw new BadRequestException('Codigo de recuperacion invalido');
    }

    if (!(await compare(code.toUpperCase(), record.codeHash))) {
      await this.prisma.passwordResetCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Codigo de recuperacion invalido');
    }

    await this.prisma.passwordResetCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  }

  private generateCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let index = 0; index < 8; index += 1) {
      code += alphabet[randomInt(0, alphabet.length)];
    }

    return code;
  }

  private generateRefreshToken() {
    return randomBytes(48).toString('base64url');
  }

  private getRefreshTokenExpirationDate() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private async createRefreshToken(userId: string) {
    const refreshToken = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: this.getRefreshTokenExpirationDate(),
      },
    });

    return refreshToken;
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private async revokeUserRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private async resolveUserIdFromSessionToken(sessionToken?: string) {
    if (!sessionToken) {
      return null;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        tokenVersion?: number;
      }>(sessionToken);

      return payload.sub;
    } catch {
      return null;
    }
  }

  private async resolveUserIdFromRefreshToken(refreshToken?: string) {
    if (!refreshToken) {
      return null;
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
      },
      select: {
        userId: true,
      },
    });

    return record?.userId ?? null;
  }

  private async ensureEmailVerificationCooldown(userId: string) {
    const lastCode = await this.prisma.emailVerificationCode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    this.ensureCodeCooldown(lastCode?.createdAt);
  }

  private async ensurePasswordResetCooldown(userId: string) {
    const lastCode = await this.prisma.passwordResetCode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    this.ensureCodeCooldown(lastCode?.createdAt);
  }

  private ensureCodeCooldown(createdAt?: Date) {
    if (!createdAt) {
      return;
    }

    const secondsSinceLastCode = (Date.now() - createdAt.getTime()) / 1000;

    if (secondsSinceLastCode < 60) {
      throw new BadRequestException(
        `Espera ${Math.ceil(60 - secondsSinceLastCode)} segundos antes de solicitar otro codigo`,
      );
    }
  }

  private getCodeExpirationDate() {
    const minutes = this.configService.get<number>(
      'EMAIL_CODE_EXPIRES_MINUTES',
      15,
    );

    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private async createAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    tokenVersion?: number;
  }) {
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken: this.createAccessToken(user),
      refreshToken,
      user,
    };
  }

  private createAccessToken(user: {
    id: string;
    email: string;
    role: Role;
    tokenVersion?: number;
  }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    });
  }

  private async createSecurityLog(
    action: string,
    data: {
      userId?: string;
      email?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.prisma.securityLog.create({
      data: {
        action,
        userId: data.userId,
        email: data.email,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async verifyRegisterCaptcha(captchaToken?: string, clientIp?: string) {
    const turnstileSecret = this.configService.get<string>('TURNSTILE_SECRET_KEY');

    if (!turnstileSecret) {
      return;
    }

    if (!captchaToken) {
      throw new ForbiddenException('Completa el captcha antes de registrarte');
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: captchaToken,
          ...(clientIp ? { remoteip: clientIp } : {}),
        }),
      },
    );

    if (!response.ok) {
      throw new ForbiddenException('No se pudo validar el captcha');
    }

    const result = (await response.json()) as {
      success?: boolean;
    };

    if (!result.success) {
      throw new ForbiddenException('Captcha invalido o expirado');
    }
  }
}
