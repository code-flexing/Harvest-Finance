import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { Deposit } from '../../database/entities/deposit.entity';
import { Withdrawal } from '../../database/entities/withdrawal.entity';
import { PortfolioModule } from '../../portfolio/portfolio.module';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Deposit, Withdrawal]),
    PortfolioModule,
  ],
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
