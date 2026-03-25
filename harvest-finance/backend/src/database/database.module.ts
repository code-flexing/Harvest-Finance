import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Order, Transaction, Verification, CreditScore, Vault, VaultDeposit } from './entities';

/**
 * Database Module
 * 
 * Central module for all database entities.
 * Import this module to use TypeORM repositories.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Order,
      Transaction,
      Verification,
      CreditScore,
      Vault,
      VaultDeposit,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
