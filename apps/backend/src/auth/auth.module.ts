import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '../cache/cache.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    CacheModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>(
          'JWT_SECRET',
          'change_me_in_real_environment',
        );

        if (
          configService.get<string>('NODE_ENV') === 'production' &&
          jwtSecret === 'change_me_in_real_environment'
        ) {
          throw new Error('JWT_SECRET must be configured for production');
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRateLimitService],
})
export class AuthModule {}
