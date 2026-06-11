import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Single shared ioredis connection (cache, sessions, rate-limit, refresh tokens). */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis({
      host: config.getOrThrow('REDIS_HOST'),
      port: Number(config.get('REDIS_PORT', 6379)),
      maxRetriesPerRequest: null,
    });
  }

  async get<T = string>(key: string): Promise<T | null> {
    const v = await this.client.get(key);
    if (v === null) return null;
    try { return JSON.parse(v) as T; } catch { return v as unknown as T; }
  }

  async set(key: string, value: unknown, ttlSec?: number): Promise<void> {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSec) await this.client.set(key, str, 'EX', ttlSec);
    else await this.client.set(key, str);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
