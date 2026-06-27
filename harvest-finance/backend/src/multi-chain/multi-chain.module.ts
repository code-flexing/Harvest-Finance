import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Deposit } from '../database/entities/deposit.entity';
import { User } from '../database/entities/user.entity';
import { Vault } from '../database/entities/vault.entity';
import { EthereumYieldAdapter } from './adapters/ethereum-yield.adapter';
import { PolygonYieldAdapter } from './adapters/polygon-yield.adapter';
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
    PolygonYieldAdapter,
    EthereumYieldAdapter,
    {
      provide: CHAIN_ADAPTERS,
      useFactory: (
        stellar: StellarYieldAdapter,
        solana: SolanaYieldAdapter,
        polygon: PolygonYieldAdapter,
        ethereum: EthereumYieldAdapter,
      ) => [stellar, solana, polygon, ethereum],
      inject: [
        StellarYieldAdapter,
        SolanaYieldAdapter,
        PolygonYieldAdapter,
        EthereumYieldAdapter,
      ],
    },
    MultiChainService,
  ],
  exports: [MultiChainService],
})
export class MultiChainModule {}
