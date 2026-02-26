import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Transaction } from '../entities/transaction.entity';
import { Verification } from '../entities/verification.entity';
import { CreditScore } from '../entities/credit-score.entity';

/**
 * Seed Module
 * 
 * Provides seed functionality for populating the database
 * with test data during development and testing.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Order,
      Transaction,
      Verification,
      CreditScore,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
