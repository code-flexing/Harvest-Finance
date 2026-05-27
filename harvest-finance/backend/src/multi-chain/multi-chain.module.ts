import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Deposit } from '../database/entities/deposit.entity';
import { Vault } from '../database/entities/vault.entity';
import { StellarYieldAdapter } from './adapters/stellar-yield.adapter';
import { CHAIN_ADAPTERS } from './interfaces/chain-adapter.interface';
import { MultiChainController } from './multi-chain.controller';
import { MultiChainService } from './multi-chain.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deposit, Vault]), AuthModule],
  controllers: [MultiChainController],
  providers: [
    StellarYieldAdapter,
    {
      provide: CHAIN_ADAPTERS,
      useFactory: (stellar: StellarYieldAdapter) => [stellar],
      inject: [StellarYieldAdapter],
    },
    MultiChainService,
  ],
  exports: [MultiChainService],
})
export class MultiChainModule {}
