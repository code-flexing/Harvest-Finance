import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { SorobanEvent } from '../database/entities/soroban-event.entity';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { SorobanController } from './soroban.controller';
import { SorobanIndexerService } from './soroban-indexer.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([SorobanEvent]),
    AuthModule,
    CommonModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          url: config.get('REDIS_URL', 'redis://localhost:6379'),
          ttl: parseInt(config.get('CACHE_TTL', '600'), 10),
        }),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SorobanController],
  providers: [SorobanIndexerService],
  exports: [SorobanIndexerService],
})
export class SorobanModule {}
