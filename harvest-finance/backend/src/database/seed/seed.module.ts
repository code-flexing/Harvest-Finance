import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Transaction } from '../entities/transaction.entity';
import { Verification } from '../entities/verification.entity';
import { CreditScore } from '../entities/credit-score.entity';
import { Vault } from '../entities/vault.entity';
import { Deposit } from '../entities/deposit.entity';
import { VaultDeposit } from '../entities/vault-deposit.entity';
import { Withdrawal } from '../entities/withdrawal.entity';

/**
 * Seed Module
 *
 * Provides seed functionality for populating the database
 * with test data during development and testing.
 *
 * Seed data covers:
 *  - All UserRole values (FARMER, BUYER, INSPECTOR, ADMIN)
 *  - All VaultStatus values (ACTIVE, INACTIVE, FROZEN, FULL_CAPACITY)
 *  - All DepositStatus values (CONFIRMED, PENDING, FAILED, REFUNDED)
 *  - All WithdrawalStatus values (CONFIRMED, PENDING, FAILED)
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
      Deposit,
      VaultDeposit,
      Withdrawal,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
