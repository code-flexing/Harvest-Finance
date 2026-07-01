import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EmailTemplatingService } from '../notifications/email/email-templating.service';
import { Vault } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { User } from '../database/entities/user.entity';
import { Reward } from '../database/entities/reward.entity';
import { Withdrawal } from '../database/entities/withdrawal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vault, Deposit, User, Reward, Withdrawal]),
  ],
  controllers: [AdminController],
  providers: [AdminService, EmailTemplatingService],
  exports: [AdminService, EmailTemplatingService],
})
export class AdminModule {}
