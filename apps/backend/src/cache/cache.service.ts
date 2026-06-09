import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'net';

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly memoryCache = new Map<string, MemoryEntry>();
  private redisWarningShown = false;

  constructor(private readonly configService: ConfigService) {}

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async setJson(key: string, value: unknown, ttlSeconds = 60) {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(keys: string[]) {
    if (keys.length === 0) {
      return;
    }

    try {
      await this.redisCommand(['DEL', ...keys]);
      for (const key of keys) {
        this.memoryCache.delete(key);
      }
    } catch {
      for (const key of keys) {
        this.memoryCache.delete(key);
      }
    }
  }

  async delByPattern(pattern: string) {
    try {
      const keys = await this.redisCommand(['KEYS', pattern]);

      if (Array.isArray(keys) && keys.length > 0) {
        await this.del(keys.map(String));
      }
    } catch {
      for (const key of this.memoryCache.keys()) {
        if (this.matchesPattern(key, pattern)) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  async increment(key: string, ttlSeconds: number) {
    try {
      const value = Number(await this.redisCommand(['INCR', key]));

      if (value === 1) {
        await this.redisCommand(['EXPIRE', key, String(ttlSeconds)]);
      }

      return value;
    } catch {
      const current = this.getFromMemory(key);
      const nextValue = current ? Number(current) + 1 : 1;

      this.memoryCache.set(key, {
        value: String(nextValue),
        expiresAt: Date.now() + ttlSeconds * 1000,
      });

      return nextValue;
    }
  }

  private async get(key: string) {
    try {
      const value = await this.redisCommand(['GET', key]);
      return typeof value === 'string' ? value : null;
    } catch {
      return this.getFromMemory(key);
    }
  }

  private async set(key: string, value: string, ttlSeconds: number) {
    try {
      await this.redisCommand(['SETEX', key, String(ttlSeconds), value]);
    } catch {
      this.memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  }

  private getFromMemory(key: string) {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value;
  }

  private async redisCommand(args: string[]) {
    const { hostname, port } = this.getRedisConnection();

    return new Promise<unknown>((resolve, reject) => {
      const socket = new Socket();
      const chunks: Buffer[] = [];
      let settled = false;

      const finish = (error?: Error, value?: unknown) => {
        if (settled) {
          return;
        }

        settled = true;
        socket.destroy();

        if (error) {
          this.warnRedisFallback();
          reject(error);
          return;
        }

        resolve(value);
      };

      socket.setTimeout(700);
      socket.once('error', (error) => finish(error));
      socket.once('timeout', () => finish(new Error('Redis command timed out')));
      socket.on('data', (chunk) => {
        chunks.push(chunk);

        try {
          finish(undefined, this.parseResp(Buffer.concat(chunks).toString()));
        } catch {
          return;
        }
      });

      socket.connect(port, hostname, () => {
        socket.write(this.encodeResp(args));
      });
    });
  }

  private getRedisConnection() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    const url = new URL(redisUrl);

    return {
      hostname: url.hostname,
      port: Number(url.port || 6379),
    };
  }

  private encodeResp(args: string[]) {
    return `*${args.length}\r\n${args
      .map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`)
      .join('')}`;
  }

  private parseResp(raw: string): unknown {
    const parseAt = (index: number): [unknown, number] => {
      const type = raw[index];
      const lineEnd = raw.indexOf('\r\n', index);
      const line = raw.slice(index + 1, lineEnd);
      const next = lineEnd + 2;

      if (type === '+') {
        return [line, next];
      }

      if (type === ':') {
        return [Number(line), next];
      }

      if (type === '$') {
        const length = Number(line);

        if (length === -1) {
          return [null, next];
        }

        return [raw.slice(next, next + length), next + length + 2];
      }

      if (type === '*') {
        const length = Number(line);
        const values = [];
        let cursor = next;

        for (let index = 0; index < length; index += 1) {
          const [value, nextCursor] = parseAt(cursor);
          values.push(value);
          cursor = nextCursor;
        }

        return [values, cursor];
      }

      if (type === '-') {
        throw new Error(line);
      }

      throw new Error('Unsupported Redis response');
    };

    return parseAt(0)[0];
  }

  private matchesPattern(key: string, pattern: string) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
    return expression.test(key);
  }

  private warnRedisFallback() {
    if (this.redisWarningShown) {
      return;
    }

    this.redisWarningShown = true;
    this.logger.warn('Redis unavailable; using in-memory cache fallback');
  }
}
