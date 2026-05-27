import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YieldAnalytics } from '../database/entities/yield-analytics.entity';
import { SorobanEvent } from '../database/entities/soroban-event.entity';
import { AuthModule } from '../auth/auth.module';
import { YieldAnalyticsController } from './yield-analytics.controller';
import { YieldAnalyticsService } from './yield-analytics.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([YieldAnalytics, SorobanEvent]),
    AuthModule,
  ],
  controllers: [YieldAnalyticsController],
  providers: [YieldAnalyticsService],
  exports: [YieldAnalyticsService],
})
export class YieldAnalyticsModule {}
