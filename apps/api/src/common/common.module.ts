import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage/storage.service';
import { RedisService } from './redis/redis.service';
import { SearchClient } from './search/search.client';

/** Shared singletons available app-wide without re-importing. */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [StorageService, RedisService, SearchClient],
  exports: [StorageService, RedisService, SearchClient],
})
export class CommonModule {}
