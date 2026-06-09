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
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setSessionCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyEmail(verifyEmailDto);
    this.setSessionCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('resend-verification-code')
  resendVerificationCode(
    @Body() resendVerificationCodeDto: ResendVerificationCodeDto,
  ) {
    return this.authService.resendVerificationCode(resendVerificationCodeDto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
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
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('wcpp_session', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction(),
      path: '/',
    });
    response.clearCookie('wcpp_refresh', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction(),
      path: '/api/auth/refresh',
    });
    response.clearCookie('wcpp_csrf', {
      httpOnly: false,
      sameSite: 'lax',
      secure: this.isProduction(),
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
      secure: this.isProduction(),
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    response.cookie('wcpp_refresh', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction(),
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.cookie('wcpp_csrf', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: this.isProduction(),
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

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }
}
