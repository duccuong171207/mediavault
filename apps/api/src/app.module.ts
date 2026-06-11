import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { validateEnv } from './config/env.validation';
import { dataSourceOptions } from './config/data-source';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MediaModule } from './media/media.module';
import { AlbumsModule } from './albums/albums.module';
import { SearchModule } from './search/search.module';
import { CategoriesModule } from './categories/categories.module';
import { InteractionsModule } from './interactions/interactions.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['../../.env', '.env'],
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    CommonModule,
    AuthModule,
    UsersModule,
    MediaModule,
    AlbumsModule,
    SearchModule,
    CategoriesModule,
    InteractionsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
