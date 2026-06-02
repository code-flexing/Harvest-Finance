import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Deposit } from '../database/entities/deposit.entity';
import { User } from '../database/entities/user.entity';
import { Vault } from '../database/entities/vault.entity';
import { SolanaYieldAdapter } from './adapters/solana-yield.adapter';
import { StellarYieldAdapter } from './adapters/stellar-yield.adapter';
import { CHAIN_ADAPTERS } from './interfaces/chain-adapter.interface';
import { MultiChainController } from './multi-chain.controller';
import { MultiChainService } from './multi-chain.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Deposit, Vault, User]),
    AuthModule,
  ],
  controllers: [MultiChainController],
  providers: [
    StellarYieldAdapter,
    SolanaYieldAdapter,
    {
      provide: CHAIN_ADAPTERS,
      useFactory: (
        stellar: StellarYieldAdapter,
        solana: SolanaYieldAdapter,
      ) => [stellar, solana],
      inject: [StellarYieldAdapter, SolanaYieldAdapter],
    },
    MultiChainService,
  ],
  exports: [MultiChainService],
})
export class MultiChainModule {}
