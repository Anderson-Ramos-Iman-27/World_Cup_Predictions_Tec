import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() request: Request) {
    const clientIp = this.getClientIp(request);
    return this.authService.register(registerDto, clientIp);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.assertLoginIpLimit(this.getClientIp(request));
    const result = await this.authService.login(loginDto);
    this.setSessionCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.assertVerifyEmailIpLimit(this.getClientIp(request));
    const result = await this.authService.verifyEmail(verifyEmailDto);
    this.setSessionCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('resend-verification-code')
  async resendVerificationCode(
    @Body() resendVerificationCodeDto: ResendVerificationCodeDto,
    @Req() request: Request,
  ) {
    await this.authService.assertResendVerificationIpLimit(this.getClientIp(request));
    return this.authService.resendVerificationCode(resendVerificationCodeDto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto, @Req() request: Request) {
    await this.authService.assertForgotPasswordIpLimit(this.getClientIp(request));
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto, @Req() request: Request) {
    await this.authService.assertResetPasswordIpLimit(this.getClientIp(request));
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.getCookie(request, 'wcpp_refresh');
    const result = await this.authService.refreshSession(refreshToken ?? '');
    this.setSessionCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logoutSession(
      this.getCookie(request, 'wcpp_session'),
      this.getCookie(request, 'wcpp_refresh'),
    );

    response.clearCookie('wcpp_session', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.areAuthCookiesSecure(),
      path: '/',
    });
    response.clearCookie('wcpp_refresh', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.areAuthCookiesSecure(),
      path: '/api/auth/refresh',
    });
    response.clearCookie('wcpp_csrf', {
      httpOnly: false,
      sameSite: 'lax',
      secure: this.areAuthCookiesSecure(),
      path: '/',
    });

    return { message: 'Sesion cerrada correctamente.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  private setSessionCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const csrfToken = randomBytes(32).toString('base64url');

    response.cookie('wcpp_session', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.areAuthCookiesSecure(),
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    response.cookie('wcpp_refresh', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.areAuthCookiesSecure(),
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.cookie('wcpp_csrf', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: this.areAuthCookiesSecure(),
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private getCookie(request: Request, name: string) {
    return request.headers.cookie
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.split('=')[1];
  }

  private getClientIp(request: Request) {
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
    const ip = forwardedIp?.trim() || request.ip || request.socket.remoteAddress || 'unknown';

    return ip.replace(/^::ffff:/, '');
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private areAuthCookiesSecure() {
    const configuredValue = this.configService.get<string>('AUTH_COOKIE_SECURE');

    if (configuredValue === 'true') {
      return true;
    }

    if (configuredValue === 'false') {
      return false;
    }

    return this.isProduction();
  }
}
