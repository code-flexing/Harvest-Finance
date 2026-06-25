import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { User } from './entities/user.entity';
import { UserOAuthLink } from './entities/user-oauth-link.entity';
import { Order } from './entities/order.entity';
import { Transaction } from './entities/transaction.entity';
import { Verification } from './entities/verification.entity';
import { CreditScore } from './entities/credit-score.entity';
import { Deposit } from './entities/deposit.entity';
import { SorobanEvent } from './entities/soroban-event.entity';
import { Vault } from './entities/vault.entity';
import { VaultDeposit } from './entities/vault-deposit.entity';
import { CreateInitialSchema1700000000000 } from './migrations/1700000000000-CreateInitialSchema';
import { CreateSorobanEvents1700000000011 } from './migrations/1700000000011-CreateSorobanEvents';
import { AddSorobanEventQueryIndexes1700000000013 } from './migrations/1700000000013-AddSorobanEventQueryIndexes';

// Load environment variables explicitly
config();

const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * TypeORM Data Source Configuration
 *
 * This is the main data source for the application.
 * Used by TypeORM for database operations.
 *
 * For CLI commands (migrations, seeds), use this file directly.
 * For NestJS applications, use AppModule configuration.
 */
const options: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'harvest_finance',
  entities: [
    User,
    UserOAuthLink,
    Order,
    Transaction,
    Verification,
    CreditScore,
    Deposit,
    SorobanEvent,
    Vault,
    VaultDeposit,
  ],
  // Path fallback to pick up both class references and newly generated CLI files
  migrations: [
    CreateInitialSchema1700000000000,
    CreateSorobanEvents1700000000011,
    AddSorobanEventQueryIndexes1700000000013,
    path.join(__dirname, '/migrations/*.{ts,js}'),
  ],
  // CRITICAL SAFETY: synchronize is strictly disabled outside of explicit integration testing pipelines
  synchronize: isTestEnv,
  migrationsRun: false, // Explicit control handled via automated migration lifecycle deployment hooks
  logging: process.env.NODE_ENV === 'development',
};

/**
 * AppDataSource - Singleton data source instance
 *
 * Export this to use in CLI commands, migrations, and seeds.
 */
export const AppDataSource = new DataSource(options);

/**
 * Get database configuration
 */
export function getDatabaseConfig(): DataSourceOptions {
  return options;
}