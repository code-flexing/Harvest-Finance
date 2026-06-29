import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustodialWallet } from './entities/custodial-wallet.entity';
import { CustodialWalletService } from './custodial-wallet.service';
import { WalletsController } from './wallets.controller';
import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustodialWallet]),
    AuthModule,
    LoggerModule,
  ],
  controllers: [WalletsController],
  providers: [CustodialWalletService],
  exports: [CustodialWalletService],
})
export class WalletsModule {}
