import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AuthRateLimitService {
  constructor(private readonly cacheService: CacheService) {}

  async assertAllowed(key: string, limit: number, windowMs: number) {
    const ttlSeconds = Math.ceil(windowMs / 1000);
    const count = await this.cacheService.increment(`rate-limit:${key}`, ttlSeconds);

    if (count > limit) {
      throw new HttpException(
        `Demasiados intentos. Intenta nuevamente en ${ttlSeconds} segundos`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async assertAllowedForIp(action: string, ip: string, limit: number, windowMs: number) {
    const normalizedIp = this.normalizeIp(ip);

    await this.assertAllowed(`ip:${action}:${normalizedIp}`, limit, windowMs);
  }

  private normalizeIp(ip: string) {
    return ip.replace(/^::ffff:/, '').trim() || 'unknown';
  }
}
