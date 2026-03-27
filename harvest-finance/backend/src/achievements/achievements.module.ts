import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from '../database/entities/achievement.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { Vault } from '../database/entities/vault.entity';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Achievement, Deposit, Vault]), AuthModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
