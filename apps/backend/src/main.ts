import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { randomBytes } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  const port = configService.get<number>('BACKEND_PORT', 3001);

  const corsOrigins = configService
    .get<string>('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  (app as any).set('trust proxy', 1);
  app.setGlobalPrefix(apiPrefix);
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    );
    next();
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const hasSessionCookie = request.headers.cookie?.includes('wcpp_session=');
    const csrfCookie = getCookie(request.headers.cookie, 'wcpp_csrf');
    const csrfHeader = request.headers['x-csrf-token'];

    if (!csrfCookie && hasSessionCookie) {
      response.cookie('wcpp_csrf', randomBytes(32).toString('base64url'), {
        httpOnly: false,
        sameSite: 'lax',
        secure: configService.get<string>('NODE_ENV') === 'production',
        path: '/',
      });
    }

    if (
      unsafeMethods.includes(request.method) &&
      hasSessionCookie &&
      (!csrfCookie || csrfHeader !== csrfCookie)
    ) {
      response.status(403).json({ message: 'CSRF token invalido' });
      return;
    }

    next();
  });
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
}

void bootstrap();

function getCookie(cookieHeader: string | undefined, name: string) {
  return cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')[1];
}
