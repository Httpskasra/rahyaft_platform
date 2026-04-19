// //redis.service.ts
// import { Injectable, OnModuleDestroy } from '@nestjs/common';
// import Redis from 'ioredis';

// @Injectable()
// export class RedisService implements OnModuleDestroy {
//   private client: Redis;

//   constructor() {
//     const url = process.env.REDIS_URL || 'redis://localhost:6379';
//     this.client = new Redis(url, { maxRetriesPerRequest: 3 });
//   }

//   get redis() {
//     return this.client;
//   }
//   async get(key: string): Promise<string | null> {
//     return this.client.get(key);
//   }

//   async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
//     if (ttlSeconds) {
//       await this.client.set(key, value, 'EX', ttlSeconds);
//     } else {
//       await this.client.set(key, value);
//     }
//   }
//   async onModuleDestroy() {
//     await this.client.quit();
//   }
// }
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST') ?? 'localhost',
      port: this.config.get<number>('REDIS_PORT') ?? 6379,
      password: this.config.get<string>('REDIS_PASSWORD') ?? undefined,
      lazyConnect: true,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** @param ttl - seconds */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Atomic increment. Sets TTL only on the FIRST increment (key didn't exist).
   * Used for rate limiting and attempt counting.
   * @returns new value after increment
   */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1) {
      // First increment — set expiry
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }

  /** Invalidate all keys matching a pattern — e.g. "allowed_depts:userId:*" */
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) await this.client.del(...keys);
  }
}
